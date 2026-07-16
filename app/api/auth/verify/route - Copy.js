import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';

export async function GET(req) {
  try {
    await mmgc_db();
    
    // Extract the token parameters from URL
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
    }

    // Find the matching unexpired token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    // Update fields to clear out token space and verify user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Redirect user to the login client view page upon success
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL('/login', baseUrl));
  } catch (error) {
    console.error("Token Verification Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}