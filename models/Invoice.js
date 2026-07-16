import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  // Added reference link to cleanly connect invoices with specific appointments
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: String,
  items: [{ 
    description: String, 
    cost: Number 
  }],
  totalAmount: Number,
  status: { type: String, default: 'Unpaid' },
  method: { type: String, default: 'Cash' },
  date: { type: Date, default: Date.now }
});

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);