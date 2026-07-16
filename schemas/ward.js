// schemas/ward.js
import { z } from 'zod';

// Helper schema to mimic the `value ? Number(value) : 0` fallback safely
const feeSchema = z.preprocess((val) => {
  if (!val) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}, z.number().default(0));

export const createWardSchema = z.object({
  name: z.string({
    required_error: "Ward name and specialty are required",
    invalid_type_error: "Ward name and specialty are required"
  }).trim().min(1, "Ward name and specialty are required"),
  specialty: z.string({
    required_error: "Ward name and specialty are required",
    invalid_type_error: "Ward name and specialty are required"
  }).trim().min(1, "Ward name and specialty are required"),
  admissionFee: feeSchema.optional(),
  overnightFee: feeSchema.optional(),
});

export const updateWardSchema = z.object({
  id: z.string({
    required_error: "Ward identifier context, name, and specialty are required",
    invalid_type_error: "Ward identifier context, name, and specialty are required"
  }).min(1, "Ward identifier context, name, and specialty are required"),
  name: z.string({
    required_error: "Ward identifier context, name, and specialty are required",
    invalid_type_error: "Ward identifier context, name, and specialty are required"
  }).trim().min(1, "Ward identifier context, name, and specialty are required"),
  specialty: z.string({
    required_error: "Ward identifier context, name, and specialty are required",
    invalid_type_error: "Ward identifier context, name, and specialty are required"
  }).trim().min(1, "Ward identifier context, name, and specialty are required"),
  admissionFee: feeSchema.optional(),
  overnightFee: feeSchema.optional(),
});

export const deleteWardSchema = z.object({
  id: z.string({
    required_error: "Ward collection ID is required for erasure tracking",
    invalid_type_error: "Ward collection ID is required for erasure tracking"
  }).min(1, "Ward collection ID is required for erasure tracking"),
});