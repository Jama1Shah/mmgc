/**
 * ============================================================================
 *  MMGC HEALTHCARE — FULL DEMO/DUMMY DATA SEED SCRIPT (v2 — expanded)
 * ============================================================================
 *  Populates every collection (User, Ward, LabTest, Medicine, Appointment,
 *  Prescription, Invoice) with a large, realistic, cross-linked dataset
 *  covering every status and workflow branch the app supports, so your
 *  viva demo shows a fully "lived-in" hospital instead of an empty database.
 *
 *  WHERE TO PUT THIS FILE
 *  -----------------------
 *  Place this file at:  my-app/scripts/seedDummyData.js
 *  (i.e. right next to your existing scripts/seed.js)
 *
 *  HOW TO RUN IT
 *  -----------------------
 *  From inside the my-app folder, with your .env.local already filled in
 *  (it must contain MONGODB_URI — it uses the exact same connection your
 *  app already uses, so no extra setup is needed):
 *
 *      node --env-file=.env.local scripts/seedDummyData.js
 *
 *  This matches the same convention your existing "seed" script in
 *  package.json already uses for scripts/seed.js.
 *
 *  ============================================================================
 *   ★★★  MAIN SHOWCASE ACCOUNTS — READ THIS BEFORE YOUR VIVA  ★★★
 *  ============================================================================
 *  Every seeded account (every doctor, nurse, lab staff, billing staff, and
 *  patient) uses the SAME password, for convenience during your demo:
 *
 *      11111111
 *
 *  All accounts are created with isVerified: true, so none of them are
 *  blocked by the email-verification gate — you can log straight in.
 *
 *  Out of everything seeded, these SEVEN accounts are the ones worth
 *  actually opening live in front of your examiners — each one was
 *  deliberately given the richest, most representative data for its role,
 *  matching the demo script in your viva prep guide (Section 10):
 *
 *   1. ADMIN            admin@mmgc.com
 *      → Shows: user management, fee/ward/lab-price configuration.
 *
 *   2. DOCTOR            ahsan.tariq@mmgc.com   (Cardiology)
 *      → Shows: an upcoming Scheduled booking, a Lab Completed case ready
 *        to review, a Completed & paid outpatient visit, AND his own ICU
 *        inpatient (Hassan Javed, Day 6) — the busiest, most varied doctor.
 *
 *   3. NURSE             kamran.iqbal@mmgc.com   (ICU)
 *      → Shows: Hassan Javed, admitted 6 days ago in ICU, with vitals
 *        already recorded and medicine marked Administered — a fully
 *        "lived-in" long-stay inpatient case.
 *
 *   4. LAB STAFF         usman.ghani@mmgc.com
 *      → Shows: one Pending lab order awaiting upload (Zainab Riaz) AND
 *        several already-Completed results with real uploaded report
 *        images, so you can demo both the "before" and "after".
 *
 *   5. BILLING STAFF     zeeshan.baig@mmgc.com
 *      → Shows: an itemized Unpaid invoice ready to be marked Paid live
 *        (Ayesha Siddiqui, "Bill Pending") — perfect for demonstrating the
 *        appointment auto-flipping to "Completed" the instant it's paid.
 *
 *   6. PATIENT (rich history)   ali.raza@example.com
 *      → Shows: THREE appointments spanning three different points in
 *        time — an upcoming booking, an old completed & paid visit, and a
 *        cleared lab record — the best single patient account to show off
 *        a full, realistic patient dashboard history.
 *
 *   7. PATIENT (currently admitted)   sara.ahmed@example.com
 *      → Shows: an active Day 0 admission (just admitted today, Maternity
 *        Ward) — good for demonstrating the admission flow and showing the
 *        day-counter starting at 0 before it grows on subsequent days.
 *
 *  Every other seeded account still has full, valid, realistic data behind
 *  it (see the full list printed at the end of this script's run) — these
 *  seven are simply the ones curated to be the most convincing to click
 *  through live in front of a panel.
 * ============================================================================
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Make sure your .env.local file is present and run this with:');
  console.error('   node --env-file=.env.local scripts/seedDummyData.js');
  process.exit(1);
}

const WIPE_BEFORE_SEED = true;
const COLLECTIONS_TO_WIPE = ['users', 'appointments', 'prescriptions', 'invoices', 'wards', 'labtests', 'medicines'];
const DEMO_PASSWORD = '11111111';

// A tiny (66-byte) but genuinely valid 1x1 PNG image, used as a stand-in for
// an "uploaded scan/report image" wherever a lab result file is needed.
const DUMMY_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const dummyImageDataUri = () => `data:image/png;base64,${DUMMY_IMAGE_BASE64}`;

// ----------------------------------------------------------------------------
// Minimal schemas, re-declared locally (matching your real models/ files
// field-for-field) for the same reason your own scripts/seed.js already
// re-declares User locally: the "@/" import alias only resolves inside
// Next.js's own build process, not a plain standalone Node script.
// ----------------------------------------------------------------------------
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Doctor', 'Nurse', 'Lab Staff', 'Billing Staff', 'Patient'], default: 'Patient' },
  dept: { type: String, default: 'General' },
  status: { type: String, default: 'Active' },
  fee: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

const WardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  specialty: { type: String, required: true },
  admissionFee: { type: Number, default: 0 },
  overnightFee: { type: Number, default: 0 }
}, { timestamps: true });

const LabTestSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  baseCost: { type: Number, required: true, default: 1000 }
}, { timestamps: true });

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

const AppointmentSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },
  doctorName: { type: String, required: true },
  specialty: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  reason: { type: String },
  status: { type: String, default: 'Scheduled' },
  billPaid: { type: Boolean, default: false },
  labStatus: { type: String, default: 'None' },
  labNotes: { type: String, default: '' },
  labFileUrl: { type: String, default: null },
  deletedByDoctor: { type: Boolean, default: false },
  deletedByLab: { type: Boolean, default: false },
  clearedFromHistory: { type: Boolean, default: false },
  admissionRequired: { type: Boolean, default: false },
  admissionDays: { type: Number, default: 0 },
  ward: { type: String, default: null },
  wardName: { type: String, default: null },
  assignedWard: { type: String, default: null },
  admissionDetails: {
    wardName: { type: String, default: 'General Bedward' },
    admittedAt: { type: Date, default: null },
    admissionDays: { type: Number, default: 0 }
  }
}, { timestamps: true });

const PrescriptionSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },
  doctorName: { type: String, required: true },
  medicationDetails: { type: String, required: true },
  dateIssued: { type: String, required: true },
  appointmentDate: { type: String },
  appointmentTime: { type: String },
  labPrescription: { type: String, default: null },
  labNotes: { type: String, default: null },
  labFileUrl: { type: String, default: null },
  labStatus: { type: String, default: 'Pending' },
  admissionRequired: { type: Boolean, default: false },
  admissionDetails: {
    wardName: { type: String, default: 'General Bedward' },
    admittedAt: { type: Date, default: null },
    admissionDays: { type: Number, default: 0 }
  },
  vitals: {
    hr: { type: String, default: '80' },
    temp: { type: String, default: '98.6' },
    spo2: { type: String, default: '98' },
    bp: { type: String, default: '120/80' }
  },
  vitalsChecked: { type: Boolean, default: false },
  vitalsCheckedAt: { type: Date, default: null },
  medStatus: { type: String, default: 'Pending' },
  dischargeMedication: { type: String, default: null },
  dischargedAt: { type: Date, default: null },
  deletedByDoctor: { type: Boolean, default: false },
  deletedByPatient: { type: Boolean, default: false }
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: String,
  items: [{ description: String, cost: Number }],
  totalAmount: Number,
  status: { type: String, default: 'Unpaid' },
  method: { type: String, default: 'Cash' },
  date: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Ward = mongoose.models.Ward || mongoose.model('Ward', WardSchema);
const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', LabTestSchema);
const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);
const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', PrescriptionSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

// ----------------------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------------------
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function dateStr(d) {
  return d.toISOString().split('T')[0];
}
function todayPlusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
function hoursAgoTimeStringToday(hoursBack = 4) {
  const d = new Date();
  d.setHours(d.getHours() - hoursBack);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  if (WIPE_BEFORE_SEED) {
    console.log('Wiping existing data in:', COLLECTIONS_TO_WIPE.join(', '));
    for (const name of COLLECTIONS_TO_WIPE) {
      await mongoose.connection.collection(name).deleteMany({}).catch(() => {});
    }
    console.log('Wipe complete.\n');
  }

  // ==========================================================================
  // 1) WARDS
  // ==========================================================================
  console.log('Seeding Wards...');
  const wardDefs = [
    { name: 'General Ward', specialty: 'General Medicine', admissionFee: 3000, overnightFee: 2000 },
    { name: 'ICU', specialty: 'Intensive Care', admissionFee: 8000, overnightFee: 6000 },
    { name: 'Cardiac Care Unit', specialty: 'Cardiology', admissionFee: 7000, overnightFee: 5000 },
    { name: 'Maternity Ward', specialty: 'Gynecology & Obstetrics', admissionFee: 5000, overnightFee: 3000 },
    { name: 'Pediatric Ward', specialty: 'Pediatrics', admissionFee: 4000, overnightFee: 2500 },
    { name: 'Orthopedic Ward', specialty: 'Orthopedics', admissionFee: 4500, overnightFee: 2800 }
  ];
  const wards = await Ward.insertMany(wardDefs);
  const wardByName = Object.fromEntries(wards.map(w => [w.name, w]));
  console.log(`  → ${wards.length} wards created.\n`);

  // ==========================================================================
  // 2) LAB TESTS
  // ==========================================================================
  console.log('Seeding Lab Tests...');
  const labTestDefs = [
    { name: 'Complete Blood Count (CBC)', baseCost: 800 },
    { name: 'Liver Function Test (LFT)', baseCost: 1500 },
    { name: 'Renal Function Test (RFT)', baseCost: 1400 },
    { name: 'Thyroid Stimulating Hormone (TSH)', baseCost: 1800 },
    { name: 'Blood Sugar Fasting (FBS)', baseCost: 500 },
    { name: 'HbA1c', baseCost: 2200 },
    { name: 'Lipid Profile', baseCost: 1900 },
    { name: 'Urine Routine Examination', baseCost: 600 },
    { name: 'Chest X-Ray', baseCost: 2500 },
    { name: 'ECG', baseCost: 1200 },
    { name: 'Dengue NS1/IgM/IgG Panel', baseCost: 3000 },
    { name: 'COVID-19 PCR', baseCost: 3500 },
    { name: 'Echocardiogram', baseCost: 4500 },
    { name: 'MRI - Lumbar Spine', baseCost: 12000 },
    { name: 'Culture & Sensitivity Test', baseCost: 1600 },
    { name: 'Vitamin D3 Level', baseCost: 2800 }
  ];
  const labTests = await LabTest.insertMany(labTestDefs);
  const labTestByName = Object.fromEntries(labTests.map(t => [t.name, t]));
  console.log(`  → ${labTests.length} lab tests created.\n`);

  // ==========================================================================
  // 3) MEDICINES
  // ==========================================================================
  console.log('Seeding Medicines...');
  const medicineNames = [
    'Panadol 500mg', 'Augmentin 625mg', 'Metformin 500mg', 'Amlodipine 5mg',
    'Omeprazole 20mg', 'Ibuprofen 400mg', 'Ceftriaxone 1g Injection', 'Insulin Glargine',
    'Losartan 50mg', 'Azithromycin 500mg', 'Paracetamol IV Infusion', 'Metronidazole 400mg',
    'Domperidone 10mg', 'Cetirizine 10mg', 'Salbutamol Inhaler', 'Furosemide 40mg',
    'Ranitidine 150mg', 'Amoxicillin 500mg', 'Diclofenac Sodium 50mg', 'Vitamin D3 Injection',
    'Betamethasone Cream', 'Xylometazoline Nasal Drops', 'Clarithromycin 500mg', 'Ondansetron 4mg',
    'ORS Sachets', 'Ceftazidime Injection', 'Aspirin 75mg', 'Atorvastatin 40mg', 'Bisoprolol 2.5mg',
    'Ringer\'s Lactate IV Fluid'
  ];
  const medicines = await Medicine.insertMany(medicineNames.map(name => ({ name })));
  console.log(`  → ${medicines.length} medicines created.\n`);

  // ==========================================================================
  // 4) USERS — every role, all sharing DEMO_PASSWORD
  // ==========================================================================
  console.log('Hashing passwords and seeding Users (this may take a few seconds)...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);
  const adminSalt = await bcrypt.genSalt(12);
  const hashedAdminPassword = await bcrypt.hash(DEMO_PASSWORD, adminSalt);

  const userDefs = [
    { name: 'System Admin', email: 'admin@mmgc.com', role: 'Admin', dept: 'Administration', pwHash: hashedAdminPassword },

    // --- Doctors (7, across specialties) ---
    { name: 'Dr. Ahsan Tariq', email: 'ahsan.tariq@mmgc.com', role: 'Doctor', dept: 'Cardiology', fee: 2500 },
    { name: 'Dr. Sana Malik', email: 'sana.malik@mmgc.com', role: 'Doctor', dept: 'General Medicine', fee: 1800 },
    { name: 'Dr. Bilal Hussain', email: 'bilal.hussain@mmgc.com', role: 'Doctor', dept: 'Orthopedics', fee: 2200 },
    { name: 'Dr. Ayesha Khan', email: 'ayesha.khan@mmgc.com', role: 'Doctor', dept: 'Pediatrics', fee: 2000 },
    { name: 'Dr. Farhan Qureshi', email: 'farhan.qureshi@mmgc.com', role: 'Doctor', dept: 'Gynecology & Obstetrics', fee: 2400 },
    { name: 'Dr. Kiran Zafar', email: 'kiran.zafar@mmgc.com', role: 'Doctor', dept: 'Dermatology', fee: 1700 },
    { name: 'Dr. Noman Aslam', email: 'noman.aslam@mmgc.com', role: 'Doctor', dept: 'ENT', fee: 1900 },

    // --- Nurses (3) ---
    { name: 'Nurse Hina Yousaf', email: 'hina.yousaf@mmgc.com', role: 'Nurse', dept: 'General Ward' },
    { name: 'Nurse Kamran Iqbal', email: 'kamran.iqbal@mmgc.com', role: 'Nurse', dept: 'ICU' },
    { name: 'Nurse Rabia Saeed', email: 'rabia.saeed@mmgc.com', role: 'Nurse', dept: 'Cardiac Care Unit' },

    // --- Lab Staff (2) ---
    { name: 'Usman Ghani', email: 'usman.ghani@mmgc.com', role: 'Lab Staff', dept: 'Laboratory' },
    { name: 'Mehwish Anwar', email: 'mehwish.anwar@mmgc.com', role: 'Lab Staff', dept: 'Laboratory' },

    // --- Billing Staff (2) ---
    { name: 'Zeeshan Baig', email: 'zeeshan.baig@mmgc.com', role: 'Billing Staff', dept: 'Billing & Accounts' },
    { name: 'Fatima Noor', email: 'fatima.noor@mmgc.com', role: 'Billing Staff', dept: 'Billing & Accounts' },

    // --- Patients (20) ---
    { name: 'Ali Raza', email: 'ali.raza@example.com', role: 'Patient' },
    { name: 'Sara Ahmed', email: 'sara.ahmed@example.com', role: 'Patient' },
    { name: 'Imran Sheikh', email: 'imran.sheikh@example.com', role: 'Patient' },
    { name: 'Nadia Yousuf', email: 'nadia.yousuf@example.com', role: 'Patient' },
    { name: 'Hassan Javed', email: 'hassan.javed@example.com', role: 'Patient' },
    { name: 'Mariam Fazal', email: 'mariam.fazal@example.com', role: 'Patient' },
    { name: 'Waqas Ahmed', email: 'waqas.ahmed@example.com', role: 'Patient' },
    { name: 'Ayesha Siddiqui', email: 'ayesha.siddiqui@example.com', role: 'Patient' },
    { name: 'Omar Farooq', email: 'omar.farooq@example.com', role: 'Patient' },
    { name: 'Zainab Riaz', email: 'zainab.riaz@example.com', role: 'Patient' },
    { name: 'Bilquis Tariq', email: 'bilquis.tariq@example.com', role: 'Patient' },
    { name: 'Hamza Latif', email: 'hamza.latif@example.com', role: 'Patient' },
    { name: 'Adeel Shah', email: 'adeel.shah@example.com', role: 'Patient' },
    { name: 'Rukhsana Bibi', email: 'rukhsana.bibi@example.com', role: 'Patient' },
    { name: 'Talha Mumtaz', email: 'talha.mumtaz@example.com', role: 'Patient' },
    { name: 'Sadia Kanwal', email: 'sadia.kanwal@example.com', role: 'Patient' },
    { name: 'Faizan Ul Haq', email: 'faizan.ulhaq@example.com', role: 'Patient' },
    { name: 'Mehak Rauf', email: 'mehak.rauf@example.com', role: 'Patient' },
    { name: 'Junaid Akram', email: 'junaid.akram@example.com', role: 'Patient' },
    { name: 'Iqra Yasmin', email: 'iqra.yasmin@example.com', role: 'Patient' }
  ];

  const usersToInsert = userDefs.map(u => ({
    name: u.name,
    email: u.email,
    password: u.pwHash || hashedPassword,
    role: u.role,
    dept: u.dept || 'General',
    status: 'Active',
    fee: u.fee || 0,
    isVerified: true,
    createdAt: daysAgo(Math.floor(Math.random() * 150) + 10)
  }));
  const users = await User.insertMany(usersToInsert);
  const byEmail = Object.fromEntries(users.map(u => [u.email, u]));

  const doctors = users.filter(u => u.role === 'Doctor');
  const patients = users.filter(u => u.role === 'Patient');
  console.log(`  → ${users.length} users created (1 Admin, ${doctors.length} Doctors, 3 Nurses, 2 Lab Staff, 2 Billing Staff, ${patients.length} Patients).\n`);

  const drAhsan = byEmail['ahsan.tariq@mmgc.com'];
  const drSana = byEmail['sana.malik@mmgc.com'];
  const drBilal = byEmail['bilal.hussain@mmgc.com'];
  const drAyesha = byEmail['ayesha.khan@mmgc.com'];
  const drFarhan = byEmail['farhan.qureshi@mmgc.com'];
  const drKiran = byEmail['kiran.zafar@mmgc.com'];
  const drNoman = byEmail['noman.aslam@mmgc.com'];

  // ==========================================================================
  // 5) APPOINTMENTS — every status/scenario, doubled up for volume
  // ==========================================================================
  console.log('Seeding Appointments across every status/scenario...');

  const apptDefs = [];

  // --- Batch 1 (original core scenarios) ---
  apptDefs.push({
    key: 'scheduled_future',
    patientName: 'Ali Raza', patientEmail: 'ali.raza@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: todayPlusDays(3), time: '10:00 AM',
    reason: 'Recurring chest tightness and shortness of breath on exertion.',
    status: 'Scheduled'
  });

  apptDefs.push({
    key: 'auto_reschedule_demo',
    patientName: 'Sara Ahmed', patientEmail: 'sara.ahmed@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(new Date()), time: hoursAgoTimeStringToday(4),
    reason: 'Persistent mild fever and body ache for 3 days.',
    status: 'Scheduled'
  });

  apptDefs.push({
    key: 'rescheduled_explicit',
    patientName: 'Imran Sheikh', patientEmail: 'imran.sheikh@example.com',
    doctorName: drBilal.name, specialty: drBilal.dept,
    date: dateStr(daysAgo(2)), time: '09:30 AM',
    reason: 'Follow-up for lower back pain after physiotherapy sessions.',
    status: 'Rescheduled'
  });

  apptDefs.push({
    key: 'accepted',
    patientName: 'Nadia Yousuf', patientEmail: 'nadia.yousuf@example.com',
    doctorName: drAyesha.name, specialty: drAyesha.dept,
    date: dateStr(new Date()), time: '03:00 PM',
    reason: "Child's routine growth checkup and vaccination review.",
    status: 'Accepted'
  });

  apptDefs.push({
    key: 'rejected',
    patientName: 'Hassan Javed', patientEmail: 'hassan.javed@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: dateStr(daysAgo(1)), time: '11:00 AM',
    reason: 'General consultation request — outside doctor\'s available slot.',
    status: 'Rejected'
  });

  apptDefs.push({
    key: 'cancelled',
    patientName: 'Mariam Fazal', patientEmail: 'mariam.fazal@example.com',
    doctorName: drFarhan.name, specialty: drFarhan.dept,
    date: dateStr(daysAgo(4)), time: '01:00 PM',
    reason: 'Routine prenatal checkup.',
    status: 'Cancelled'
  });

  apptDefs.push({
    key: 'prescribed_fresh',
    patientName: 'Waqas Ahmed', patientEmail: 'waqas.ahmed@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(daysAgo(0)), time: '09:00 AM',
    reason: 'Seasonal flu symptoms — sore throat, mild fever, headache.',
    status: 'Prescribed'
  });

  apptDefs.push({
    key: 'bill_pending',
    patientName: 'Ayesha Siddiqui', patientEmail: 'ayesha.siddiqui@example.com',
    doctorName: drBilal.name, specialty: drBilal.dept,
    date: dateStr(daysAgo(3)), time: '02:00 PM',
    reason: 'Mild sprain in right ankle after a fall.',
    status: 'Bill Pending'
  });

  apptDefs.push({
    key: 'completed_outpatient',
    patientName: 'Omar Farooq', patientEmail: 'omar.farooq@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: dateStr(daysAgo(6)), time: '10:30 AM',
    reason: 'Routine hypertension follow-up and medication review.',
    status: 'Completed', billPaid: true
  });

  apptDefs.push({
    key: 'lab_ordered_pending',
    patientName: 'Zainab Riaz', patientEmail: 'zainab.riaz@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(daysAgo(1)), time: '11:30 AM',
    reason: 'Fatigue and unexplained weight loss — labs ordered to investigate.',
    status: 'Lab Test Ordered',
    labStatus: 'Pending'
  });

  apptDefs.push({
    key: 'lab_completed',
    patientName: 'Bilquis Tariq', patientEmail: 'bilquis.tariq@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: dateStr(daysAgo(2)), time: '04:00 PM',
    reason: 'Irregular heartbeat episodes — ECG and lipid profile ordered.',
    status: 'Lab Completed',
    labStatus: 'Completed',
    labNotes: 'ECG shows mild sinus tachycardia. Lipid profile within acceptable range. Recommend follow-up in 2 weeks.',
    labFileUrl: dummyImageDataUri()
  });

  apptDefs.push({
    key: 'soft_deleted_by_doctor',
    patientName: 'Hamza Latif', patientEmail: 'hamza.latif@example.com',
    doctorName: drBilal.name, specialty: drBilal.dept,
    date: dateStr(daysAgo(10)), time: '09:00 AM',
    reason: 'Mild wrist pain after minor fall, resolved with rest.',
    status: 'Prescribed',
    deletedByDoctor: true
  });

  apptDefs.push({
    key: 'lab_cleared_from_history',
    patientName: 'Ali Raza', patientEmail: 'ali.raza@example.com',
    doctorName: drAyesha.name, specialty: drAyesha.dept,
    date: dateStr(daysAgo(15)), time: '10:00 AM',
    reason: 'Routine blood work for annual pediatric checkup.',
    status: 'Lab Completed',
    labStatus: 'Completed',
    labNotes: 'CBC and blood sugar fasting both within normal range.',
    labFileUrl: dummyImageDataUri(),
    deletedByLab: true,
    clearedFromHistory: true
  });

  apptDefs.push({
    key: 'admitted_day0',
    patientName: 'Sara Ahmed', patientEmail: 'sara.ahmed@example.com',
    doctorName: drFarhan.name, specialty: drFarhan.dept,
    date: dateStr(daysAgo(0)), time: '08:00 AM',
    reason: 'Admitted for observation — early labor signs.',
    status: 'Admitted',
    admissionRequired: true,
    ward: 'Maternity Ward', wardName: 'Maternity Ward', assignedWard: 'Maternity Ward',
    admissionDays: 0,
    admissionDetails: { wardName: 'Maternity Ward', admittedAt: daysAgo(0), admissionDays: 0 }
  });

  apptDefs.push({
    key: 'admitted_day3',
    patientName: 'Imran Sheikh', patientEmail: 'imran.sheikh@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(daysAgo(3)), time: '09:00 AM',
    reason: 'Admitted for dengue fever monitoring and IV fluids.',
    status: 'Admitted',
    admissionRequired: true,
    ward: 'General Ward', wardName: 'General Ward', assignedWard: 'General Ward',
    admissionDays: 3,
    admissionDetails: { wardName: 'General Ward', admittedAt: daysAgo(3), admissionDays: 3 },
    labStatus: 'Completed',
    labNotes: 'Dengue NS1 positive. Platelet count being monitored daily.',
    labFileUrl: dummyImageDataUri()
  });

  apptDefs.push({
    key: 'admitted_day6_icu',
    patientName: 'Hassan Javed', patientEmail: 'hassan.javed@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: dateStr(daysAgo(6)), time: '07:00 AM',
    reason: 'Admitted to ICU following a mild cardiac event for close monitoring.',
    status: 'Admitted',
    admissionRequired: true,
    ward: 'ICU', wardName: 'ICU', assignedWard: 'ICU',
    admissionDays: 6,
    admissionDetails: { wardName: 'ICU', admittedAt: daysAgo(6), admissionDays: 6 }
  });

  apptDefs.push({
    key: 'discharged_completed',
    patientName: 'Mariam Fazal', patientEmail: 'mariam.fazal@example.com',
    doctorName: drBilal.name, specialty: drBilal.dept,
    date: dateStr(daysAgo(9)), time: '08:30 AM',
    reason: 'Admitted for fracture surgery and post-operative recovery.',
    status: 'Completed', billPaid: true,
    admissionRequired: true,
    ward: 'Orthopedic Ward', wardName: 'Orthopedic Ward', assignedWard: 'Orthopedic Ward',
    admissionDays: 5,
    admissionDetails: { wardName: 'Orthopedic Ward', admittedAt: daysAgo(9), admissionDays: 5 },
    labStatus: 'Completed',
    labNotes: 'Pre-operative CBC and X-Ray confirmed clean fracture, no complications.',
    labFileUrl: dummyImageDataUri()
  });

  // --- Batch 2 (new — added for volume + new doctors/wards/patients) ---

  apptDefs.push({
    key: 'scheduled_future2',
    patientName: 'Adeel Shah', patientEmail: 'adeel.shah@example.com',
    doctorName: drKiran.name, specialty: drKiran.dept,
    date: todayPlusDays(2), time: '01:30 PM',
    reason: 'Persistent skin rash on forearms, worsening over 2 weeks.',
    status: 'Scheduled'
  });

  apptDefs.push({
    key: 'accepted2',
    patientName: 'Rukhsana Bibi', patientEmail: 'rukhsana.bibi@example.com',
    doctorName: drNoman.name, specialty: drNoman.dept,
    date: dateStr(new Date()), time: '05:00 PM',
    reason: 'Right ear pain and reduced hearing for 4 days.',
    status: 'Accepted'
  });

  apptDefs.push({
    key: 'rejected2',
    patientName: 'Talha Mumtaz', patientEmail: 'talha.mumtaz@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(daysAgo(1)), time: '12:00 PM',
    reason: 'Walk-in request outside doctor\'s scheduled availability.',
    status: 'Rejected'
  });

  apptDefs.push({
    key: 'cancelled2',
    patientName: 'Sadia Kanwal', patientEmail: 'sadia.kanwal@example.com',
    doctorName: drFarhan.name, specialty: drFarhan.dept,
    date: dateStr(daysAgo(5)), time: '10:00 AM',
    reason: 'Routine gynecological consultation.',
    status: 'Cancelled'
  });

  apptDefs.push({
    key: 'rescheduled_explicit2',
    patientName: 'Mehak Rauf', patientEmail: 'mehak.rauf@example.com',
    doctorName: drNoman.name, specialty: drNoman.dept,
    date: dateStr(daysAgo(1)), time: '02:30 PM',
    reason: 'Follow-up for chronic sinus congestion.',
    status: 'Rescheduled'
  });

  apptDefs.push({
    key: 'prescribed_fresh2',
    patientName: 'Faizan Ul Haq', patientEmail: 'faizan.ulhaq@example.com',
    doctorName: drKiran.name, specialty: drKiran.dept,
    date: dateStr(daysAgo(0)), time: '11:00 AM',
    reason: 'Eczema flare-up on hands with visible dryness and cracking.',
    status: 'Prescribed'
  });

  apptDefs.push({
    key: 'bill_pending2',
    patientName: 'Mehak Rauf', patientEmail: 'mehak.rauf@example.com',
    doctorName: drNoman.name, specialty: drNoman.dept,
    date: dateStr(daysAgo(2)), time: '03:30 PM',
    reason: 'Acute sinus infection with facial pain and nasal congestion.',
    status: 'Bill Pending'
  });

  apptDefs.push({
    key: 'completed_outpatient2',
    patientName: 'Junaid Akram', patientEmail: 'junaid.akram@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(daysAgo(8)), time: '09:30 AM',
    reason: 'Type 2 diabetes routine follow-up and HbA1c review.',
    status: 'Completed', billPaid: true
  });

  apptDefs.push({
    key: 'lab_ordered_pending2',
    patientName: 'Iqra Yasmin', patientEmail: 'iqra.yasmin@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: dateStr(daysAgo(1)), time: '04:30 PM',
    reason: 'Occasional palpitations and dizziness — cardiac workup ordered.',
    status: 'Lab Test Ordered',
    labStatus: 'Pending'
  });

  apptDefs.push({
    key: 'lab_completed2',
    patientName: 'Adeel Shah', patientEmail: 'adeel.shah@example.com',
    doctorName: drBilal.name, specialty: drBilal.dept,
    date: dateStr(daysAgo(5)), time: '10:15 AM',
    reason: 'Wrist pain and swelling after a fall — X-ray ordered.',
    status: 'Lab Completed',
    labStatus: 'Completed',
    labNotes: 'X-Ray shows no fracture, mild soft tissue swelling only. Conservative management advised.',
    labFileUrl: dummyImageDataUri()
  });

  apptDefs.push({
    key: 'admitted_day1',
    patientName: 'Rukhsana Bibi', patientEmail: 'rukhsana.bibi@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(daysAgo(1)), time: '06:00 PM',
    reason: 'Admitted for severe gastroenteritis and dehydration.',
    status: 'Admitted',
    admissionRequired: true,
    ward: 'General Ward', wardName: 'General Ward', assignedWard: 'General Ward',
    admissionDays: 1,
    admissionDetails: { wardName: 'General Ward', admittedAt: daysAgo(1), admissionDays: 1 }
  });

  apptDefs.push({
    key: 'admitted_day2',
    patientName: 'Talha Mumtaz', patientEmail: 'talha.mumtaz@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: dateStr(daysAgo(2)), time: '07:30 AM',
    reason: 'Admitted for observation following elective angioplasty.',
    status: 'Admitted',
    admissionRequired: true,
    ward: 'Cardiac Care Unit', wardName: 'Cardiac Care Unit', assignedWard: 'Cardiac Care Unit',
    admissionDays: 2,
    admissionDetails: { wardName: 'Cardiac Care Unit', admittedAt: daysAgo(2), admissionDays: 2 },
    labStatus: 'Completed',
    labNotes: 'Post-procedure ECG and troponin levels stable.',
    labFileUrl: dummyImageDataUri()
  });

  apptDefs.push({
    key: 'admitted_day10',
    patientName: 'Sadia Kanwal', patientEmail: 'sadia.kanwal@example.com',
    doctorName: drSana.name, specialty: drSana.dept,
    date: dateStr(daysAgo(10)), time: '06:30 AM',
    reason: 'Admitted to ICU for severe community-acquired pneumonia.',
    status: 'Admitted',
    admissionRequired: true,
    ward: 'ICU', wardName: 'ICU', assignedWard: 'ICU',
    admissionDays: 10,
    admissionDetails: { wardName: 'ICU', admittedAt: daysAgo(10), admissionDays: 10 },
    labStatus: 'Completed',
    labNotes: 'Chest X-ray shows resolving right lower lobe consolidation. Culture sensitivity guiding antibiotic choice.',
    labFileUrl: dummyImageDataUri()
  });

  apptDefs.push({
    key: 'discharged_completed2',
    patientName: 'Faizan Ul Haq', patientEmail: 'faizan.ulhaq@example.com',
    doctorName: drAyesha.name, specialty: drAyesha.dept,
    date: dateStr(daysAgo(7)), time: '08:00 AM',
    reason: 'Admitted for severe dehydration due to viral gastroenteritis.',
    status: 'Completed', billPaid: true,
    admissionRequired: true,
    ward: 'Pediatric Ward', wardName: 'Pediatric Ward', assignedWard: 'Pediatric Ward',
    admissionDays: 3,
    admissionDetails: { wardName: 'Pediatric Ward', admittedAt: daysAgo(7), admissionDays: 3 },
    labStatus: 'Completed',
    labNotes: 'Electrolyte panel normalized after IV rehydration therapy.',
    labFileUrl: dummyImageDataUri()
  });

  apptDefs.push({
    key: 'ali_raza_completed_history',
    patientName: 'Ali Raza', patientEmail: 'ali.raza@example.com',
    doctorName: drAhsan.name, specialty: drAhsan.dept,
    date: dateStr(daysAgo(30)), time: '09:00 AM',
    reason: 'Initial cardiology consultation for occasional chest discomfort.',
    status: 'Completed', billPaid: true
  });

  const insertedAppts = await Appointment.insertMany(apptDefs.map(({ key, ...rest }) => rest));
  const apptByKey = {};
  insertedAppts.forEach((doc, i) => { apptByKey[apptDefs[i].key] = doc; });
  console.log(`  → ${insertedAppts.length} appointments created, covering every status.\n`);

  // ==========================================================================
  // 6) PRESCRIPTIONS
  // ==========================================================================
  console.log('Seeding Prescriptions...');
  const prescriptionDefs = [];

  function baseFromAppt(key, overrides = {}) {
    const a = apptByKey[key];
    return {
      appointmentId: a._id,
      patientName: a.patientName,
      patientEmail: a.patientEmail,
      doctorName: a.doctorName,
      dateIssued: dateStr(new Date(a.createdAt || new Date())),
      appointmentDate: a.date,
      appointmentTime: a.time,
      ...overrides
    };
  }

  prescriptionDefs.push(baseFromAppt('prescribed_fresh', {
    medicationDetails: 'Panadol 500mg - 1 tablet every 6 hours for 3 days\nAzithromycin 500mg - 1 tablet once daily for 5 days\nPlenty of fluids and rest advised.',
  }));

  prescriptionDefs.push(baseFromAppt('bill_pending', {
    medicationDetails: 'Diclofenac Sodium 50mg - 1 tablet twice daily for 5 days\nIce compress 15 minutes, 3 times daily\nAvoid weight-bearing activity for 1 week.',
  }));

  prescriptionDefs.push(baseFromAppt('completed_outpatient', {
    medicationDetails: 'Amlodipine 5mg - 1 tablet once daily, ongoing\nLosartan 50mg - 1 tablet once daily, ongoing\nFollow-up in 4 weeks with blood pressure log.',
  }));

  prescriptionDefs.push(baseFromAppt('lab_ordered_pending', {
    medicationDetails: 'Pending lab results before medication is finalized.',
    labPrescription: 'Complete Blood Count (CBC), Thyroid Stimulating Hormone (TSH), HbA1c',
    labStatus: 'Pending'
  }));

  prescriptionDefs.push(baseFromAppt('lab_completed', {
    medicationDetails: 'Bisoprolol 2.5mg - 1 tablet once daily, ongoing, pending cardiology follow-up.',
    labPrescription: 'ECG, Lipid Profile',
    labStatus: 'Completed',
    labNotes: 'ECG shows mild sinus tachycardia. Lipid profile within acceptable range.',
    labFileUrl: dummyImageDataUri()
  }));

  prescriptionDefs.push(baseFromAppt('soft_deleted_by_doctor', {
    medicationDetails: 'Ibuprofen 400mg - 1 tablet as needed for pain, max 3 per day for 3 days.',
    deletedByDoctor: true
  }));

  prescriptionDefs.push(baseFromAppt('lab_cleared_from_history', {
    medicationDetails: 'No medication required — routine checkup results normal.',
    labPrescription: 'Complete Blood Count (CBC), Blood Sugar Fasting (FBS)',
    labStatus: 'Completed',
    labNotes: 'CBC and blood sugar fasting both within normal range.',
    labFileUrl: dummyImageDataUri()
  }));

  prescriptionDefs.push(baseFromAppt('admitted_day0', {
    medicationDetails: 'IV fluids (Normal Saline) - continuous infusion\nParacetamol IV Infusion - as needed for pain, max 3 times daily\nMonitor for further labor progression.',
    admissionRequired: true,
    admissionDetails: { wardName: 'Maternity Ward', admittedAt: apptByKey.admitted_day0.admissionDetails.admittedAt, admissionDays: 0 },
    medStatus: 'Pending'
  }));

  prescriptionDefs.push(baseFromAppt('admitted_day3', {
    medicationDetails: 'IV fluids (Ringer\'s Lactate) - continuous infusion\nParacetamol IV Infusion - every 6 hours\nDaily platelet count monitoring ordered.',
    admissionRequired: true,
    admissionDetails: { wardName: 'General Ward', admittedAt: apptByKey.admitted_day3.admissionDetails.admittedAt, admissionDays: 3 },
    vitals: { hr: '92', temp: '99.8', spo2: '97', bp: '110/70' },
    vitalsChecked: true,
    vitalsCheckedAt: daysAgo(0),
    medStatus: 'Administered',
    labPrescription: 'Dengue NS1/IgM/IgG Panel, Complete Blood Count (CBC)',
    labStatus: 'Completed',
    labNotes: 'Dengue NS1 positive. Platelet count being monitored daily.',
    labFileUrl: dummyImageDataUri()
  }));

  prescriptionDefs.push(baseFromAppt('admitted_day6_icu', {
    medicationDetails: 'Aspirin 75mg - 1 tablet once daily\nAtorvastatin 40mg - 1 tablet once nightly\nContinuous cardiac monitoring, oxygen support as needed.',
    admissionRequired: true,
    admissionDetails: { wardName: 'ICU', admittedAt: apptByKey.admitted_day6_icu.admissionDetails.admittedAt, admissionDays: 6 },
    vitals: { hr: '88', temp: '98.4', spo2: '95', bp: '135/85' },
    vitalsChecked: true,
    vitalsCheckedAt: daysAgo(0),
    medStatus: 'Administered'
  }));

  prescriptionDefs.push(baseFromAppt('discharged_completed', {
    medicationDetails: 'Ceftriaxone 1g Injection - twice daily during admission\nDiclofenac Sodium 50mg - twice daily during admission\nPhysiotherapy sessions daily during recovery.',
    admissionRequired: true,
    admissionDetails: { wardName: 'Orthopedic Ward', admittedAt: apptByKey.discharged_completed.admissionDetails.admittedAt, admissionDays: 5 },
    vitals: { hr: '76', temp: '98.6', spo2: '99', bp: '118/76' },
    vitalsChecked: true,
    vitalsCheckedAt: daysAgo(5),
    medStatus: 'Administered',
    labPrescription: 'Chest X-Ray, Complete Blood Count (CBC)',
    labStatus: 'Completed',
    labNotes: 'Pre-operative CBC and X-Ray confirmed clean fracture, no complications.',
    labFileUrl: dummyImageDataUri(),
    dischargeMedication: 'Amoxicillin 500mg - 3 times daily for 5 days\nDiclofenac Sodium 50mg - twice daily for 5 days\nFollow-up in orthopedic clinic after 2 weeks, physiotherapy to continue at home.',
    dischargedAt: daysAgo(4)
  }));

  // --- Batch 2 prescriptions ---

  prescriptionDefs.push(baseFromAppt('prescribed_fresh2', {
    medicationDetails: 'Betamethasone Cream - apply thin layer twice daily for 10 days\nCetirizine 10mg - 1 tablet once daily for 5 days\nAvoid harsh soaps and prolonged water exposure.',
  }));

  prescriptionDefs.push(baseFromAppt('bill_pending2', {
    medicationDetails: 'Clarithromycin 500mg - 1 tablet twice daily for 7 days\nXylometazoline Nasal Drops - 2 drops each nostril twice daily for 5 days\nSteam inhalation twice daily.',
  }));

  prescriptionDefs.push(baseFromAppt('completed_outpatient2', {
    medicationDetails: 'Metformin 500mg - 1 tablet twice daily, ongoing\nInsulin Glargine - as per sliding scale, ongoing\nDiet and exercise counseling provided.',
  }));

  prescriptionDefs.push(baseFromAppt('lab_ordered_pending2', {
    medicationDetails: 'Pending lab and cardiac workup results before medication is finalized.',
    labPrescription: 'ECG, Echocardiogram, Thyroid Stimulating Hormone (TSH)',
    labStatus: 'Pending'
  }));

  prescriptionDefs.push(baseFromAppt('lab_completed2', {
    medicationDetails: 'Ibuprofen 400mg - 1 tablet twice daily for 5 days\nWrist support brace advised for 2 weeks.',
    labPrescription: 'Chest X-Ray',
    labStatus: 'Completed',
    labNotes: 'X-Ray shows no fracture, mild soft tissue swelling only. Conservative management advised.',
    labFileUrl: dummyImageDataUri()
  }));

  prescriptionDefs.push(baseFromAppt('admitted_day1', {
    medicationDetails: 'ORS Sachets - 1 sachet after every loose stool\nOndansetron 4mg - as needed for nausea, max 3 times daily\nIV fluids (Ringer\'s Lactate) - continuous infusion for rehydration.',
    admissionRequired: true,
    admissionDetails: { wardName: 'General Ward', admittedAt: apptByKey.admitted_day1.admissionDetails.admittedAt, admissionDays: 1 },
    vitals: { hr: '98', temp: '100.2', spo2: '97', bp: '105/68' },
    vitalsChecked: true,
    vitalsCheckedAt: daysAgo(0),
    medStatus: 'Administered'
  }));

  prescriptionDefs.push(baseFromAppt('admitted_day2', {
    medicationDetails: 'Aspirin 75mg - 1 tablet once daily\nClopidogrel 75mg - 1 tablet once daily\nContinuous cardiac monitoring post-angioplasty.',
    admissionRequired: true,
    admissionDetails: { wardName: 'Cardiac Care Unit', admittedAt: apptByKey.admitted_day2.admissionDetails.admittedAt, admissionDays: 2 },
    vitals: { hr: '80', temp: '98.2', spo2: '98', bp: '122/78' },
    vitalsChecked: true,
    vitalsCheckedAt: daysAgo(0),
    medStatus: 'Administered',
    labPrescription: 'ECG',
    labStatus: 'Completed',
    labNotes: 'Post-procedure ECG and troponin levels stable.',
    labFileUrl: dummyImageDataUri()
  }));

  prescriptionDefs.push(baseFromAppt('admitted_day10', {
    medicationDetails: 'Ceftazidime Injection - 3 times daily via IV\nSalbutamol Inhaler - 2 puffs every 6 hours as needed\nOxygen support via nasal cannula, continuous monitoring.',
    admissionRequired: true,
    admissionDetails: { wardName: 'ICU', admittedAt: apptByKey.admitted_day10.admissionDetails.admittedAt, admissionDays: 10 },
    vitals: { hr: '102', temp: '100.9', spo2: '92', bp: '128/82' },
    vitalsChecked: true,
    vitalsCheckedAt: daysAgo(0),
    medStatus: 'Administered',
    labPrescription: 'Chest X-Ray, Culture & Sensitivity Test',
    labStatus: 'Completed',
    labNotes: 'Chest X-ray shows resolving right lower lobe consolidation. Culture sensitivity guiding antibiotic choice.',
    labFileUrl: dummyImageDataUri()
  }));

  prescriptionDefs.push(baseFromAppt('discharged_completed2', {
    medicationDetails: 'IV fluids (Ringer\'s Lactate) - continuous infusion during admission\nORS Sachets - as tolerated during recovery\nOndansetron 4mg - as needed for nausea during admission.',
    admissionRequired: true,
    admissionDetails: { wardName: 'Pediatric Ward', admittedAt: apptByKey.discharged_completed2.admissionDetails.admittedAt, admissionDays: 3 },
    vitals: { hr: '110', temp: '99.1', spo2: '98', bp: '95/60' },
    vitalsChecked: true,
    vitalsCheckedAt: daysAgo(6),
    medStatus: 'Administered',
    labPrescription: 'Urine Routine Examination, Complete Blood Count (CBC)',
    labStatus: 'Completed',
    labNotes: 'Electrolyte panel normalized after IV rehydration therapy.',
    labFileUrl: dummyImageDataUri(),
    dischargeMedication: 'ORS Sachets - continue at home for 3 more days\nDomperidone 10mg - as needed for nausea, max 3 times daily\nFollow-up with pediatrician in 1 week if symptoms recur.',
    dischargedAt: daysAgo(4)
  }));

  prescriptionDefs.push(baseFromAppt('ali_raza_completed_history', {
    medicationDetails: 'Aspirin 75mg - 1 tablet once daily, ongoing\nAdvised lifestyle modification and follow-up ECG in 6 months.',
  }));

  const insertedPrescriptions = await Prescription.insertMany(prescriptionDefs);
  console.log(`  → ${insertedPrescriptions.length} prescriptions created and linked to their appointments.\n`);

  // ==========================================================================
  // 7) INVOICES
  // ==========================================================================
  console.log('Seeding Invoices...');
  const invoiceDefs = [];

  function invoiceFor(key, items, status, method) {
    const a = apptByKey[key];
    const patient = byEmail[a.patientEmail];
    const total = items.reduce((sum, i) => sum + i.cost, 0);
    return {
      appointmentId: a._id,
      patientId: patient._id,
      patientName: a.patientName,
      items,
      totalAmount: total,
      status,
      method,
      date: status === 'Paid' ? daysAgo(1) : new Date()
    };
  }

  invoiceDefs.push(invoiceFor('bill_pending', [
    { description: `Consultation - ${apptByKey.bill_pending.doctorName}`, cost: drBilal.fee }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('completed_outpatient', [
    { description: `Consultation - ${apptByKey.completed_outpatient.doctorName}`, cost: drAhsan.fee }
  ], 'Paid', 'Card'));

  invoiceDefs.push(invoiceFor('lab_completed', [
    { description: `Consultation - ${apptByKey.lab_completed.doctorName}`, cost: drAhsan.fee },
    { description: 'Lab Test - ECG', cost: labTestByName['ECG'].baseCost },
    { description: 'Lab Test - Lipid Profile', cost: labTestByName['Lipid Profile'].baseCost }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('admitted_day0', [
    { description: `Consultation - ${apptByKey.admitted_day0.doctorName}`, cost: drFarhan.fee },
    { description: 'Ward Admission - Maternity Ward', cost: wardByName['Maternity Ward'].admissionFee },
    { description: 'Ward Overnight Charges (0 nights)', cost: 0 }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('admitted_day3', [
    { description: `Consultation - ${apptByKey.admitted_day3.doctorName}`, cost: drSana.fee },
    { description: 'Lab Test - Dengue NS1/IgM/IgG Panel', cost: labTestByName['Dengue NS1/IgM/IgG Panel'].baseCost },
    { description: 'Lab Test - Complete Blood Count (CBC)', cost: labTestByName['Complete Blood Count (CBC)'].baseCost },
    { description: 'Ward Admission - General Ward', cost: wardByName['General Ward'].admissionFee },
    { description: 'Ward Overnight Charges (3 nights)', cost: wardByName['General Ward'].overnightFee * 3 }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('admitted_day6_icu', [
    { description: `Consultation - ${apptByKey.admitted_day6_icu.doctorName}`, cost: drAhsan.fee },
    { description: 'Ward Admission - ICU', cost: wardByName['ICU'].admissionFee },
    { description: 'Ward Overnight Charges (6 nights)', cost: wardByName['ICU'].overnightFee * 6 }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('discharged_completed', [
    { description: `Consultation - ${apptByKey.discharged_completed.doctorName}`, cost: drBilal.fee },
    { description: 'Lab Test - Chest X-Ray', cost: labTestByName['Chest X-Ray'].baseCost },
    { description: 'Lab Test - Complete Blood Count (CBC)', cost: labTestByName['Complete Blood Count (CBC)'].baseCost },
    { description: 'Ward Admission - Orthopedic Ward', cost: wardByName['Orthopedic Ward'].admissionFee },
    { description: 'Ward Overnight Charges (5 nights)', cost: wardByName['Orthopedic Ward'].overnightFee * 5 }
  ], 'Paid', 'Card'));

  // --- Batch 2 invoices ---

  invoiceDefs.push(invoiceFor('bill_pending2', [
    { description: `Consultation - ${apptByKey.bill_pending2.doctorName}`, cost: drNoman.fee }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('completed_outpatient2', [
    { description: `Consultation - ${apptByKey.completed_outpatient2.doctorName}`, cost: drSana.fee }
  ], 'Paid', 'Card'));

  invoiceDefs.push(invoiceFor('lab_completed2', [
    { description: `Consultation - ${apptByKey.lab_completed2.doctorName}`, cost: drBilal.fee },
    { description: 'Lab Test - Chest X-Ray', cost: labTestByName['Chest X-Ray'].baseCost }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('admitted_day1', [
    { description: `Consultation - ${apptByKey.admitted_day1.doctorName}`, cost: drSana.fee },
    { description: 'Ward Admission - General Ward', cost: wardByName['General Ward'].admissionFee },
    { description: 'Ward Overnight Charges (1 night)', cost: wardByName['General Ward'].overnightFee * 1 }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('admitted_day2', [
    { description: `Consultation - ${apptByKey.admitted_day2.doctorName}`, cost: drAhsan.fee },
    { description: 'Lab Test - ECG', cost: labTestByName['ECG'].baseCost },
    { description: 'Ward Admission - Cardiac Care Unit', cost: wardByName['Cardiac Care Unit'].admissionFee },
    { description: 'Ward Overnight Charges (2 nights)', cost: wardByName['Cardiac Care Unit'].overnightFee * 2 }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('admitted_day10', [
    { description: `Consultation - ${apptByKey.admitted_day10.doctorName}`, cost: drSana.fee },
    { description: 'Lab Test - Chest X-Ray', cost: labTestByName['Chest X-Ray'].baseCost },
    { description: 'Lab Test - Culture & Sensitivity Test', cost: labTestByName['Culture & Sensitivity Test'].baseCost },
    { description: 'Ward Admission - ICU', cost: wardByName['ICU'].admissionFee },
    { description: 'Ward Overnight Charges (10 nights)', cost: wardByName['ICU'].overnightFee * 10 }
  ], 'Unpaid', 'Cash'));

  invoiceDefs.push(invoiceFor('discharged_completed2', [
    { description: `Consultation - ${apptByKey.discharged_completed2.doctorName}`, cost: drAyesha.fee },
    { description: 'Lab Test - Urine Routine Examination', cost: labTestByName['Urine Routine Examination'].baseCost },
    { description: 'Lab Test - Complete Blood Count (CBC)', cost: labTestByName['Complete Blood Count (CBC)'].baseCost },
    { description: 'Ward Admission - Pediatric Ward', cost: wardByName['Pediatric Ward'].admissionFee },
    { description: 'Ward Overnight Charges (3 nights)', cost: wardByName['Pediatric Ward'].overnightFee * 3 }
  ], 'Paid', 'Cash'));

  invoiceDefs.push(invoiceFor('ali_raza_completed_history', [
    { description: `Consultation - ${apptByKey.ali_raza_completed_history.doctorName}`, cost: drAhsan.fee }
  ], 'Paid', 'Card'));

  const insertedInvoices = await Invoice.insertMany(invoiceDefs);
  console.log(`  → ${insertedInvoices.length} invoices created (mix of Paid and Unpaid).\n`);

  // ==========================================================================
  // DONE
  // ==========================================================================
  console.log('============================================================');
  console.log('✅ Dummy data seeding complete!');
  console.log('============================================================');
  console.log(`Wards:         ${wards.length}`);
  console.log(`Lab Tests:     ${labTests.length}`);
  console.log(`Medicines:     ${medicines.length}`);
  console.log(`Users:         ${users.length}  (1 Admin, ${doctors.length} Doctors, 3 Nurses, 2 Lab Staff, 2 Billing Staff, ${patients.length} Patients)`);
  console.log(`Appointments:  ${insertedAppts.length}  (every status, across all 6 wards and 7 doctors)`);
  console.log(`Prescriptions: ${insertedPrescriptions.length}`);
  console.log(`Invoices:      ${insertedInvoices.length}  (mix of Paid / Unpaid)`);
  console.log('============================================================');
  console.log('Every seeded account password:  11111111');
  console.log('============================================================');
  console.log('');
  console.log('★★★  MAIN ACCOUNTS TO OPEN LIVE FOR YOUR EXAMINERS  ★★★');
  console.log('------------------------------------------------------------');
  console.log('1. ADMIN            admin@mmgc.com');
  console.log('   → user management, fee/ward/lab-price configuration');
  console.log('');
  console.log('2. DOCTOR            ahsan.tariq@mmgc.com  (Cardiology)');
  console.log('   → busiest doctor: Scheduled booking, Lab Completed case,');
  console.log('     paid Completed visit, AND his own ICU inpatient (Day 6)');
  console.log('');
  console.log('3. NURSE             kamran.iqbal@mmgc.com  (ICU)');
  console.log('   → manages Hassan Javed, admitted 6 days ago, vitals');
  console.log('     recorded, medicine already Administered');
  console.log('');
  console.log('4. LAB STAFF         usman.ghani@mmgc.com');
  console.log('   → one Pending order awaiting upload (Zainab Riaz) +');
  console.log('     several already-Completed results with real files');
  console.log('');
  console.log('5. BILLING STAFF     zeeshan.baig@mmgc.com');
  console.log('   → Ayesha Siddiqui\'s Unpaid "Bill Pending" invoice —');
  console.log('     mark it Paid live and watch the appointment auto-flip');
  console.log('     to "Completed"');
  console.log('');
  console.log('6. PATIENT (history) ali.raza@example.com');
  console.log('   → 3 appointments across time: upcoming booking, an old');
  console.log('     paid visit, and a cleared lab record — full dashboard');
  console.log('');
  console.log('7. PATIENT (admitted) sara.ahmed@example.com');
  console.log('   → currently admitted TODAY (Day 0, Maternity Ward) —');
  console.log('     shows the admission flow and the day-counter at 0');
  console.log('============================================================');
  console.log('Full account list:');
  console.log('  Doctors:       ahsan.tariq | sana.malik | bilal.hussain | ayesha.khan');
  console.log('                 farhan.qureshi | kiran.zafar | noman.aslam   (@mmgc.com)');
  console.log('  Nurses:        hina.yousaf | kamran.iqbal | rabia.saeed     (@mmgc.com)');
  console.log('  Lab Staff:     usman.ghani | mehwish.anwar                 (@mmgc.com)');
  console.log('  Billing Staff: zeeshan.baig | fatima.noor                  (@mmgc.com)');
  console.log('  Patients:      ali.raza, sara.ahmed, imran.sheikh, nadia.yousuf,');
  console.log('                 hassan.javed, mariam.fazal, waqas.ahmed, ayesha.siddiqui,');
  console.log('                 omar.farooq, zainab.riaz, bilquis.tariq, hamza.latif,');
  console.log('                 adeel.shah, rukhsana.bibi, talha.mumtaz, sadia.kanwal,');
  console.log('                 faizan.ulhaq, mehak.rauf, junaid.akram, iqra.yasmin');
  console.log('                 (all @example.com)');
  console.log('============================================================');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
