try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();

const bcrypt = require('bcryptjs');

// Seed Default Admin Accounts
const seedAdminUsers = async () => {
  try {
    const admins = [
      { email: 'crevionads@gmail.com', password: 'Crevionads@CRM1234' },
      { email: 'creweanads@gmail.com', password: 'creweanadscrm@1234' },
    ];

    for (const admin of admins) {
      await User.deleteMany({ email: admin.email });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);
      
      await User.collection.insertOne({
        email: admin.email,
        password: hashedPassword,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
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

// Request Logger
app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url} (original: ${req.originalUrl})`);
  next();
});

// Mount Routes (Explicitly supports /crm/api, /crm, /api, and root subpaths)
app.use(['/crm/api/auth', '/crm/auth', '/api/auth', '/auth'], require('./routes/authRoutes'));
app.use(['/crm/api/business', '/crm/business', '/api/business', '/business'], require('./routes/businessRoutes'));
app.use(['/crm/api/income', '/crm/income', '/api/income', '/income'], require('./routes/incomeRoutes'));
app.use(['/crm/api/expense', '/crm/expense', '/api/expense', '/expense'], require('./routes/expenseRoutes'));
app.use(['/crm/api/member', '/crm/member', '/api/member', '/member'], require('./routes/memberRoutes'));
app.use(['/crm/api/leave', '/crm/leave', '/api/leave', '/leave'], require('./routes/leaveRoutes'));
app.use(['/crm/api/settings', '/crm/settings', '/api/settings', '/settings'], require('./routes/settingsRoutes'));
app.use(['/crm/api/dashboard', '/crm/dashboard', '/api/dashboard', '/dashboard'], require('./routes/dashboardRoutes'));

// Basic Health Check & Root Routes
app.get(['/', '/crm', '/health', '/api/health', '/crm/health', '/crm/api/health'], (req, res) => {
  res.status(200).send('CRM API Server is running successfully.');
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
