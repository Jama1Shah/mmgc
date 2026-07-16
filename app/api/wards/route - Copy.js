import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import Ward from '@/models/Ward';
import { createWardSchema, updateWardSchema, deleteWardSchema } from '@/schemas/ward';

export async function GET() {
  try {
    await mmgc_db();
    const wards = await Ward.find({}).sort({ name: 1 });
    return NextResponse.json(wards);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Secure body schema validation
    const validation = createWardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { name, specialty, admissionFee, overnightFee } = body;

    if (!name || !specialty) {
      return NextResponse.json({ error: "Ward name and specialty are required" }, { status: 400 });
    }

    // Check for duplicate ward records cleanly
    const existingWard = await Ward.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existingWard) {
      return NextResponse.json({ success: true, data: existingWard }); // Already exists
    }

    const newWard = await Ward.create({ 
      name: name.trim(), 
      specialty: specialty.trim(),
      admissionFee: admissionFee ? Number(admissionFee) : 0,
      overnightFee: overnightFee ? Number(overnightFee) : 0
    });
    return NextResponse.json({ success: true, data: newWard }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Secure body schema validation
    const validation = updateWardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { id, name, specialty, admissionFee, overnightFee } = body;

    if (!id || !name || !specialty) {
      return NextResponse.json({ error: "Ward identifier context, name, and specialty are required" }, { status: 400 });
    }

    const updatedWard = await Ward.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        specialty: specialty.trim(),
        admissionFee: admissionFee ? Number(admissionFee) : 0,
        overnightFee: overnightFee ? Number(overnightFee) : 0
      },
      { new: true }
    );

    if (!updatedWard) {
      return NextResponse.json({ error: "Targeted ward configuration registry record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedWard });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Secure body schema validation
    const validation = deleteWardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Ward collection ID is required for erasure tracking" }, { status: 400 });
    }

    const deletedWard = await Ward.findByIdAndDelete(id);
    if (!deletedWard) {
      return NextResponse.json({ error: "Targeted ward matrix record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Ward tracking configuration wiped cleanly" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}