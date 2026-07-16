import mongoose from 'mongoose';

// Ensure the cached instance is globally set across hot-reloads
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function mmgc_db() {
  // FIX: Moved variable resolution inside runtime loop to prevent early module evaluation crashes
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI in .env.local');

  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default mmgc_db;