/**
 * reset-admin.js
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

  // Remove legacy account
  await User.deleteMany({ email: 'creweanads@gmail.com' });

  const primaryAdmin = { email: 'crevionads@gmail.com', password: 'Crevionads@CRM1234' };

  await User.deleteOne({ email: primaryAdmin.email });
  await User.create({
    email: primaryAdmin.email,
    password: primaryAdmin.password,
    mobileNumber: '9745307450',
    isVerified: true
  });
  console.log(`✅ Reset primary admin: ${primaryAdmin.email}`);

  console.log('\nAdmin account ready:');
  console.log(`  Email: ${primaryAdmin.email}   Password: ${primaryAdmin.password}`);
  process.exit(0);
};

resetAdmins().catch(err => { console.error(err); process.exit(1); });
