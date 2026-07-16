import mongoose from 'mongoose';

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);