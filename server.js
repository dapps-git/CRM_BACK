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

// cPanel & Local Subpath Normalizer Middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/crm/')) {
    req.url = req.url.replace(/^\/crm/, '') || '/';
  }
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Folder for Local Uploads Fallback
app.use(['/crm/uploads', '/uploads'], express.static(path.join(__dirname, 'public/uploads')));

// Mount Routes (Supports /crm/api, /crm, /api, and root paths)
app.use(['/crm/api/auth', '/crm/auth', '/api/auth', '/auth'], require('./routes/authRoutes'));
app.use(['/crm/api/business', '/crm/business', '/api/business', '/business'], require('./routes/businessRoutes'));
app.use(['/crm/api/income', '/crm/income', '/api/income', '/income'], require('./routes/incomeRoutes'));
app.use(['/crm/api/expense', '/crm/expense', '/api/expense', '/expense'], require('./routes/expenseRoutes'));
app.use(['/crm/api/member', '/crm/member', '/api/member', '/member'], require('./routes/memberRoutes'));
app.use(['/crm/api/leave', '/crm/leave', '/api/leave', '/leave'], require('./routes/leaveRoutes'));
app.use(['/crm/api/settings', '/crm/settings', '/api/settings', '/settings'], require('./routes/settingsRoutes'));
app.use(['/crm/api/dashboard', '/crm/dashboard', '/api/dashboard', '/dashboard'], require('./routes/dashboardRoutes'));

// Basic Health Check & Root Routes
app.get(['/', '/crm', '/api/health', '/crm/api/health'], (req, res) => {
  res.status(200).send('CRM API Server is running successfully.');
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
