import { z } from 'zod';

// ==========================================
// 1. BASE APPOINTMENT CORE DEFINITIONS
// ==========================================

export const AppointmentStatusEnum = z.enum([
  'Scheduled',
  'Pending',
  'Accepted',
  'Accepted for Checkup',
  'In-Progress',
  'Completed',
  'Bill Pending',
  'Cancelled',
  'Rejected',
  'Rescheduled',
  'Waiting...',
  'Lab Test Ordered',
  'Processing Lab Test',
  'Lab Completed',
  'Admitted',
  'Archived',
  'Withdrawn',
  'Prescribed'
]);

export const LabStatusEnum = z.enum([
  'None',
  'Pending',
  'To Collect',
  'Pending Dispatch',
  'Dispatched',
  'In Progress',
  'Completed',
  'Cancelled'
]);

/**
 * Base schema representing the core Appointment data structure across systems.
 */
export const baseAppointmentSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  patientName: z.string().default('Unknown Patient'),
  patientEmail: z.string().email().optional(),
  doctorName: z.string(),
  date: z.string(), // YYYY-MM-DD
  time: z.string(), // HH:MM AM/PM
  status: AppointmentStatusEnum.default('Pending'),
  labStatus: LabStatusEnum.default('None'),
  reason: z.string().optional().default(''),
  labReason: z.string().optional().default(''),
  labNotes: z.string().optional().default(''), // Can hold stringified JSON arrays
  labFileUrl: z.string().nullable().optional().default(null), // Can hold stringified JSON arrays or flat links
  labPrescription: z.string().optional().default('No active lab orders listed.'),
  billPaid: z.boolean().default(false),
  deletedByDoctor: z.boolean().default(false),
  deletedByLab: z.boolean().default(false),
  clearedFromHistory: z.boolean().default(false),
  admissionRequired: z.boolean().default(false),
  admissionDays: z.number().default(0),
  admissionDetails: z.object({
    admittedAt: z.string().or(z.date()).optional(),
    admissionDays: z.number().default(0),
  }).optional(),
  analyticsLink: z.string().nullable().optional().default(null),
  prescriptionLink: z.string().nullable().optional().default(null),
});

// ==========================================
// 2. ROUTE 1: MAIN CRUD (route.js)
// ==========================================

// GET query parameters
export const getMainAppointmentsQuerySchema = z.object({
  id: z.string().nullable().optional(),
  doctorName: z.string().nullable().optional(),
  patientEmail: z.string().nullable().optional(),
  includeCompletedLabs: z.string().transform((val) => val === 'true').optional(),
  doctorId: z.string().nullable().optional(),
});

// POST payload verification
export const createAppointmentSchema = z.object({
  doctorName: z.string({ required_error: "Doctor name is required" }),
  date: z.string({ required_error: "Date is required" }),
  time: z.string({ required_error: "Time slot is required" }),
  labStatus: LabStatusEnum.default('None'),
}).catchall(z.any()); // Safely passes along any other dynamic fields appended from body records

// PUT payload verification
export const updateAppointmentSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  status: AppointmentStatusEnum.optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  reason: z.string().optional(),
  labReason: z.string().optional(),
  labNotes: z.string().optional(),
  labFileUrl: z.string().optional(),
  billPaid: z.boolean().optional(),
}).refine(data => data.id || data._id, {
  message: "Appointment ID parameter (id or _id) is required",
});

// PATCH payload verification
export const patchAppointmentSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  status: AppointmentStatusEnum.optional(),
  billPaid: z.boolean().optional(),
  // Intercepted non-schema payment tracking parameters processed safely here
  paymentStatus: z.any().optional(),
  paymentMethod: z.any().optional(),
  paymentDate: z.any().optional(),
}).catchall(z.any()); // Captures everything else to yield cleanBody values downstream

// DELETE query parameters
export const deleteAppointmentQuerySchema = z.object({
  id: z.string().nullable().optional(),
  doctorName: z.string().nullable().optional(),
});


// ==========================================
// 3. ROUTE 2: LABORATORY WORKSPACE (route - Copy.js)
// ==========================================

// GET query parameters
export const getLabWorkspaceQuerySchema = z.object({
  id: z.string().nullable().optional(),
  view: z.enum(['active', 'history']).default('active').optional(),
});

// PATCH payload handling (Form-Data Structured Metrics / Fallback Raw JSON Structure)
export const updateLabStatusSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  labStatus: LabStatusEnum,
  labNotes: z.string().optional(),
  structuredTests: z.string().optional(), // Stringified array: Array<{ testName: string, notes: string, isNew: boolean }>
  reason: z.string().optional(),          // Maps to customReason updates
  labPrescription: z.string().optional(), // Maps to customLabPrescription updates
}).catchall(z.any()); // Permits incoming Multi-part dynamic upload asset fields safely (e.g. files_test_x)

// DELETE query parameters
export const deleteLabRecordQuerySchema = z.object({
  id: z.string(),
  action: z.enum(['clearHistory', 'wipeHistory', 'deleteActive']).optional(),
});


// ==========================================
// 4. ROUTE 3: AVAILABILITY MATRIX (route - Copy (2).js)
// ==========================================

// GET query parameters
export const checkAvailabilityQuerySchema = z.object({
  doctor: z.string({ required_error: "Doctor name query context is required" }),
  date: z.string({ required_error: "Target availability check date is required" }),
  time: z.string({ required_error: "Target availability check time slot is required" }),
  excludeId: z.string().nullable().optional(),
});