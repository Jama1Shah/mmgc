import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
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

// 2. CREATE NEW USER
export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Validate request body
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, role, password, dept, status, isVerified } = validation.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      role,
      password: hashedPassword,
      dept,
      status: status || 'Active',
      fee: role === 'Doctor' ? 2000 : undefined,
      isVerified: isVerified !== undefined ? isVerified : true // Defaults to true when registered by Admin
    });

    const { password: _, ...userWithoutPassword } = newUser._doc;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
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