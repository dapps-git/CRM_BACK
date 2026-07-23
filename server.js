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
    const admins = [
      { email: 'crevionads@gmail.com', password: 'Crevionads@CRM1234' },
      { email: 'creweanads@gmail.com', password: 'creweanadscrm@1234' },
    ];

    for (const admin of admins) {
      const existing = await User.findOne({ email: admin.email });
      if (!existing) {
        await User.create({ email: admin.email, password: admin.password, isVerified: true });
        console.log(`Seeded admin user: ${admin.email}`);
      }
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

// Mount Routes (Supports both with and without /api prefix for cPanel subpath compatibility)
app.use(['/api/auth', '/auth'], require('./routes/authRoutes'));
app.use(['/api/business', '/business'], require('./routes/businessRoutes'));
app.use(['/api/income', '/income'], require('./routes/incomeRoutes'));
app.use(['/api/expense', '/expense'], require('./routes/expenseRoutes'));
app.use(['/api/member', '/member'], require('./routes/memberRoutes'));
app.use(['/api/leave', '/leave'], require('./routes/leaveRoutes'));
app.use(['/api/settings', '/settings'], require('./routes/settingsRoutes'));
app.use(['/api/dashboard', '/dashboard'], require('./routes/dashboardRoutes'));

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
