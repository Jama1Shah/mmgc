import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true },
    patientEmail: { type: String, required: true },
    doctorName: { type: String, required: true },
    specialty: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    time: { type: String, required: true }, // Format: HH:mm
    reason: { type: String },
    status: { type: String, default: 'Scheduled' }, 
    billPaid: { type: Boolean, default: false },
    
    // ==========================================
    // MMGC INTEGRATED LAB SYSTEM FIELDS
    // ==========================================
    labStatus: { type: String, default: 'None' }, // None, Pending, In Progress, Completed, Cancelled
    labNotes: { type: String, default: '' },
    labFileUrl: { type: String, default: null },
    deletedByDoctor: { type: Boolean, default: false },

    // NEW FIELDS FOR LAB STAFF DASHBOARD CONTROLS
    deletedByLab: { type: Boolean, default: false },   // True when removed from active queue
    clearedFromHistory: { type: Boolean, default: false }, // True when removed from lab history

    // ==========================================
    // 🏥 INPATIENT ADMISSION & 24-HOUR CYCLE BILLING TRACKING
    // ==========================================
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
  },
  { timestamps: true }
);

// This 'Appointment' string is what Mongoose links to the ref in your PrescriptionSchema
export default mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);