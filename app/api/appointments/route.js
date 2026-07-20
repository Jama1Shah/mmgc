import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import Appointment from '@/models/Appointment';
import mongoose from 'mongoose';
import {
  getMainAppointmentsQuerySchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  patchAppointmentSchema,
  deleteAppointmentQuerySchema
} from '@/schemas/appointment.schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ==========================================
// HELPER: Convert a raw stored data: URI (or the structured
// [{testName, urls}] array of them) into the same short,
// browser-safe proxy link the lab-orders route resolves and
// streams back with proper headers. Applied everywhere this
// route hands labFileUrl to the frontend — this route feeds
// the patient panel, doctor panel, and (per the comment below)
// lab analytics / prescription / patient summary pages.
// ==========================================
function buildFileProxyUrl(appointmentId, testName, idx) {
  if (testName !== undefined && idx !== undefined) {
    return `/api/appointments/lab-orders?fileId=${appointmentId}&test=${encodeURIComponent(testName || '')}&idx=${idx}`;
  }
  return `/api/appointments/lab-orders?fileId=${appointmentId}`;
}

function transformFileUrlsForResponse(labFileUrlRaw, appointmentId) {
  if (!labFileUrlRaw || !appointmentId) return labFileUrlRaw;

  // Structured multi-test file array: [{ testName, urls: [...] }]
  if (labFileUrlRaw.startsWith('[')) {
    try {
      const parsed = JSON.parse(labFileUrlRaw);
      if (Array.isArray(parsed)) {
        const transformed = parsed.map(entry => {
          if (!entry || !Array.isArray(entry.urls)) return entry;
          const urls = entry.urls.map((u, idx) => {
            // Only proxy genuine embedded data URIs; leave any legacy
            // '/uploads/...' paths or already-proxied links untouched.
            if (typeof u === 'string' && u.startsWith('data:')) {
              return buildFileProxyUrl(appointmentId, entry.testName, idx);
            }
            return u;
          });
          return { ...entry, urls };
        });
        return JSON.stringify(transformed);
      }
    } catch (e) {
      return labFileUrlRaw;
    }
    return labFileUrlRaw;
  }

  // Single embedded data URI
  if (labFileUrlRaw.startsWith('data:')) {
    return buildFileProxyUrl(appointmentId);
  }

  // Legacy plain path (pre-existing records) — leave untouched
  return labFileUrlRaw;
}

// Inline initialization of the Prescription model to check relationship fields across collections safely
const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  admissionRequired: { type: Boolean, default: false },
  doctorName: { type: String }
}));

