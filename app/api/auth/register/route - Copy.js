import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
// Import the schemas
import { createUserSchema, updateUserSchema, deleteUserSchema, getUserSchema } from '@/schemas/userSchema';

// 1. GET USERS (Combined: Fetch All OR Fetch Specific by Email)
export async function GET(req) {
  try {
    await mmgc_db();

    // Look for ?email=... in the URL
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      // Validate the email query parameter
      const validation = getUserSchema.safeParse(email);
      if (!validation.success) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }

      // Find one specific user by email (for dashboard welcome)
      const user = await User.findOne({ email }).select('-password');
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    // Default: Get all users (for admin tables)
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE NEW USER / RESEND VERIFICATION
export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // --- NODEMAILER TRANSPORTER CONFIGURATION ---
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // MUST BE A GOOGLE APP PASSWORD
      },
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle explicit standalone resend action from the frontend button
    if (body.action === 'resend') {
      const { email } = body;
      if (!email) {
        return NextResponse.json({ error: "Email address is required to resend verification." }, { status: 400 });
      }

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return NextResponse.json({ error: "No account found with this email address." }, { status: 404 });
      }

      if (existingUser.isVerified) {
        return NextResponse.json({ error: "This email address is already verified. Please log in." }, { status: 400 });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      existingUser.verificationToken = verificationToken;
      existingUser.verificationTokenExpires = verificationTokenExpires;
      await existingUser.save();

      const verificationUrl = `${baseUrl}/api/auth/verify?token=${verificationToken}`;
      const mailOptions = {
        from: `"MMGC Healthcare" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email Address - MMGC',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #357DF9; text-align: center;">Welcome to MMGC Healthcare</h2>
            <p>Hello <strong>${existingUser.name}</strong>,</p>
            <p>You requested a new verification link. Please verify your email address to activate your medical profile account by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #357DF9; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #777; font-size: 12px;">This verification link will expire in 24 hours. If you did not create this account, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return NextResponse.json({ message: "A new verification link has been sent to your email inbox!" }, { status: 200 });
    }

    // Validate request body for standard registration
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, role, password, dept, status } = validation.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user exists but is not verified, refresh token and resend verification instead of failing
      if (!existingUser.isVerified) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        existingUser.name = name;
        existingUser.password = hashedPassword;
        existingUser.role = role;
        existingUser.dept = dept;
        existingUser.status = status || 'Active';
        existingUser.verificationToken = verificationToken;
        existingUser.verificationTokenExpires = verificationTokenExpires;
        
        await existingUser.save();

        const verificationUrl = `${baseUrl}/api/auth/verify?token=${verificationToken}`;
        const mailOptions = {
          from: `"MMGC Healthcare" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Verify Your Email Address - MMGC',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <h2 style="color: #357DF9; text-align: center;">Welcome to MMGC Healthcare</h2>
              <p>Hello <strong>${name}</strong>,</p>
              <p>Thank you for registering. Please verify your email address to activate your medical profile account by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #357DF9; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verify Email Address</a>
              </div>
              <p style="color: #777; font-size: 12px;">This verification link will expire in 24 hours. If you did not create this account, please ignore this email.</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ message: "This email was already registered but unverified. A fresh verification link has been successfully resent to your inbox!" }, { status: 200 });
      }

      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- NODEMAILER TOKEN GENERATION ---
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token valid for 24 hours

    const newUser = await User.create({
      name,
      email,
      role,
      password: hashedPassword,
      dept,
      status: status || 'Active',
      fee: role === 'Doctor' ? 2000 : undefined,
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    const verificationUrl = `${baseUrl}/api/auth/verify?token=${verificationToken}`;

    const mailOptions = {
      from: `"MMGC Healthcare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address - MMGC',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #357DF9; text-align: center;">Welcome to MMGC Healthcare</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Thank you for registering. Please verify your email address to active your medical profile account by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #357DF9; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="color: #777; font-size: 12px;">This verification link will expire in 24 hours. If you did not create this account, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    // --------------------------------------------

    const { password: _, ...userWithoutPassword } = newUser._doc;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Registration Mail Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 3. UPDATE USER
export async function PUT(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Validate request body
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id, ...updateData } = validation.data;
    
    if (!updateData.password || updateData.password.trim() === "") {
      delete updateData.password;
    } else {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// 4. DELETE USER
export async function DELETE(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Validate request body
    const validation = deleteUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id } = validation.data;
    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}