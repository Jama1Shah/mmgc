import { z } from 'zod';

// Schema for creating a new invoice (POST)
export const PostInvoiceSchema = z.object({
  appointmentId: z.string().optional(),
  patientId: z.string().optional(),
  status: z.string().optional(),
}).passthrough();

// Schema for updating an existing invoice (PUT)
export const PutInvoiceSchema = z.object({
  id: z.string({ required_error: "Invoice ID is mandatory for updates." }).min(1, "Invoice ID cannot be empty."),
  appointmentId: z.string().optional(),
  patientId: z.string().optional(),
  status: z.string().optional(),
}).passthrough();

// Schema for deleting an invoice (DELETE)
export const DeleteInvoiceSchema = z.object({
  id: z.string({ required_error: "Invoice ID is mandatory for deletion." }).min(1, "Invoice ID cannot be empty.")
}).passthrough();