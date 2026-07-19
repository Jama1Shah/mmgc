import mongoose from 'mongoose';

const LabTestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lab test name is required'],
      unique: true, 
      trim: true    
    },
    baseCost: {
      type: Number,
      required: [true, 'Lab panel billing cost is required'],
      default: 1000 
    }
  },
  {
    timestamps: true 
  }
);

export default mongoose.models.LabTest || mongoose.model('LabTest', LabTestSchema);