// ==========================================
// 1. FETCH APPOINTMENTS (GET)
// ==========================================
export async function GET(req) {
  try {
    await mmgc_db();
    const { searchParams } = new URL(req.url);
    
    // Validate request query parameters with Zod
    const rawParams = Object.fromEntries(searchParams.entries());
    const validation = getMainAppointmentsQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }

    const { id, doctorName, patientEmail, includeCompletedLabs, doctorId } = validation.data;

    // 🛠️ CASE A: DIRECT ID LOOKUP (USED BY LAB ANALYTICS, PRESCRIPTION & PATIENT SUMMARY)
    if (id) {
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return NextResponse.json({ error: "No appointment found matching the provided ID" }, { status: 404 });
      }
      
      const apptObj = appointment.toObject ? appointment.toObject() : appointment;
      const apptDateTime = new Date(`${apptObj.date} ${apptObj.time}`);
      if (!isNaN(apptDateTime.getTime())) {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        if (apptDateTime < twoHoursAgo && ['Scheduled', 'Pending', 'Accepted', 'Accepted for Checkup'].includes(apptObj.status)) {
          apptObj.status = 'Rescheduled';
          await Appointment.findByIdAndUpdate(apptObj._id, { $set: { status: 'Rescheduled' } });
        }
      }

      // ✅ FIX: Convert any raw embedded data: URI into a short, browser-safe
      // proxy link — this branch feeds lab analytics, prescription, and
      // patient summary pages directly.
      if (apptObj.labFileUrl) {
        apptObj.labFileUrl = transformFileUrlsForResponse(apptObj.labFileUrl, apptObj._id.toString());
      }

      return NextResponse.json(apptObj, { status: 200 });
    }

    // ========================================================
    // REVISED CASE B: PATIENT PANEL CONTEXT (With File Links & Lab Details)
    // ========================================================
    if (patientEmail) {
      const exclusionArray = ['Archived', 'Lab Test Ordered', 'Processing Lab Test'];
      
      if (!includeCompletedLabs) {
        exclusionArray.push('Lab Completed');
      }

      const appointments = await Appointment.find({ 
        patientEmail,
        status: { $nin: exclusionArray } 
      }).sort({ date: -1, time: -1 });
      
      // ✨ MAP THE APPOINTMENTS FOR PATIENTS SO THEY GET THE LINKS/FILES
      const mappedPatientAppointments = await Promise.all(appointments.map(async appt => {
        const apptObj = appt.toObject ? appt.toObject() : appt;
        
        // Ensure standard properties exist so frontend doesn't crash
        apptObj.analyticsLink = null;
        apptObj.prescriptionLink = null;

        // Guarantee fallback values for the view summary fields to avoid client undefined/null errors
        apptObj.labReason = apptObj.labReason || "";
        apptObj.labNotes = apptObj.labNotes || "";
        apptObj.labFileUrl = apptObj.labFileUrl || null;

        // ✅ FIX: Convert any raw embedded data: URI into a short, browser-safe proxy link
        if (apptObj.labFileUrl) {
          apptObj.labFileUrl = transformFileUrlsForResponse(apptObj.labFileUrl, apptObj._id.toString());
        }

        if (apptObj.status === 'Lab Completed') {
          apptObj.analyticsLink = `/lab-analytics?id=${apptObj._id.toString()}`;
          apptObj.prescriptionLink = `/prescription?id=${apptObj._id.toString()}`;
        }

        // ⏱️ AUTO-RESCHEDULE LOGIC: Check if current time has passed the appointment by 2 hours
        const apptDateTime = new Date(`${apptObj.date} ${apptObj.time}`);
        if (!isNaN(apptDateTime.getTime())) {
          const now = new Date();
          const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          if (apptDateTime < twoHoursAgo && ['Scheduled', 'Pending', 'Accepted', 'Accepted for Checkup'].includes(apptObj.status)) {
            apptObj.status = 'Rescheduled';
            await Appointment.findByIdAndUpdate(apptObj._id, { $set: { status: 'Rescheduled' } });
          }
        }

        return apptObj;
      }));

      return NextResponse.json(mappedPatientAppointments, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // ========================================================
    // CASE C: DOCTOR PANEL CONTEXT / GENERAL CONTEXT (E.G. BILLING)
    // ========================================================
    const appointmentQuery = { 
      deletedByDoctor: { $ne: true },
      status: { 
        $in: [
          'Scheduled', 'Pending', 'Accepted for Checkup', 'Accepted', 
          'In-Progress', 'Completed', 'Bill Pending', 'Cancelled', 'Rejected', 
          'Rescheduled', 'Waiting...', 'Lab Test Ordered', 
          'Processing Lab Test', 'Lab Completed', 'Admitted'
        ] 
      } 
    };

    if (doctorName) {
      appointmentQuery.doctorName = doctorName;
    }

    const appointments = await Appointment.find(appointmentQuery).sort({ date: 1, time: 1 });

    // Fetch all prescriptions belonging to this doctor that require admission
    const prescriptionQuery = { admissionRequired: true };
    if (doctorName) {
      prescriptionQuery.doctorName = doctorName;
    }
    const admissionPrescriptions = await Prescription.find(prescriptionQuery);
    const admittedAppointmentIds = admissionPrescriptions.map(p => p.appointmentId ? p.appointmentId.toString() : '');

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const thresholdDate = oneHourAgo.toISOString().split('T')[0]; 
    const thresholdTime = oneHourAgo.toTimeString().split(' ')[0].substring(0, 5);

    // ✅ FIX: Do NOT exclude admitted patients if the request comes from the Admitted Dashboard page or general contexts like billing (where doctorName is not specified)
    const filteredAppointments = (doctorId || !doctorName) 
      ? appointments 
      : appointments.filter(appt => !admittedAppointmentIds.includes(appt._id.toString()));

    const mappedAppointments = await Promise.all(filteredAppointments.map(async appt => {
      const apptObj = appt.toObject ? appt.toObject() : appt;
      
      // 🏥 ADMISSION DAYS AUTO-INCREMENT LOGIC (Midnight Rollover Cycle Aligned with Frontend)
      if (
        apptObj.admissionRequired && 
        apptObj.admissionDetails?.admittedAt && 
        !['Completed', 'Archived', 'Cancelled', 'Rejected'].includes(apptObj.status)
      ) {
        const admittedAt = new Date(apptObj.admissionDetails.admittedAt);
        admittedAt.setHours(0, 0, 0, 0);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const daysPassed = Math.max(0, Math.floor((currentDate - admittedAt) / (1000 * 60 * 60 * 24)));
        
        const currentDbDays = apptObj.admissionDays ?? apptObj.admissionDetails?.admissionDays ?? 0;
        if (daysPassed > currentDbDays) {
           apptObj.admissionDays = daysPassed;
           if (!apptObj.admissionDetails) apptObj.admissionDetails = {};
           apptObj.admissionDetails.admissionDays = daysPassed;
           
           // Background database sync
           await Appointment.findByIdAndUpdate(apptObj._id, {
              $set: { 
                 admissionDays: daysPassed,
                 'admissionDetails.admissionDays': daysPassed
              }
           });
        }
      }

      // ⏱️ AUTO-RESCHEDULE LOGIC: Check if current time has passed the appointment by 2 hours
      const apptDateTime = new Date(`${apptObj.date} ${apptObj.time}`);
      if (!isNaN(apptDateTime.getTime())) {
        const currentNow = new Date();
        const twoHoursAgo = new Date(currentNow.getTime() - 2 * 60 * 60 * 1000);
        if (apptDateTime < twoHoursAgo && ['Scheduled', 'Pending', 'Accepted', 'Accepted for Checkup'].includes(apptObj.status)) {
          apptObj.status = 'Rescheduled';
          await Appointment.findByIdAndUpdate(apptObj._id, { $set: { status: 'Rescheduled' } });
        }
      }

      const isPastThreshold = 
        apptObj.date < thresholdDate || 
        (apptObj.date === thresholdDate && apptObj.time < thresholdTime);

      const isUnfulfilledStatus = ['Scheduled', 'Pending', 'Accepted'].includes(apptObj.status);

      // Inject navigation tracking fields explicitly
      apptObj.analyticsLink = null;
      apptObj.prescriptionLink = null;

      // ✅ FIX: Convert any raw embedded data: URI into a short, browser-safe proxy link
      if (apptObj.labFileUrl) {
        apptObj.labFileUrl = transformFileUrlsForResponse(apptObj.labFileUrl, apptObj._id.toString());
      }

      if (apptObj.status === 'Lab Completed') {
        apptObj.analyticsLink = `/lab-analytics?id=${apptObj._id.toString()}`;
        apptObj.prescriptionLink = `/prescription?id=${apptObj._id.toString()}`;
      }

      if (isPastThreshold && isUnfulfilledStatus) {
        return { ...apptObj, status: 'Waiting...' };
      }

      if (apptObj.status === 'Rescheduled') {
        return { ...apptObj, status: 'Waiting...' };
      }

      return apptObj;
    }));

    return NextResponse.json(mappedAppointments);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 2. CREATE APPOINTMENT (POST)
// ==========================================
export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Validate request payload body with Zod
    const validation = createAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }
    
    // Prevent passed time bookings on backend creation
    const now = new Date();
    const requestedDateTime = new Date(`${body.date} ${body.time}`);
    if (requestedDateTime < now) {
      return NextResponse.json({ success: false, message: "Cannot book an appointment for a time slot that has already passed" }, { status: 400 });
    }

    const exists = await Appointment.findOne({ 
      doctorName: body.doctorName, 
      date: body.date, 
      time: body.time,
      status: { $nin: ['Cancelled', 'Archived', 'Rejected', 'Prescribed'] } 
    });

    if (exists) {
      return NextResponse.json({ success: false, message: "Slot taken" }, { status: 409 });
    }

    const recordsToCreate = {
      ...body,
      labStatus: body.labStatus || 'None'
    };

    const newAppt = await Appointment.create(recordsToCreate);
    return NextResponse.json({ success: true, data: newAppt }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 3. UPDATE APPOINTMENT STATUS & DETAILS (PUT)
// ==========================================
export async function PUT(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Validate payload adjustments via Zod
    const validation = updateAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }
    
    const appointmentId = body.id || body._id;
    const { status, date, time, reason, labReason, labNotes, labFileUrl, billPaid } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "Appointment ID parameter is required" }, { status: 400 });
    }

    const currentAppt = await Appointment.findById(appointmentId);
    if (!currentAppt) {
      return NextResponse.json({ error: "No matching appointment record found to mutate" }, { status: 404 });
    }

    if ((time && time !== currentAppt.time) || (date && date !== currentAppt.date)) {
      const targetDate = date || currentAppt.date;
      const targetTime = time || currentAppt.time;

      // Prevent rescheduling mutations to a passed date/time
      const now = new Date();
      const requestedDateTime = new Date(`${targetDate} ${targetTime}`);
      if (requestedDateTime < now) {
        return NextResponse.json({ success: false, message: "Cannot reschedule an appointment to a time slot that has already passed" }, { status: 400 });
      }

      const slotTaken = await Appointment.findOne({
        _id: { $ne: appointmentId }, 
        doctorName: currentAppt.doctorName,
        date: targetDate,
        time: targetTime,
        status: { $nin: ['Cancelled', 'Archived', 'Rejected', 'Prescribed'] }
      });

      if (slotTaken) {
        return NextResponse.json({ success: false, message: "The newly requested slot is already taken" }, { status: 409 });
      }
    }

    const updateFields = {};
    if (status) updateFields.status = status;
    if (billPaid !== undefined) updateFields.billPaid = billPaid;
    if (date) updateFields.date = date;
    if (time) updateFields.time = time;
    if (reason) updateFields.reason = reason;

    // Intercept Completed status transformations if the bill has not been paid
    if (updateFields.status === 'Completed' && !(billPaid === true || currentAppt.billPaid === true)) {
      updateFields.status = 'Bill Pending';
    }

    // Automatically advance from Bill Pending to Completed when bill paid matches true
    const finalStatus = updateFields.status || currentAppt.status;
    const finalBillPaid = billPaid !== undefined ? billPaid : currentAppt.billPaid;
    if (finalStatus === 'Bill Pending' && finalBillPaid === true) {
      updateFields.status = 'Completed';
    }
    
    // ✨ Extract and write new lab values to the record updates
    if (labReason !== undefined) updateFields.labReason = labReason;
    if (labNotes !== undefined) updateFields.labNotes = labNotes;
    if (labFileUrl !== undefined) updateFields.labFileUrl = labFileUrl;

    if (updateFields.status === 'Prescribed') {
      updateFields.deletedByDoctor = true; 
    } else if (['Lab Test Ordered', 'Processing Lab Test', 'Lab Completed'].includes(updateFields.status)) {
      updateFields.deletedByDoctor = false; 
      if (updateFields.status === 'Lab Test Ordered') updateFields.labStatus = 'Pending';
      if (updateFields.status === 'Lab Completed') updateFields.labStatus = 'Completed';
    } else if (updateFields.status) {
      updateFields.deletedByDoctor = false;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    const updatedAppointmentObj = updatedAppointment.toObject();
    if (updatedAppointmentObj.labFileUrl) {
      updatedAppointmentObj.labFileUrl = transformFileUrlsForResponse(updatedAppointmentObj.labFileUrl, updatedAppointmentObj._id.toString());
    }

    return NextResponse.json({ success: true, data: updatedAppointmentObj });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 4. PARTIAL STATE MODIFICATION (PATCH)
// ==========================================
export async function PATCH(req) {
  try {
    await mmgc_db();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    // Validate dynamic modification body via Zod
    const validation = patchAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }

    const appointmentId = id || body.id || body._id;

    if (!appointmentId) {
      return NextResponse.json({ error: "Appointment ID parameter is required" }, { status: 400 });
    }

    const currentAppt = await Appointment.findById(appointmentId);
    if (!currentAppt) {
      return NextResponse.json({ error: "No matching appointment record found to patch" }, { status: 404 });
    }

    // Process identical billing intercept state validations over targeted patch bodies
    if (body.status === 'Completed' && !(body.billPaid === true || currentAppt.billPaid === true)) {
      body.status = 'Bill Pending';
    }
    const finalStatus = body.status || currentAppt.status;
    const finalBillPaid = body.billPaid !== undefined ? body.billPaid : currentAppt.billPaid;
    if (finalStatus === 'Bill Pending' && finalBillPaid === true) {
      body.status = 'Completed';
    }

    // Filter non-schema properties to prevent validation crashes with runValidators: true
    const { id: _, _id: __, paymentStatus, paymentMethod, paymentDate, ...cleanBody } = body;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { $set: cleanBody },
      { new: true, runValidators: true }
    );

    const updatedAppointmentObj = updatedAppointment.toObject();
    if (updatedAppointmentObj.labFileUrl) {
      updatedAppointmentObj.labFileUrl = transformFileUrlsForResponse(updatedAppointmentObj.labFileUrl, updatedAppointmentObj._id.toString());
    }

    return NextResponse.json({ success: true, data: updatedAppointmentObj });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 5. REMOVE / ARCHIVE APPOINTMENT (DELETE)
// ==========================================
export async function DELETE(req) {
  try {
    await mmgc_db();
    const { searchParams } = new URL(req.url);

    // Validate parameters with Zod
    const rawParams = Object.fromEntries(searchParams.entries());
    const validation = deleteAppointmentQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }

    const { id, doctorName } = validation.data;

    if (doctorName && !id) {
      await Appointment.updateMany(
        { 
          doctorName, 
          status: { $in: ['Rejected', 'Withdrawn', 'Completed', 'Bill Pending', 'Archived', 'Prescribed', 'Cancelled'] } 
        },
        { $set: { deletedByDoctor: true } }
      );
      return NextResponse.json({ success: true, message: "Doctor logs wiped successfully." }, { status: 200 });
    }

    if (!id) {
      return NextResponse.json({ error: "Appointment ID parameter is required" }, { status: 400 });
    }

    const currentAppt = await Appointment.findById(id);
    if (!currentAppt) {
      return NextResponse.json({ error: "No matching appointment record found to process" }, { status: 404 });
    }

    const isLabActive = ['Lab Test Ordered', 'Processing Lab Test'].includes(currentAppt.status);
    if (currentAppt.status === 'Prescribed' || isLabActive) {
      const softDeletedAppt = await Appointment.findByIdAndUpdate(
        id,
        { $set: { deletedByDoctor: true } },
        { new: true }
      );
      const softDeletedApptObj = softDeletedAppt.toObject();
      if (softDeletedApptObj.labFileUrl) {
        softDeletedApptObj.labFileUrl = transformFileUrlsForResponse(softDeletedApptObj.labFileUrl, softDeletedApptObj._id.toString());
      }
      return NextResponse.json({ 
        success: true, 
        message: "Record removed from doctor view; retained for systems/patient trace.", 
        data: softDeletedApptObj 
      }, { status: 200 });
    }

    await Appointment.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Appointment permanently deleted from database" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}