import mongoose from 'mongoose';

// Ensure the Appointment schema is pre-loaded into Mongoose's cache.
// Update the path below to match where your files actually live!
import '@/models/Appointment'; 

const PrescriptionSchema = new mongoose.Schema(
  {
    // This connects perfectly to the 'Appointment' string registered in your appointment model
    appointmentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Appointment', 
      required: true 
    },
    patientName: { type: String, required: true },
    patientEmail: { type: String, required: true }, 
    doctorName: { type: String, required: true },
    medicationDetails: { type: String, required: true },
    dateIssued: { type: String, required: true },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    
    // Laboratory layer data tracking synchronization variables
    labPrescription: { type: String, default: null },
    labNotes: { type: String, default: null },
    labFileUrl: { type: String, default: null },
    labStatus: { type: String, default: 'Pending' },

    // Dynamic Ward Admission System Extensions
    admissionRequired: { type: Boolean, default: false },
    admissionDetails: {
      wardName: { type: String, default: 'General Bedward' },
      admittedAt: { type: Date, default: null },
      admissionDays: { type: Number, default: 0 }
    },

    // 🏥 INPATIENT MANAGEMENT & NURSE DASHBOARD TRACKING CORE PROPERTIES
    vitals: {
      hr: { type: String, default: '80' },
      temp: { type: String, default: '98.6' },
      spo2: { type: String, default: '98' },
      bp: { type: String, default: '120/80' }
    },
    vitalsChecked: { type: Boolean, default: false },
    vitalsCheckedAt: { type: Date, default: null }, // Track exactly when vitals were committed
    medStatus: { type: String, default: 'Pending' },

    // 🏁 FINAL DISCHARGE TAKE-HOME PRESCRIPTION (separate from inpatient medicationDetails chart)
    dischargeMedication: { type: String, default: null },
    dischargedAt: { type: Date, default: null },

    // Soft delete status visibility tags to preserve patient history metrics
    deletedByDoctor: { type: Boolean, default: false },
    deletedByPatient: { type: Boolean, default: false }
  }, 
  { timestamps: true }
);

export default mongoose.models.Prescription || mongoose.model('Prescription', PrescriptionSchema);