import { z } from 'zod';

export const medicineSchema = z.object({
  name: z
    .string({ required_error: "Name required" })
    .trim()
    .min(1, { message: "Name required" }),
});