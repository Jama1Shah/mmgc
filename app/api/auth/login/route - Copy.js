import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/schemas/auth';

export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Security Validation: Ensure credentials conform to requirements before interacting with the database
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message }, 
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Escapes any special regex characters if your user uses email modifiers like user+test@gmail.com
    const safeEmail = email.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    // 1. Find user case-insensitively and explicitly select the password field (since it's hidden by default in your schema)
    const user = await User.findOne({ email: { $regex: new RegExp(`^${safeEmail}$`, 'i') } }).select('+password');

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // 2. Compare the provided password with the hashed password in DB
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // --- NODEMAILER VERIFICATION CHECK ---
    if (!user.isVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before logging in. Check your inbox for the activation link." }, 
        { status: 403 }
      );
    }
    // -------------------------------------

    // 3. Login successful - Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user._doc;

    // --- COOKIE PROVISION FOR ROUTE PROTECTION MIDDLEWARE ---
    const cookieStore = await cookies();
    
    // Uses the MongoDB user ID as the token identifier and pulls the user's role
    const tokenValue = user._id.toString();
    const roleValue = user.role || 'patient'; 

    cookieStore.set('token', tokenValue, { maxAge: 60 * 60 * 24, path: '/' });
    cookieStore.set('role', roleValue, { maxAge: 60 * 60 * 24, path: '/' });
    // -------------------------------------------------------

    return NextResponse.json({
      message: "Login successful",
      user: userWithoutPassword
    }, { status: 200 });

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}