import { z } from 'zod';

// Schema for GET request query validation
export const PrescriptionGetSchema = z.object({
  doctorName: z.string().nullable().optional(),
  patientEmail: z.string().email("Invalid email format.").nullable().optional().or(z.literal('')),
  admittedOnly: z.string().nullable().optional(),
});

// Schema for POST request body validation
export const PrescriptionPostSchema = z.object({
  appointmentId: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).min(1, "Missing required clinical prescription dataset parameters."),
  patientName: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).min(1, "Missing required clinical prescription dataset parameters."),
  patientEmail: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).email("Invalid email format.").min(1, "Missing required clinical prescription dataset parameters."),
  doctorName: z.string().optional(),
  medicationDetails: z.string({ required_error: "Missing required clinical prescription dataset parameters." }).min(1, "Missing required clinical prescription dataset parameters."),
  dateIssued: z.string().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  labPrescription: z.string().optional(),
  admissionRequired: z.boolean().optional(),
  admissionDetails: z.object({
    wardName: z.string().optional(),
    admissionDays: z.number().optional(),
  }).optional(),
});

// Schema for PUT request body validation
export const PrescriptionPutSchema = z.object({
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

// Schema for DELETE request query validation
export const PrescriptionDeleteSchema = z.object({
  id: z.string().nullable().optional(),
  doctorName: z.string().nullable().optional(),
});