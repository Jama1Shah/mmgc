import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import User from '@/models/User';
import { getDoctorsSchema, updateDoctorSchema } from '@/schemas/doctor';

// 1. GET: FETCH DOCTORS GROUPED BY SPECIALTY OR AS A DETAILED ADMINISTRATIVE LIST
export async function GET(req) {
  try {
    await mmgc_db();

    // Look for ?list=true in the URL parameters
    const { searchParams } = new URL(req.url);
    const list = searchParams.get('list');

    // Secure query parameters validation
    const queryValidation = getDoctorsSchema.safeParse({ list });
    if (!queryValidation.success) {
      return NextResponse.json({ error: queryValidation.error.errors[0].message }, { status: 400 });
    }

    if (list === 'true') {
      // Fetch all users with role 'Doctor' with complete operational profiles for tables
      const doctorsList = await User.find({ role: 'Doctor' }).select('name email dept status role fee');
      return NextResponse.json(doctorsList);
    }
    
    // Default fallback behavior: Fetch doctors, selecting name and department
    const doctors = await User.find({ role: 'Doctor' }).select('name dept');
    
    // Group doctors by department/specialty
    const specialtyMap = doctors.reduce((acc, doc) => {
      const dept = doc.dept || 'General Medicine';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(doc.name);
      return acc;
    }, {});

    return NextResponse.json(specialtyMap);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. PUT: ADJUST AND SAVE DOCTOR CONSULTATION FEES
export async function PUT(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Secure body payload runtime schema validation
    const validation = updateDoctorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { id, fee, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Doctor configuration user ID is required" }, { status: 400 });
    }

    // Delete immutable frontend fields so MongoDB can update smoothly
    if (updateData._id) delete updateData._id;

    const updatedDoctor = await User.findByIdAndUpdate(
      id, 
      { fee: Number(fee), ...updateData }, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedDoctor) {
      return NextResponse.json({ error: "Doctor profile not found in database registry" }, { status: 404 });
    }
    
    return NextResponse.json(updatedDoctor);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update doctor fee profile structure" }, { status: 500 });
  }
}