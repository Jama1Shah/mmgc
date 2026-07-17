import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import mongoose from 'mongoose';
import Appointment from '@/models/Appointment'; 
import { z } from 'zod';

// ==========================================
// RUNTIME ZOD SECURITY VALIDATION LAYERS
// ==========================================
const PrescriptionGetSchema = z.object({
  doctorName: z.string().nullable().optional(),
  patientEmail: z.string().email("Invalid email format.").nullable().optional().or(z.literal('')),
  admittedOnly: z.string().nullable().optional(),
});

const PrescriptionPostSchema = z.object({
  appointmentId: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).min(1, "Missing required clinical prescription dataset parameters."),
  patientName: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).min(1, "Missing required clinical prescription dataset parameters."),
  patientEmail: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).email("Invalid email format.").min(1, "Missing required clinical prescription dataset parameters."),
  doctorName: z.string().optional().nullable(),
  medicationDetails: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).min(1, "Missing required clinical prescription dataset parameters."),
  dateIssued: z.string().optional().nullable(),
  appointmentDate: z.string().optional().nullable(),
  appointmentTime: z.string().optional().nullable(),
  labPrescription: z.string().optional().nullable(),
  labStatus: z.string().optional().nullable(),
  labNotes: z.string().optional().nullable(),
  admissionRequired: z.boolean().optional().nullable(),
  admissionDetails: z.object({
    wardName: z.string().optional().nullable(),
    admissionDays: z.number().optional().nullable(),
    admittedAt: z.string().optional().nullable(),
  }).optional().nullable(),
});

const PrescriptionPutSchema = z.object({
  id: z.string({ required_error: "Target Prescription record Identifier is required." }).min(1, "Target Prescription record Identifier is required."),
  vitals: z.object({
    hr: z.string().optional(),
    temp: z.string().optional(),
    spo2: z.string().optional(),
    bp: z.string().optional()
  }).optional(),
  medStatus: z.string().optional(),
  medicationDetails: z.string().optional(),
  labPrescription: z.string().optional(),
  labStatus: z.string().optional(),
  labNotes: z.string().optional(),
  labFileUrl: z.string().optional(),
  admissionRequired: z.boolean().optional(),
  dischargeMedication: z.string().optional(),
  dischargedAt: z.string().optional(),
});

const PrescriptionDeleteSchema = z.object({
  id: z.string().nullable().optional(),
  doctorName: z.string().nullable().optional(),
});

