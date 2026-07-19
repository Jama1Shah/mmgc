import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import Ward from '@/models/Ward';
import LabTest from '@/models/LabTest';
import mongoose from 'mongoose';
// Importing the security schemas
import { PostInvoiceSchema, PutInvoiceSchema, DeleteInvoiceSchema } from '@/schemas/billing';

// Force Next.js to execute this route dynamically on every request to prevent stale build-time caching
export const dynamic = 'force-dynamic';

// Inline safe schema evaluation for the Prescription collection to prevent Next.js context compilation errors
const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  labPrescription: { type: String, default: null }
}));

// Core Server-Side Calculation Function
async function calculateBackendInvoice(appointmentId) {
  const appt = await Appointment.findById(appointmentId);
  if (!appt) return null;

  const labTests = await LabTest.find({});
  const wards = await Ward.find({});

  let labLineItems = [];
  let total = 0;

  // Fetch the corresponding doctor's consultation fee
  let doctorFee = 2000; // Default doctor fee fallback
  try {
    let doctorUser = null;
    if (appt.doctorId) {
      doctorUser = await User.findById(appt.doctorId);
    } else if (appt.doctorName) {
      doctorUser = await User.findOne({ role: 'Doctor', name: appt.doctorName });
    }
    
    if (doctorUser && doctorUser.fee !== undefined) {
      doctorFee = Number(doctorUser.fee);
    }
  } catch (err) {
    console.error("Error calculating doctor consultation fee:", err);
  }
  total += doctorFee;

  // Gather all test parameters additively across all pre-admission & post-admission documentation channels
  let rawTestNames = [];
  if (appt.labTestName) {
    rawTestNames.push(...appt.labTestName.split(',').map(s => s.trim()));
  }
  if (appt.labReason) {
    rawTestNames.push(...appt.labReason.split(',').map(s => s.trim()));
  }
  if (appt.labPrescription) {
    rawTestNames.push(...appt.labPrescription.split(',').map(s => s.trim()));
  }
  if (appt.reason && appt.reason.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i)) {
    const labsMatch = appt.reason.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i);
    if (labsMatch && labsMatch[1].trim()) {
      rawTestNames.push(...labsMatch[1].trim().split(',').map(s => s.trim().replace(/[.,\s]+$/, "")));
    }
  }
  if (Array.isArray(appt.labTests)) {
    rawTestNames.push(...appt.labTests.map(t => t.name || t.testName || t.description || (typeof t === 'string' ? t : '')));
  }

  // Fetch from all prescriptions associated with this appointment to capture tests ordered during/after admission
  try {
    let prescriptionList = [];
    try {
      prescriptionList = await Prescription.find({
        $or: [{ appointmentId: appt._id }, { appointmentId: appt._id.toString() }]
      });
    } catch (e) {
      console.warn("Mongoose Prescription model query failed, falling back to direct DB collection query:", e);
    }

    // Direct Database Driver query fallback to prevent multi-route Next.js Mongoose compilation/cache erasure side effects
    if (mongoose.connection.db) {
      const directDocs = await mongoose.connection.db.collection('prescriptions').find({
        $or: [
          { appointmentId: appt._id },
          { appointmentId: appt._id.toString() },
          { appointmentId: appointmentId ? appointmentId.toString() : '' }
        ]
      }).toArray();
      
      directDocs.forEach(doc => {
        if (!prescriptionList.some(p => p._id?.toString() === doc._id?.toString())) {
          prescriptionList.push(doc);
        }
      });
    }

    prescriptionList.forEach(p => {
      if (p.labPrescription) {
        rawTestNames.push(...p.labPrescription.split(',').map(s => s.trim()));
      }
    });
  } catch (err) {
    console.error("Error fetching lab tests from prescriptions:", err);
  }

  // Clean placeholders and safely deduplicate case-insensitively
  let testNames = [];
  let seenTests = new Set();
  rawTestNames.forEach(name => {
    if (!name) return;
    const cleaned = name.trim();
    const lower = cleaned.toLowerCase();
    if (lower === 'none' || lower === 'no active lab orders listed.') return;
    if (!seenTests.has(lower)) {
      seenTests.add(lower);
      testNames.push(cleaned);
    }
  });

  testNames.forEach(name => {
    if (!name) return;
    const matchedTest = labTests.find(t =>
      (t.name && t.name.toLowerCase() === name.toLowerCase()) ||
      (t.description && t.description.toLowerCase() === name.toLowerCase()) ||
      name.toLowerCase().includes(t.name?.toLowerCase() || "___") ||
      name.toLowerCase().includes(t.description?.toLowerCase() || "___")
    );
    const baseCost = matchedTest ? (matchedTest.baseCost || matchedTest.cost) : 1000;
    const testCost = Math.round(baseCost);
    total += testCost;
    labLineItems.push({
      description: `Laboratory Diagnostics - ${matchedTest ? (matchedTest.name || matchedTest.description) : name}`,
      cost: testCost
    });
  });

  let admissionFee = 0;
  const hasAdmissionDays = Number(appt.admissionDetails?.admissionDays || appt.admissionDays) > 0;
  const requiresAdmission = appt.status === 'Admitted' || appt.admissionRequired || hasAdmissionDays;
  if (requiresAdmission) {
    const activeDays = Number(appt.admissionDetails?.admissionDays || appt.admissionDays) || 1;
    const wardName = appt.admissionDetails?.wardName || appt.wardName;
    const matchedWard = wards.find(w => w.name?.toLowerCase() === wardName?.toLowerCase());
    const wAdmissionFee = matchedWard ? (matchedWard.admissionFee || 0) : 0;
    const wOvernightFee = matchedWard ? (matchedWard.overnightFee || 0) : 2500;
    
    admissionFee = wAdmissionFee + (wOvernightFee * activeDays);
    total += admissionFee;
  }

  const invoiceItems = [
    {
      description: `Consultation Fee - ${appt.doctorName || 'Doctor'}`,
      cost: doctorFee
    },
    ...labLineItems,
    ...(admissionFee > 0 ? [{
      description: `Ward Admission Charges (${Number(appt.admissionDetails?.admissionDays || appt.admissionDays) || 1} Day(s))`,
      cost: admissionFee
    }] : [])
  ];

  return {
    totalAmount: total,
    items: invoiceItems
  };
}

