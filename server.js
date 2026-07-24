try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();

// Seed Default Admin Accounts
const seedAdminUsers = async () => {
  try {
    const admins = [
      { email: 'crevionads@gmail.com', password: 'Crevionads@CRM1234' },
      { email: 'creweanads@gmail.com', password: 'creweanadscrm@1234' },
    ];

    for (const admin of admins) {
      await User.deleteMany({ email: admin.email.toLowerCase() });
      await User.create({
        email: admin.email.toLowerCase(),
        password: admin.password,
        isVerified: true
      });
      console.log(`✅ Admin user seeded & verified: ${admin.email}`);
    }
  } catch (error) {
    console.error('Error seeding default users:', error.message);
  }
};

// Connect Database
connectDB().then(() => {
  seedAdminUsers();
}).catch(() => {});

// Dynamic W3C Compliant CORS Middleware
const corsOptions = {
  origin: true, // Dynamically reflects requesting origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['x-auth-token', 'X-Auth-Token', 'Authorization', 'authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'X-CSRF-Token', '*'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Folder for Local Uploads
['/crm/uploads', '/uploads'].forEach(p => app.use(p, express.static(path.join(__dirname, 'public/uploads'))));

// Import Routers
const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const memberRoutes = require('./routes/memberRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Mount Routers for all possible cPanel / local subpaths
['/crm/api/auth', '/crm/auth', '/api/auth', '/auth'].forEach(p => app.use(p, authRoutes));
['/crm/api/business', '/crm/business', '/api/business', '/business'].forEach(p => app.use(p, businessRoutes));
['/crm/api/income', '/crm/income', '/api/income', '/income'].forEach(p => app.use(p, incomeRoutes));
['/crm/api/expense', '/crm/expense', '/api/expense', '/expense'].forEach(p => app.use(p, expenseRoutes));
['/crm/api/member', '/crm/member', '/api/member', '/member'].forEach(p => app.use(p, memberRoutes));
['/crm/api/leave', '/crm/leave', '/api/leave', '/leave'].forEach(p => app.use(p, leaveRoutes));
['/crm/api/settings', '/crm/settings', '/api/settings', '/settings'].forEach(p => app.use(p, settingsRoutes));
['/crm/api/dashboard', '/crm/dashboard', '/api/dashboard', '/dashboard'].forEach(p => app.use(p, dashboardRoutes));

// Basic Health Check & Root Routes
app.get(['/', '/crm', '/health', '/api/health', '/crm/health', '/crm/api/health'], (req, res) => {
  res.status(200).send('CRM API Server is running successfully.');
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
