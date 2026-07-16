
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://localhost:27017/";

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: { type: String },
  role: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB...");

    const adminExists = await User.findOne({ email: 'admin@mmgc.com' });
    
    if (!adminExists) {
      await User.create({
        name: "System Admin",
        email: "admin@mmgc.com",
        password: "********",
        role: "Admin"
      });
      console.log("Admin account created successfully!");
    } else {
      console.log("Admin already exists.");
    }

    process.exit();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

createAdmin();