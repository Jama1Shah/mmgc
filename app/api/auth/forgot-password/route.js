import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// CRITICAL: Change this path to '@/auth' if your auth.js file is in the root src folder!
import { forgotPasswordSchema } from '@/schemas/auth'; 

export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // 1. Validate email using your schema from auth.js
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const { email } = validation.data;

    // 2. Check if the user exists in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User with this email does not exist" }, { status: 404 });
    }

    // 3. Generate a secure, temporary token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiration

    // 4. Update MongoDB directly (bypasses missing password validation checks)
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          resetPasswordToken: resetToken, 
          resetPasswordExpires: resetTokenExpires 
        } 
      }
    );

    // 5. Nodemailer configuration using your exact .env.local variables
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // false for port 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Prevents local firewalls from throwing SSL handshake errors
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"MMGC Healthcare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password - MMGC',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #357DF9; text-align: center;">Password Reset Request</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password for your MMGC Healthcare account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #357DF9; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #777; font-size: 12px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    };

    // 6. Execute transmission
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "Password reset link sent to your email." }, { status: 200 });
  } catch (error) {
    console.error("Forgot Password System Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}