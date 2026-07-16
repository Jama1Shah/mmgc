import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // Adding the password field
  password: { 
    type: String, 
    required: [true, "Please provide a password"],
    minlength: 6,
    select: false // This prevents the password from being returned in API calls by default
  },
  role: { 
    type: String, 
    enum: ['Admin', 'Doctor', 'Nurse', 'Lab Staff', 'Billing Staff', 'Patient'], 
    default: 'Patient' 
  },
  dept: { type: String, default: 'General' },
  status: { type: String, default: 'Active' },
  fee: { type: Number, default: 0 }, // Added fee field for Doctor consultancy rate tracking
  createdAt: { type: Date, default: Date.now},

  // --- Nodemailer Integration Fields (Added safely below) ---
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

export default mongoose.models.User || mongoose.model('User', UserSchema);