require('dotenv').config(); // Load environment variables from your .env file
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Fallback to local development URI only if the environment variable isn't set
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mmgc";
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "ChangeMeInProduction123!";

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: { type: String },
  role: String,
  isVerified: { type: Boolean, default: false } // Aligned with your frontend dashboard state
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    console.log("Connecting to MongoDB database...");
    await mongoose.connect(MONGODB_URI);
    console.log("Database connection established successfully.");

    const adminEmail = 'admin@mmgc.com';
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
      console.log("Generating secure password hash...");
      // Hash the password with 12 salt rounds (strong operational security)
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "Admin",
        isVerified: true // Instantly verify the admin so they bypass validation loops
      });
      
      console.log("=================================================");
      console.log("🎉 Success: Admin account created successfully!");
      console.log(`✉️  Email: ${adminEmail}`);
      console.log("=================================================");
    } else {
      console.log("ℹ️  Notice: Admin account already exists. Skipping seed.");
    }

    process.exit(0); // Clean successful exit
  } catch (error) {
    console.error("❌ Critical Error seeding database:", error);
    process.exit(1); // Failure exit code
  }
}

createAdmin();