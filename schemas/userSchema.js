import { z } from 'zod';

// Schema for GET query validation
export const getUserSchema = z.string().email("Invalid email format");

// Schema for CREATE (POST)
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  dept: z.string().min(1, "Department is required"),
  status: z.string().optional(),
  isVerified: z.boolean().optional(), // Added validation for admin override
});

// Schema for UPDATE (PUT)
export const updateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  name: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.string().optional(),
  password: z.string().optional(),
  dept: z.string().optional(),
  status: z.string().optional(),
  isVerified: z.boolean().optional(), // Added validation for admin updates
});

// Schema for DELETE
export const deleteUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});