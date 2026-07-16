import mongoose from 'mongoose';

const WardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  specialty: { type: String, required: true },
  admissionFee: { type: Number, default: 0 },
  overnightFee: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Ward || mongoose.model('Ward', WardSchema);