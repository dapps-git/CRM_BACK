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

// Universal CORS Middleware with preflight handling
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, authorization, x-auth-token, X-Auth-Token, *');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }
  next();
});

app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
const invoiceRoutes = require('./routes/invoiceRoutes');

// Mount Routers for all possible cPanel / local subpaths
app.use(['/crm/api/auth', '/crm/auth', '/api/auth', '/auth'], authRoutes);
app.use(['/crm/api/business', '/crm/business', '/api/business', '/business'], businessRoutes);
app.use(['/crm/api/income', '/crm/income', '/api/income', '/income'], incomeRoutes);
app.use(['/crm/api/expense', '/crm/expense', '/api/expense', '/expense'], expenseRoutes);
app.use(['/crm/api/member', '/crm/member', '/api/member', '/member'], memberRoutes);
app.use(['/crm/api/leave', '/crm/leave', '/api/leave', '/leave'], leaveRoutes);
app.use(['/crm/api/settings', '/crm/settings', '/api/settings', '/settings'], settingsRoutes);
app.use(['/crm/api/dashboard', '/crm/dashboard', '/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/crm/api/invoice', '/crm/invoice', '/api/invoice', '/invoice'], invoiceRoutes);

// Basic Health Check & Root Routes
app.get(['/', '/crm', '/crm/', '/api', '/api/', '/crm/api', '/crm/api/', '/health', '/api/health', '/crm/health', '/crm/api/health'], (req, res) => {
  res.status(200).send('CRM API Server is running successfully.');
});

// Global Express Error Handler
app.use((err, req, res, next) => {
  console.error('Express Global Error Handler caught:', err);
  res.status(err.status || 400).json({
    message: err.message || 'An error occurred processing your request',
    error: err.toString()
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
