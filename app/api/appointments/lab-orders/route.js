import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import Appointment from '@/models/Appointment';
import mongoose from 'mongoose';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import {
  getLabWorkspaceQuerySchema,
  updateLabStatusSchema,
  deleteLabRecordQuerySchema
} from '@/schemas/appointment.schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ========================================================
// 1. GET: FETCH ACTIVE LAB WORKSPACE OR ARCHIVED RECORDS
// ========================================================
export async function GET(req) {
  try {
    await mmgc_db();

    const { searchParams } = new URL(req.url);

    // Validate incoming workspace state tokens
    const rawParams = Object.fromEntries(searchParams.entries());
    const validation = getLabWorkspaceQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }

    const idParam = validation.data.id;
    const viewMode = validation.data.view || 'active';

    // ✅ BACKWARD ISOLATED COMPATIBILITY SUPPORT: If a single unique record query is targeted, fetch and dispatch it cleanly
    if (idParam) {
      const app = await Appointment.findById(idParam);
      if (!app) {
        return NextResponse.json({ error: "Appointment trace index context not found" }, { status: 404 });
      }
      return NextResponse.json(app, { status: 200 });
    }

    // Base query targeting laboratory workflows
    let query = {};

    // --- Isolated View States Control For Lab Staff ---
    if (viewMode === 'history') {
      // ✅ FIX: Include 'Completed' parent status so finalized records don't disappear from history logs
      query.status = { $in: ['Lab Test Ordered', 'Processing Lab Test', 'Lab Completed', 'Admitted', 'Prescribed', 'Completed'] };
      query.labStatus = { $in: ['Completed', 'Cancelled'] };
      query.clearedFromHistory = { $ne: true };
    } else {
      // Active queue shows remaining tasks and filters out soft-deleted records
      query.status = { $in: ['Lab Test Ordered', 'Processing Lab Test', 'Lab Completed', 'Admitted', 'Prescribed'] };
      query.deletedByLab = { $ne: true };
      // Filter out statuses that don't have an active laboratory context initialized yet
      query.labStatus = { $in: ['Pending', 'To Collect', 'Pending Dispatch', 'Dispatched', 'In Progress'] };
    }

    const appointments = await Appointment.find(query).sort({ updatedAt: -1 });

    const formattedOrders = await Promise.all(appointments.map(async (app) => {
      const Prescription = mongoose.models.Prescription;
      let rxDoc = null;
      if (Prescription) {
        rxDoc = await Prescription.findOne({ appointmentId: app._id });
      }

      let extractedTest = "";

      // 🛠️ PRIORITIZE ADMITTED/INPATIENT PRESCRIPTION LAB ENTRIES OVER HISTORICAL REASON STRINGS
      // ✅ FIX: Added 'Completed' and 'Lab Test Ordered' here so new dispatched tests map correctly
      if (['Admitted', 'Lab Completed', 'Processing Lab Test', 'Prescribed', 'Completed', 'Lab Test Ordered'].includes(app.status) && rxDoc && rxDoc.labPrescription) {
        extractedTest = rxDoc.labPrescription.trim();
      }

      // ✅ FIX: Direct fallback to the appointment's labPrescription if the prescription document was missing
      if ((!extractedTest || extractedTest === "Diagnostic Panels Ordered") && app.labPrescription && app.labPrescription !== "No active lab orders listed.") {
        extractedTest = app.labPrescription.trim();
      }

      // Fallback to standard regex boundary parsing for OPD workflows or missing prescription mapping records
      if (!extractedTest) {
        const reasonStr = app.reason || '';
        const labsMatch = reasonStr.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i);
        extractedTest = labsMatch ? labsMatch[1].trim() : "";
        extractedTest = extractedTest.replace(/[.,\s]+$/, "");
      }

      // ✅ SYNCHRONIZATION FALLBACK: If string parsing yields empty array, extract direct text from Prescription matrix mapping
      if (!extractedTest || extractedTest === "Diagnostic Panels Ordered") {
        if (rxDoc && rxDoc.labPrescription) {
          extractedTest = rxDoc.labPrescription.trim();
        }
      }

      if (!extractedTest) {
        extractedTest = "Diagnostic Panels Ordered";
      }

      // Extra verification to ensure cross-referenced prescription records populate notes cleanly if fields go blank
      let extractedNotes = app.labNotes || '';
      let extractedFileUrl = app.labFileUrl || '';

      if (!extractedNotes || extractedNotes === '') {
        if (rxDoc && rxDoc.labNotes) {
          // ✅ FIX: Corrected typo access path from rxDoc.rxDoc.labNotes to rxDoc.labNotes
          extractedNotes = rxDoc.labNotes;
          if (rxDoc.labFileUrl) {
            extractedFileUrl = rxDoc.labFileUrl;
          }
        }
      }

      return {
        id: app._id.toString(),
        _id: app._id.toString(),
        patientName: app.patientName || "Unknown Patient",
        test: extractedTest,
        labStatus: app.labStatus || 'Pending',
        labNotes: extractedNotes,
        labFileUrl: extractedFileUrl,
        date: app.date || '',
        time: app.time || ''
      };
    }));

    return NextResponse.json(formattedOrders, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Failed to compile dashboard dynamic pipeline:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ========================================================
// 2. PATCH: UPDATE OPERATIONAL STATUS OR VERDICT DETAILS
// ========================================================
export async function PATCH(req) {
  try {
    await mmgc_db();

    let id, labStatus, labNotes;
    let savedFilePath = "";
    let customReason = undefined;
    let customLabPrescription = undefined;

    const contentType = req.headers.get('content-type') || '';

    // --- MODE A: FORM DATA PROCESSING (FINALIZE & SUBMIT VERDICT) ---
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      id = formData.get('id') || formData.get('_id');
      labStatus = formData.get('labStatus');

      const structuredTestsStr = formData.get('structuredTests');

      // Zod Validation execution on parsed Form-Data payload mapping
      const payloadToValidate = {
        id: formData.get('id') || undefined,
        _id: formData.get('_id') || undefined,
        labStatus: formData.get('labStatus') || undefined,
        labNotes: formData.get('labNotes') || undefined,
        structuredTests: structuredTestsStr || undefined,
      };
      const validation = updateLabStatusSchema.safeParse(payloadToValidate);
      if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
      }

      if (structuredTestsStr) {
        const structuredTests = JSON.parse(structuredTestsStr);
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Retrieve the current data to avoid redoing or overwriting previous metrics
        const existingApp = await Appointment.findById(id);
        let finalNotesArray = [];
        let finalFilesArray = [];

        if (existingApp && existingApp.labNotes && existingApp.labNotes.startsWith('[')) {
          try { finalNotesArray = JSON.parse(existingApp.labNotes); } catch (e) { }
        }
        if (existingApp && existingApp.labFileUrl && existingApp.labFileUrl.startsWith('[')) {
          try { finalFilesArray = JSON.parse(existingApp.labFileUrl); } catch (e) { }
        }

        // Track each processed test configuration item array block
        for (let index = 0; index < structuredTests.length; index++) {
          const testItem = structuredTests[index];
          if (testItem.isNew === false) {
            continue; // Skip already completed tests to preserve them intact
          }

          // Harvest multi-file collection arrays mapped from frontend fields
          const attachedFiles = formData.getAll(`files_test_${index}`);
          let savedUrls = [];

          for (const file of attachedFiles) {
            if (file && typeof file !== 'string' && file.name) {
              const bytes = await file.arrayBuffer();
              const buffer = Buffer.from(bytes);

              // ✅ FIX: Cleanse all unsafe URL characters to allow opening PDFs seamlessly later
              const filename = `${id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

              const uploadPath = join(uploadDir, filename);
              await writeFile(uploadPath, buffer);
              savedUrls.push(`/uploads/${filename}`);
            }
          }

          // Filter out existing duplicates if re-submitting an updated copy
          finalNotesArray = finalNotesArray.filter(n => n.testName !== testItem.testName);
          finalNotesArray.push({
            testName: testItem.testName,
            notes: testItem.notes
          });

          if (savedUrls.length > 0) {
            finalFilesArray = finalFilesArray.filter(f => f.testName !== testItem.testName);
            finalFilesArray.push({
              testName: testItem.testName,
              urls: savedUrls
            });
          }
        }

        // Stringify parameters to seamlessly persist inside schema string properties
        labNotes = JSON.stringify(finalNotesArray);
        if (finalFilesArray.length > 0) {
          savedFilePath = JSON.stringify(finalFilesArray);
        } else if (existingApp && existingApp.labFileUrl) {
          savedFilePath = existingApp.labFileUrl;
        }
      } else {
        labNotes = formData.get('labNotes') || "";
        const file = formData.get('labFile');
        if (file && typeof file !== 'string' && file.name) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          // ✅ FIX: Cleanse all unsafe URL characters to allow opening PDFs seamlessly later
          const filename = `${id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const uploadDir = join(process.cwd(), 'public', 'uploads');
          await mkdir(uploadDir, { recursive: true });
          const uploadPath = join(uploadDir, filename);
          await writeFile(uploadPath, buffer);
          savedFilePath = `/uploads/${filename}`;
        }
      }
    }
    // --- MODE B: RAW JSON PROCESSING (SAMPLE ACQUISITION STATUS SHIFTS / NEW TESTS ISSUED) ---
    else {
      const json = await req.json();

      // Zod Validation execution on parsed JSON data mapping
      const validation = updateLabStatusSchema.safeParse(json);
      if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
      }

      id = json.id || json._id;
      labStatus = json.labStatus;
      labNotes = json.labNotes; // Prevent defaulting to "" which wipes records
      if (json.reason !== undefined) customReason = json.reason;
      if (json.labPrescription !== undefined) customLabPrescription = json.labPrescription;
    }

    if (!id || !labStatus) {
      return NextResponse.json({ error: "Missing required tracking parameters" }, { status: 400 });
    }

    const normalizedLabStatus = String(labStatus).trim();

    // Fetch the existing appointment to check its current status before overriding
    const existingAppt = await Appointment.findById(id);
    if (!existingAppt) {
      return NextResponse.json({ error: "Target appointment trace index not found" }, { status: 404 });
    }

    // Map lab status to parent appointment status workflows
    let parentStatusUpdate = "Lab Test Ordered";
    if (normalizedLabStatus === "In Progress") parentStatusUpdate = "Processing Lab Test";
    if (normalizedLabStatus === "Completed") parentStatusUpdate = "Lab Completed";

    // Preserve 'Admitted' or 'Lab Completed' status if patient is already admitted
    if (existingAppt.status === 'Admitted' || existingAppt.status === 'Lab Completed') {
      parentStatusUpdate = normalizedLabStatus === "Completed" ? "Lab Completed" : "Admitted";
    }

    // Setup complete mutation tracking block
    const updatePayload = {
      labStatus: normalizedLabStatus,
      status: parentStatusUpdate,
      deletedByDoctor: false
    };

    // Apply structural configuration updates dynamically if variables are sent
    if (labNotes !== undefined) {
      updatePayload.labNotes = labNotes;
    }

    // Include reference path if file assets were successfully uploaded
    if (savedFilePath) {
      updatePayload.labFileUrl = savedFilePath;
    }

    // ✅ SYNCHRONIZATION UPGRADE: Support manual structural overrides for appending newly issued test queries
    if (customReason !== undefined) {
      updatePayload.reason = customReason;
    }
    if (customLabPrescription !== undefined) {
      updatePayload.labPrescription = customLabPrescription;
    }

    const updatedRecord = await Appointment.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return NextResponse.json({ error: "Target appointment trace index not found" }, { status: 404 });
    }

    // Synchronize updates downstream to cross-referenced prescription logs collections if matching layout exists
    const Prescription = mongoose.models.Prescription;
    if (Prescription) {
      const prescriptionUpdate = {
        labStatus: normalizedLabStatus,
        ...(savedFilePath && { labFileUrl: savedFilePath })
      };
      if (labNotes !== undefined) {
        prescriptionUpdate.labNotes = labNotes;
      }
      if (customLabPrescription !== undefined) {
        prescriptionUpdate.labPrescription = customLabPrescription;
      }
      await Prescription.findOneAndUpdate(
        { appointmentId: new mongoose.Types.ObjectId(id) },
        { $set: prescriptionUpdate }
      );
    }

    // ✅ FIX: Purge Next.js server cache to make documents and findings show up instantly across components
    revalidatePath('/api/appointments/lab-orders');

    return NextResponse.json({ success: true, data: updatedRecord }, { status: 200 });
  } catch (error) {
    console.error("Failed to commit operational status mutation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ========================================================
// 3. DELETE: ARCHIVE WORKSPACE QUEUE OR CLEAR HISTORIES
// ========================================================
export async function DELETE(req) {
  try {
    await mmgc_db();

    const { searchParams } = new URL(req.url);
    
    // Validate request query parameters via Zod
    const rawParams = Object.fromEntries(searchParams.entries());
    const validation = deleteLabRecordQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
    }

    const id = validation.data.id;
    const action = validation.data.action; // Synced parameters matching frontend operations

    if (!id) {
      return NextResponse.json({ error: "Appointment ID parameter is required" }, { status: 400 });
    }

    // Matches 'clearHistory' action dispatched from dashboard component handler
    if (action === 'clearHistory' || action === 'wipeHistory') {
      await Appointment.findByIdAndUpdate(id, { $set: { clearedFromHistory: true } });
      revalidatePath('/api/appointments/lab-orders');
      return NextResponse.json({ success: true, message: "Record permanently wiped from laboratory history log registry." }, { status: 200 });
    }

    // Matches 'deleteActive' action dispatched from dashboard component handler
    else {
      await Appointment.findByIdAndUpdate(id, { $set: { deletedByLab: true } });
      revalidatePath('/api/appointments/lab-orders');
      return NextResponse.json({ success: true, message: "Record dismissed safely from active workspace pipeline view." }, { status: 200 });
    }
  } catch (error) {
    console.error("Failed to execute laboratory deletion process:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}