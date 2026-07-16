import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import LabTest from '@/models/LabTest'; 
import { LabTestPostSchema, LabTestPutSchema, LabTestDeleteSchema } from '@/schemas/labTest';

// Baseline layout tests configured directly with local currency PKR valuation structures
const BASELINE_TESTS = [
  { name: "Basic Metabolic Panel (BMP)", cost: 1200 },
  { name: "Complete Blood Count (CBC)", cost: 800 },
  { name: "Hemoglobin A1C", cost: 1500 },
  { name: "Lipid Panel (Cholesterol)", cost: 1200 },
  { name: "Liver Function Test (LFT)", cost: 1800 },
  { name: "Thyroid Panel (TSH)", cost: 1600 },
  { name: "Urinalysis", cost: 400 },
  { name: "Vitamin D, 25-Hydroxy", cost: 3500 }
];

// 1. GET: FETCH ALL TESTS AS INVOICE-READY ITEMS SORTED A-Z
export async function GET(req) {
  try {
    // Connect to MongoDB cluster pool hook
    await mmgc_db();

    // Fetch custom items, sorting alphabetically by name (1 means ascending A-Z)
    let testsFromDb = await LabTest.find({}).sort({ name: 1 });
    
    // Auto-population: If database collection is empty, store baseline tests permanently in PKR
    if (!testsFromDb || testsFromDb.length === 0) {
      const testsToInsert = BASELINE_TESTS.map(t => ({
        name: t.name,
        baseCost: t.cost
      }));
      
      // Batch save baseline array directly into your MongoDB cluster
      await LabTest.insertMany(testsToInsert);
      
      // Re-fetch the newly stored documents so they are correctly sorted and complete
      testsFromDb = await LabTest.find({}).sort({ name: 1 });
    }
    
    // Format records cleanly to match your frontend Invoice expectations (retaining _id for action handlers)
    return NextResponse.json(testsFromDb.map(t => ({
      _id: t._id.toString(),
      description: t.name,
      cost: t.baseCost
    })));

  } catch (error) {
    console.error("Lab test GET endpoint failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: REGISTER A NEW TEST WITH AN INVOICE BILLING COST
export async function POST(req) {
  try {
    await mmgc_db();
    
    const body = await req.json();

    // Zod validation guard
    const validation = LabTestPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    if (!body.name) {
      return NextResponse.json({ error: "Lab panel name parameter is required" }, { status: 400 });
    }

    const trimmedName = body.name.trim();
    // Default to a flat rate of 1000 PKR if no price matrix parameter is passed
    const testCost = body.cost ? Number(body.cost) : 1000; 

    // Case-Insensitive duplicate match verification utilizing explicit MongoDB regex tracking
    const existing = await LabTest.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return NextResponse.json({ message: "This laboratory panel already exists in database inventory." }, { status: 200 });
    }

    // Commit record update using your model layout properties
    const newTest = await LabTest.create({ 
      name: trimmedName,
      baseCost: testCost 
    });
    
    return NextResponse.json({ success: true, data: newTest }, { status: 201 });
  } catch (error) {
    console.error("Lab test POST endpoint failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PUT: UPDATE EXISTING LAB TEST PARAMETERS AND MATRIX INDEXES
export async function PUT(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Zod validation guard
    const validation = LabTestPutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { id, originalName, name, cost } = body;

    if (!id && !originalName) {
      return NextResponse.json({ error: "Test identifier/name parameter is required" }, { status: 400 });
    }

    const trimmedTargetName = name ? name.trim() : "";
    const updatedCost = cost !== undefined ? Number(cost) : 1000;

    // Locate target document using ID fallback matrix routing
    let targetTest = null;
    if (id) {
      targetTest = await LabTest.findById(id);
    }
    if (!targetTest && originalName) {
      targetTest = await LabTest.findOne({ name: { $regex: new RegExp(`^${originalName.trim()}$`, 'i') } });
    }

    if (!targetTest) {
      return NextResponse.json({ error: "Target laboratory test panel profile not found." }, { status: 404 });
    }

    const previousDocumentName = targetTest.name;

    // Mutate and apply values to the targeted schema properties
    targetTest.name = trimmedTargetName || targetTest.name;
    targetTest.baseCost = updatedCost;
    await targetTest.save();

    return NextResponse.json({ success: true, data: targetTest }, { status: 200 });
  } catch (error) {
    console.error("Lab test PUT endpoint failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE: WIPE TARGETED LAB PANEL CONFIGURATION
export async function DELETE(req) {
  try {
    await mmgc_db();
    const body = await req.json();

    // Zod validation guard
    const validation = LabTestDeleteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Target lab panel tracking title name required" }, { status: 400 });
    }

    const targetDeletionName = name.trim();

    // Purge records cleanly from inventory configurations and cross-synced catalog states
    await LabTest.deleteOne({ name: { $regex: new RegExp(`^${targetDeletionName}$`, 'i') } });

    return NextResponse.json({ success: true, message: "Inventory metrics and sync items wiped." }, { status: 200 });
  } catch (error) {
    console.error("Lab test DELETE endpoint failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}