import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    await mmgc_db();
    const { email, oldPassword, newPassword } = await req.json();

    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    // Explicitly select '+password' because schema disables it by default
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Check if the current old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "The old password you entered is incorrect" }, { status: 400 });
    }

    // Encrypt the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Save update securely bypasses general schema validators for unrelated fields
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    return NextResponse.json({ message: "Password updated successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Change Password System Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}