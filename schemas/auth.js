import { z } from "zod";

/**
 * Base field validations to maintain consistency across schemas
 */
const emailValidation = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address");

const passwordValidation = z
  .string()
  .min(1, "Password is required");

/**
 * 1. Login Schema
 * Matches requirements for both NextAuth credentials (route.js) 
 * and manual login (route - Copy.js)
 */
export const loginSchema = z.object({
  email: emailValidation,
  password: passwordValidation,
});

/**
 * 2. Register Schema
 * Matches requirements for user registration (route - Copy (2).js)
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required"),
  email: emailValidation,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"), // Added a standard secure length minimum
  role: z
    .string()
    .optional(), // Defaults to 'Patient' in your route if omitted
  dept: z
    .string()
    .optional(), // Defaults to 'General' in your route if omitted
});

/**
 * 3. Reset Password Schema
 * Matches requirements for resetting a password (route - Copy (3).js)
 */
export const resetPasswordSchema = z.object({
  email: emailValidation,
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

/**
 * NEW Nodemailer Token Password Reset Schema
 */
export const forgotPasswordSchema = z.object({
  email: emailValidation,
});

export const resetPasswordTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

/**
 * 4. Change Password Schema (Optional use for route - Copy.js)
 * Matches requirements for manual password updates matching oldPassword and newPassword
 */
export const changePasswordSchema = z.object({
  email: emailValidation,
  oldPassword: passwordValidation,
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});