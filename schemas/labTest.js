import { z } from 'zod';

export const LabTestPostSchema = z.object({
  name: z.string({ required_error: "Lab panel name parameter is required" })
         .min(1, "Lab panel name parameter is required"),
  cost: z.any().optional()
});

export const LabTestPutSchema = z.object({
  id: z.string().optional(),
  originalName: z.string().optional(),
  name: z.string().optional(),
  cost: z.any().optional()
}).refine((data) => data.id || data.originalName, {
  message: "Test identifier/name parameter is required"
});

export const LabTestDeleteSchema = z.object({
  name: z.string({ required_error: "Target lab panel tracking title name required" })
         .min(1, "Target lab panel tracking title name required")
});