// 1. GET: Fetch all invoices
export async function GET() {
  try {
    await mmgc_db();
    const invoices = await Invoice.find({}).sort({ date: -1 });
    
    // Dynamically recalculate invoices on request to ensure all post-admission tests are updated instantly on the dashboard
    const updatedInvoices = await Promise.all(invoices.map(async (invoice) => {
      if (invoice.appointmentId) {
        const calculations = await calculateBackendInvoice(invoice.appointmentId);
        if (calculations) {
          invoice.totalAmount = calculations.totalAmount;
          invoice.items = calculations.items;
          
          // Keep the cached collection metrics synchronized behind the scenes
          await Invoice.findByIdAndUpdate(invoice._id, {
            $set: { totalAmount: calculations.totalAmount, items: calculations.items }
          });
        }
      }
      return invoice;
    }));

    return NextResponse.json(updatedInvoices);
  } catch (error) {
    console.error("Billing GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// 2. POST: Create a new invoice
export async function POST(req) {
  try {
    await mmgc_db();
    const rawBody = await req.json();

    // Secure payload structure using Zod validation
    const validation = PostInvoiceSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation Error", details: validation.error.format() }, { status: 400 });
    }
    const body = validation.data;

    if (body.appointmentId) {
      const calculations = await calculateBackendInvoice(body.appointmentId);
      if (calculations) {
        body.totalAmount = calculations.totalAmount;
        body.items = calculations.items;
      }
    }

    let newInvoice;
    if (body.appointmentId) {
      newInvoice = await Invoice.findOneAndUpdate(
        { appointmentId: body.appointmentId },
        { $set: body },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      newInvoice = await Invoice.create(body);
    }

    if (body.status === 'Paid' && body.patientId) {
      await User.findByIdAndUpdate(body.patientId, { status: 'Inactive' });
    }

    // Synchronize the base database appointment state automatically
    if (newInvoice && body.appointmentId && body.status) {
      const apptStatus = body.status === 'Paid' ? 'Completed' : 'Bill Pending';
      const apptBillPaid = body.status === 'Paid';
      await Appointment.findByIdAndUpdate(body.appointmentId, {
        $set: { status: apptStatus, billPaid: apptBillPaid }
      });
    }

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error("Billing POST Error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

// 3. PUT: Update an existing invoice
export async function PUT(req) {
  try {
    await mmgc_db();
    const rawBody = await req.json();

    // Secure payload structure using Zod validation
    const validation = PutInvoiceSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation Error", details: validation.error.format() }, { status: 400 });
    }
    const body = validation.data;
    const { id, ...updateData } = body;

    let appointmentId = updateData.appointmentId;
    if (!appointmentId && id) {
      const inv = await Invoice.findById(id);
      if (inv) appointmentId = inv.appointmentId;
    }

    if (appointmentId) {
      const calculations = await calculateBackendInvoice(appointmentId);
      if (calculations) {
        updateData.totalAmount = calculations.totalAmount;
        updateData.items = calculations.items;
      }
    }
    
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true }
    );

    if (updatedInvoice && updateData.status === 'Paid' && updatedInvoice.patientId) {
      await User.findByIdAndUpdate(updatedInvoice.patientId, { status: 'Inactive' });
    }

    // Synchronize the base database appointment state automatically
    if (updatedInvoice && appointmentId && updateData.status) {
      const apptStatus = updateData.status === 'Paid' ? 'Completed' : 'Bill Pending';
      const apptBillPaid = updateData.status === 'Paid';
      await Appointment.findByIdAndUpdate(appointmentId, {
        $set: { status: apptStatus, billPaid: apptBillPaid }
      });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error("Billing PUT Error:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

// 4. DELETE: Remove an existing invoice record
export async function DELETE(req) {
  try {
    await mmgc_db();
    const rawBody = await req.json();

    // Secure payload structure using Zod validation
    const validation = DeleteInvoiceSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation Error", details: validation.error.format() }, { status: 400 });
    }
    const { id } = validation.data;

    await Invoice.findByIdAndDelete(id);
    return NextResponse.json({ message: "Invoice successfully deleted from database record." });
  } catch (error) {
    console.error("Billing DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}