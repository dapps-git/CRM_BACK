require('dotenv').config();
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

// Explicit Permissive CORS for Vercel Frontend & Cross-Origin Requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Folder for Local Uploads Fallback
app.use(['/crm/uploads', '/uploads'], express.static(path.join(__dirname, 'public/uploads')));

// Direct Reset Admins Route (Guarantees browser access regardless of proxy)
app.get([
  '/crm/api/auth/reset-admins',
  '/api/auth/reset-admins',
  '/auth/reset-admins',
  '/reset-admins'
], require('./controllers/authController').resetAdmins);

// Mount Routes (Supports /crm/api, /crm, /api, and root prefixes)
app.use(['/crm/api/auth', '/crm/auth', '/api/auth', '/auth'], require('./routes/authRoutes'));
app.use(['/crm/api/business', '/crm/business', '/api/business', '/business'], require('./routes/businessRoutes'));
app.use(['/crm/api/income', '/crm/income', '/api/income', '/income'], require('./routes/incomeRoutes'));
app.use(['/crm/api/expense', '/crm/expense', '/api/expense', '/expense'], require('./routes/expenseRoutes'));
app.use(['/crm/api/member', '/crm/member', '/api/member', '/member'], require('./routes/memberRoutes'));
app.use(['/crm/api/leave', '/crm/leave', '/api/leave', '/leave'], require('./routes/leaveRoutes'));
app.use(['/crm/api/settings', '/crm/settings', '/api/settings', '/settings'], require('./routes/settingsRoutes'));
app.use(['/crm/api/dashboard', '/crm/dashboard', '/api/dashboard', '/dashboard'], require('./routes/dashboardRoutes'));

// Basic Health Check & Root Routes
app.all('*', (req, res, next) => {
  const cleanPath = (req.path || '').toLowerCase().replace(/\/+$/, '');
  if (cleanPath === '' || cleanPath === '/' || cleanPath.endsWith('/health') || cleanPath.endsWith('/crm') || cleanPath.endsWith('/api')) {
    return res.status(200).send('CRM API Server is running successfully.');
  }
  next();
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
