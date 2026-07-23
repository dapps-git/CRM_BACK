/**
 * reset-admin.js
 * Run once to reset or re-create the admin users with correct hashed passwords.
 * Usage: node reset-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Connected');
};

const resetAdmins = async () => {
  await connectDB();

  const admins = [
    { email: 'crevionads@gmail.com',  password: 'Crevionads@CRM1234' },
    { email: 'creweanads@gmail.com',  password: 'creweanadscrm@1234' },
  ];

  for (const admin of admins) {
    // Delete existing record so the pre-save hook re-hashes cleanly
    await User.deleteOne({ email: admin.email });
    await User.create({ email: admin.email, password: admin.password, isVerified: true });
    console.log(`✅ Reset: ${admin.email}`);
  }

  console.log('\nAll admin accounts reset. You can now log in with:');
  admins.forEach(a => console.log(`  Email: ${a.email}   Password: ${a.password}`));
  process.exit(0);
};

resetAdmins().catch(err => { console.error(err); process.exit(1); });
