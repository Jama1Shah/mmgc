import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { resetPasswordTokenSchema } from '@/schemas/auth'; // Adjust import path to your auth.js

export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // 1. Validate payload (token and newPassword)
    const validation = resetPasswordTokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { token, newPassword } = validation.data;

    // 2. Find matching, unexpired token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // Must be greater than current time
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired password reset token" }, { status: 400 });
    }

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. FIX: Use User.updateOne to modify the database directly.
    // This safely unsets the token fields and updates the password without hitting schema validation errors.
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
      }
    );

    return NextResponse.json({ message: "Password has been successfully reset" }, { status: 200 });
  } catch (error) {
    console.error("Reset Password Token Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}