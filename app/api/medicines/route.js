import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import Medicine from '@/models/Medicine';
import { medicineSchema } from '@/schemas/medicine';

export async function GET() {
  try {
    await mmgc_db();
    const list = await Medicine.find({}).sort({ name: 1 });
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Safely validate the request body against the Zod schema
    const validation = medicineSchema.safeParse(body);
    
    if (!validation.success) {
      // Returns the custom "Name required" error message if validation fails
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { name } = validation.data;

    const exists = await Medicine.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (exists) return NextResponse.json({ success: true, data: exists });

    const doc = await Medicine.create({ name: name.trim() });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}