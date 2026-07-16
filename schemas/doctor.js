// schemas/doctor.js
import { z } from 'zod';

export const getDoctorsSchema = z.object({
  list: z.string().nullable().optional(),
}).passthrough();

export const updateDoctorSchema = z.object({
  id: z.string({
    required_error: "Doctor configuration user ID is required",
    invalid_type_error: "Doctor configuration user ID is required"
  }).min(1, "Doctor configuration user ID is required"),
  fee: z.any().optional(), // Left flexible to allow the route's native Number(fee) casting
}).passthrough(); // Retains all arbitrary fields within ...updateData securely