// ==========================================
// MONGOOSE SCHEMA & COMPILATION
// ==========================================
const PrescriptionSchema = new mongoose.Schema({
  // ✅ FIX: Converted string type to explicit reference pointer for Mongoose .populate() matrices
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true }, 
  doctorName: { type: String, required: true },
  medicationDetails: { type: String, required: true },
  dateIssued: { type: String, required: true },
  appointmentDate: { type: String },
  appointmentTime: { type: String },
  
  // ✅ Laboratory synchronization structural values managed at the route layout layer
  labPrescription: { type: String, default: null },
  labNotes: { type: String, default: null },
  labFileUrl: { type: String, default: null },
  labStatus: { type: String, default: 'Pending' },

  // 🏥 INPATIENT MANAGEMENT & NURSE DASHBOARD TRACKING CORE PROPERTIES
  admissionRequired: { type: Boolean, default: false },
  admissionDetails: {
    wardName: { type: String, default: 'General Bedward' },
    admittedAt: { type: Date, default: null },
    admissionDays: { type: Number, default: 0 }
  },
  vitals: {
    hr: { type: String, default: '80' },
    temp: { type: String, default: '98.6' },
    spo2: { type: String, default: '98' },
    bp: { type: String, default: '120/80' }
  },
  vitalsChecked: { type: Boolean, default: false },
  vitalsCheckedAt: { type: Date, default: null }, // Track exactly when vitals were committed
  medStatus: { type: String, default: 'Pending' },

  // 🏁 FINAL DISCHARGE TAKE-HOME PRESCRIPTION (separate from inpatient medicationDetails chart)
  dischargeMedication: { type: String, default: null },
  dischargedAt: { type: Date, default: null },

  // ✅ VISIBILITY FLAGS: Keeps the medical record alive in the DB
  deletedByDoctor: { type: Boolean, default: false },
  deletedByPatient: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ FIX Next.js Caching: Flush any existing cached versions of the model (like from Prescription.js) 
if (mongoose.models.Prescription) {
  delete mongoose.models.Prescription;
}
const Prescription = mongoose.model('Prescription', PrescriptionSchema);

// ==========================================
// HELPER: Convert a raw stored data: URI (or the structured
// [{testName, urls}] array of them) into the same short,
// browser-safe proxy link the lab-orders route already knows
// how to resolve and stream back with proper headers. This is
// what fixes files not opening correctly on the doctor / nurse /
// patient pages — they were previously receiving the raw
// multi-MB data: URI directly from the database.
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

// FETCH PRESCRIPTIONS
export async function GET(req) {
  try {
    await mmgc_db();
    const { searchParams } = new URL(req.url);
    const doctorName = searchParams.get('doctorName');
    const patientEmail = searchParams.get('patientEmail');
    const admittedOnlyParam = searchParams.get('admittedOnly');
    const admittedOnly = admittedOnlyParam === 'true';

    // 🔒 ZOD SECURITY LAYER
    const validatedQuery = PrescriptionGetSchema.safeParse({ doctorName, patientEmail, admittedOnly: admittedOnlyParam });
    if (!validatedQuery.success) {
      return NextResponse.json({ error: validatedQuery.error.errors[0].message }, { status: 400 });
    }

    let query = {};
    
    // 🏥 OVERRIDE FOR ADMITTED PATIENTS & NURSE CONTEXTS
    if (admittedOnly) {
      // FIX: Only show patients where required hospital admission was checked
      query.admissionRequired = true;
    } else {
      // 1. If fetching for Doctor dashboard: Only show records they haven't hidden.
      if (doctorName) {
        query.doctorName = doctorName;
        query.deletedByDoctor = { $ne: true }; 
      }
      
      // 2. If fetching for Patient panel: Keep displaying it even if deleted by the doctor.
      if (patientEmail) {
        query.patientEmail = patientEmail;
        query.deletedByPatient = { $ne: true }; 
      }

      if (!doctorName && !patientEmail) {
        return NextResponse.json({ error: "Doctor name or Patient Email parameter is required" }, { status: 400 });
      }
    }

    // ✅ FIX: Added .populate() call with key fields so the dashboard modal template parses structural data correctly
    const records = await Prescription.find(query)
      .populate({
        path: 'appointmentId',
        select: 'reason status labPrescription labNotes labFileUrl labStatus updatedAt admissionDays admissionRequired'
      })
      .sort({ createdAt: -1 });

    // ✅ SYNCHRONIZATION FALLBACK & DYNAMIC CYCLE TRACKING
    const formattedRecords = await Promise.all(records.map(async record => {
      const doc = record.toObject();
      
      // 🏥 ADMISSION DAYS AUTO-INCREMENT LOGIC (Midnight Rollover Cycle Aligned with Frontend)
      if (
        doc.admissionRequired && 
        doc.admissionDetails?.admittedAt && 
        !['Completed', 'Archived', 'Cancelled'].includes(doc.appointmentId?.status)
      ) {
        const admittedAt = new Date(doc.admissionDetails.admittedAt);
        admittedAt.setHours(0, 0, 0, 0);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const daysPassed = Math.max(0, Math.floor((currentDate - admittedAt) / (1000 * 60 * 60 * 24)));
        
        if (daysPassed > (doc.admissionDetails.admissionDays || 0)) {
           doc.admissionDetails.admissionDays = daysPassed;
           
           // Background database sync for Prescription
           await Prescription.findByIdAndUpdate(doc._id, {
              $set: { 'admissionDetails.admissionDays': daysPassed }
           });

           // Sync the related Appointment dynamically
           if (doc.appointmentId?._id) {
             await Appointment.findByIdAndUpdate(doc.appointmentId._id, {
               $set: {
                 admissionDays: daysPassed,
                 'admissionDetails.admissionDays': daysPassed
               }
             });
             doc.appointmentId.admissionDays = daysPassed;
           }
        }
      }

      if (doc.appointmentId) {
        // 1. Sync lab prescription description / text parser
        if (!doc.labPrescription || doc.labPrescription === 'Diagnostic Panels Ordered' || doc.labPrescription === 'No active lab orders listed.') {
          if (doc.appointmentId.labPrescription && doc.appointmentId.labPrescription !== 'No active lab orders listed.') {
            doc.labPrescription = doc.appointmentId.labPrescription;
          } else if (doc.appointmentId.reason) {
            const reasonStr = doc.appointmentId.reason || '';
            const labsMatch = reasonStr.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i);
            let extractedTest = labsMatch ? labsMatch[1].trim().replace(/[.,\s]+$/, "") : "";
            if (extractedTest) {
              doc.labPrescription = extractedTest;
            }
          }
        }
        if (!doc.labPrescription) {
          doc.labPrescription = "No active lab orders listed.";
        }

        // 2. Sync lab outcome notes
        if (!doc.labNotes || doc.labNotes === '') {
          if (doc.appointmentId.labNotes) {
            doc.labNotes = doc.appointmentId.labNotes;
          }
        }

        // 3. Sync file attachments URLs path
        if (!doc.labFileUrl || doc.labFileUrl === '') {
          if (doc.appointmentId.labFileUrl) {
            doc.labFileUrl = doc.appointmentId.labFileUrl;
          }
        }

        // ✅ FIX: Convert any raw embedded data: URI into a short, browser-safe
        // proxy link before it ever reaches the doctor/nurse/patient dashboards.
        if (doc.labFileUrl) {
          const apptIdForFile = doc.appointmentId?._id
            ? doc.appointmentId._id.toString()
            : (doc.appointmentId ? doc.appointmentId.toString() : null);
          doc.labFileUrl = transformFileUrlsForResponse(doc.labFileUrl, apptIdForFile);
        }

        // 4. Sync workspace workflow operation status tracking
        // Core Fix: If the prescription itself has a valid pending/active lab status layer generated, preserve it!
        if (doc.labStatus && doc.labStatus !== 'None' && doc.labStatus !== 'Pending') {
          // Keep the prescription's specific status if it has advanced beyond baseline
        } else if (doc.appointmentId.labStatus && doc.appointmentId.labStatus !== 'None') {
          doc.labStatus = doc.appointmentId.labStatus;
        } else if (!doc.labStatus || doc.labStatus === 'None') {
          doc.labStatus = 'Pending';
        }
      }
      return doc;
    }));

    return NextResponse.json(formattedRecords);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// SAVE NEW PRESCRIPTION (With Dynamic Admission Tracking System)
export async function POST(req) {
  try {
    await mmgc_db();
    const data = await req.json();

    // 🔒 ZOD SECURITY LAYER
    const validatedBody = PrescriptionPostSchema.safeParse(data);
    if (!validatedBody.success) {
      return NextResponse.json({ error: validatedBody.error.errors[0].message }, { status: 400 });
    }

    // 1. Structural schema verification constraints match step
    if (!data.appointmentId || !data.patientName || !data.patientEmail || !data.medicationDetails) {
      return NextResponse.json({ error: "Missing required clinical prescription dataset parameters." }, { status: 400 });
    }

    const admissionTimestamp = data.admissionRequired ? new Date() : null;

    // 2. Commit the new prescription record object instance to the cluster array
    const freshPrescription = await Prescription.create({
      appointmentId: data.appointmentId,
      patientName: data.patientName,
      patientEmail: data.patientEmail,
      doctorName: data.doctorName || "Attending Physician",
      medicationDetails: data.medicationDetails,
      dateIssued: data.dateIssued || new Date().toLocaleDateString(),
      appointmentDate: data.appointmentDate || "",
      appointmentTime: data.appointmentTime || "",
      
      // Laboratory layer initialization fields
      labPrescription: data.labPrescription || "No active lab orders listed.",
      labStatus: data.labPrescription && data.labPrescription !== "No active lab orders listed." ? "Pending" : "None",
      labNotes: "",
      labFileUrl: "",

      // Admission parameters mappings block setup
      admissionRequired: data.admissionRequired || false,
      admissionDetails: {
        wardName: data.admissionDetails?.wardName || "General Bedward",
        admittedAt: admissionTimestamp,
        admissionDays: data.admissionDetails?.admissionDays || 0
      },
      vitals: { hr: '80', temp: '98.6', spo2: '98', bp: '120/80' },
      vitalsChecked: false,
      medStatus: "Pending"
    });

    // 3. Keep the underlying outpatient appointment status synchronized with the pipeline progression engine
    let targetedStatus = 'Prescribed';
    if (data.admissionRequired) {
      targetedStatus = 'Admitted';
    } else if (data.labPrescription && data.labPrescription !== "No active lab orders listed.") {
      targetedStatus = 'Lab Test Ordered';
    }

    // Consolidate updates across collections cleanly
    const updatePayload = { status: targetedStatus };
    if (data.labPrescription && data.labPrescription !== "No active lab orders listed.") {
      updatePayload.labPrescription = data.labPrescription;
      updatePayload.labStatus = "Pending";
    }
    
    // Inject identical admission details into the Appointment map directly on admission creation
    if (data.admissionRequired) {
      updatePayload.admissionRequired = true;
      updatePayload.admissionDays = 0;
      updatePayload.admissionDetails = {
        wardName: data.admissionDetails?.wardName || "General Bedward",
        admittedAt: admissionTimestamp,
        admissionDays: 0
      };
    }

    await Appointment.findByIdAndUpdate(data.appointmentId, { $set: updatePayload });

    return NextResponse.json({ 
      success: true, 
      message: "Prescription successfully logged and appointment pipeline status advanced.", 
      data: freshPrescription 
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE PRESCRIPTION / LOG VITALS FROM NURSE WORKSTATION OR EDIT LAPELS
export async function PUT(req) {
  try {
    await mmgc_db();
    const data = await req.json();

    // 🔒 ZOD SECURITY LAYER
    const validatedBody = PrescriptionPutSchema.safeParse(data);
    if (!validatedBody.success) {
      return NextResponse.json({ error: validatedBody.error.errors[0].message }, { status: 400 });
    }

    if (!data.id) {
      return NextResponse.json({ error: "Target Prescription record Identifier is required." }, { status: 400 });
    }

    // Build dynamic update payload to retain fields unmodified unless specified
    let updates = {};

    // Handle nurse vitals submission
    if (data.vitals) {
      updates.vitals = data.vitals;
      updates.vitalsChecked = true;
      updates.vitalsCheckedAt = new Date();
    }

    // Handle nurse medication administration tracking slot modifications
    if (data.medStatus !== undefined) {
      updates.medStatus = data.medStatus;
    }

    // Handle doctor prescribing medicine chart modifications
    if (data.medicationDetails !== undefined) {
      updates.medicationDetails = data.medicationDetails;
    }

    // Handle doctor lab assignment revisions from prescription workflows
    if (data.labPrescription !== undefined) {
      updates.labPrescription = data.labPrescription;
      if (data.labPrescription && data.labPrescription !== "No active lab orders listed.") {
        updates.labStatus = data.labStatus || "Pending";
      } else {
        updates.labStatus = "None";
      }
    }

    if (data.labStatus !== undefined) {
      updates.labStatus = data.labStatus;
    }
    if (data.labNotes !== undefined) {
      updates.labNotes = data.labNotes;
    }
    if (data.labFileUrl !== undefined) {
      updates.labFileUrl = data.labFileUrl;
    }
    // ✅ ALLOW the admissionRequired flag to be modified (required for discharging patients)
    if (data.admissionRequired !== undefined) {
      updates.admissionRequired = data.admissionRequired;
    }

    // Handle the final take-home discharge prescription (separate from the inpatient medicationDetails chart)
    if (data.dischargeMedication !== undefined) {
      updates.dischargeMedication = data.dischargeMedication;
    }
    if (data.dischargedAt !== undefined) {
      updates.dischargedAt = data.dischargedAt;
    }

    // Commit changes to database layer
    const updatedPrescription = await Prescription.findByIdAndUpdate(
      data.id,
      { $set: updates },
      { new: true }
    );

    if (!updatedPrescription) {
      return NextResponse.json({ error: "Prescription record not found." }, { status: 404 });
    }

    const updatedPrescriptionObj = updatedPrescription.toObject();
    if (updatedPrescriptionObj.labFileUrl) {
      const apptIdForFile = updatedPrescriptionObj.appointmentId
        ? updatedPrescriptionObj.appointmentId.toString()
        : null;
      updatedPrescriptionObj.labFileUrl = transformFileUrlsForResponse(updatedPrescriptionObj.labFileUrl, apptIdForFile);
    }

    // Keep appointment database parameters synchronized if modifying labs context metrics references inline
    if (updatedPrescription.appointmentId && (data.labPrescription !== undefined || data.labStatus !== undefined)) {
      let appointmentUpdates = {};
      if (data.labPrescription !== undefined) appointmentUpdates.labPrescription = data.labPrescription;
      if (data.labStatus !== undefined) appointmentUpdates.labStatus = data.labStatus;
      
      await Appointment.findByIdAndUpdate(updatedPrescription.appointmentId, { $set: appointmentUpdates });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Prescription parameters synchronized successfully.", 
      data: updatedPrescriptionObj 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE/CLEAR PRESCRIPTION LOG ENTRY (SOFT-DELETE TO RETAIN AUDIT TRAIL DATA)
export async function DELETE(req) {
  try {
    await mmgc_db();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const doctorName = searchParams.get('doctorName');

    // 🔒 ZOD SECURITY LAYER
    const validatedQuery = PrescriptionDeleteSchema.safeParse({ id, doctorName });
    if (!validatedQuery.success) {
      return NextResponse.json({ error: validatedQuery.error.errors[0].message }, { status: 400 });
    }

    // BATCH-WIPE LOGS ACTION: If doctorName parameter is passed instead of an ID, soft-delete logs
    if (doctorName && !id) {
      await Prescription.updateMany(
        { doctorName },
        { $set: { deletedByDoctor: true } }
      );
      return NextResponse.json({ 
        success: true,
        message: "All prescriptions hidden from doctor log history overview successfully." 
      });
    }

    if (!id) {
      return NextResponse.json({ error: "Prescription ID is required" }, { status: 400 });
    }

    const targetedPrescription = await Prescription.findById(id);
    if (!targetedPrescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }
      
    if (targetedPrescription.appointmentId) {
      await Appointment.findByIdAndUpdate(targetedPrescription.appointmentId, {
        $set: { 
          status: 'Completed',
          deletedByDoctor: false 
        }
      });
    }

    // Flag system soft deletion operation pass
    await Prescription.findByIdAndUpdate(id, {
      $set: { deletedByDoctor: true }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Prescription successfully dropped from practitioner workflow matrix tracking charts logs." 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}