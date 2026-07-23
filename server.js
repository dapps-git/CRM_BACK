require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();

// Seed Default Admin Accounts
const seedAdminUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding default users...');
      await User.create({
        email: 'crevionads@gmail.com',
        password: 'Crevionads@CRM1234',
        isVerified: true
      });
      await User.create({
        email: 'creweanads@gmail.com',
        password: 'creweanadscrm@1234',
        isVerified: true
      });
      console.log('Default admin users seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding default users:', error.message);
  }
};

// Connect Database
connectDB().then(() => {
  seedAdminUsers();
}).catch(() => {});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Folder for Local Uploads Fallback
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve Frontend in Production (Optional, since we run frontend and backend on separate dev servers usually)
// For local convenience, let's keep backend and frontend modular.

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/business', require('./routes/businessRoutes'));
app.use('/api/income', require('./routes/incomeRoutes'));
app.use('/api/expense', require('./routes/expenseRoutes'));
app.use('/api/member', require('./routes/memberRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Basic Health Check & Root Routes
app.get('/', (req, res) => {
  res.status(200).send('CRM API Server is running successfully.');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
