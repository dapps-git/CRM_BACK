const mongoose = require('mongoose');
const dns = require('dns');

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true }); } catch (e) {}

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://crevionads:crevionads_2026db@cluster0.g1urit4.mongodb.net/CRM?retryWrites=true&w=majority&appName=Cluster0';

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
      family: 4
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
  }
};

module.exports = connectDB;

