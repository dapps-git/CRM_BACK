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

// Request Logger
app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url} (original: ${req.originalUrl})`);
  next();
});

// Subpath Normalizer Middleware (Strips cPanel /crm folder prefix)
app.use((req, res, next) => {
  if (req.url.includes('/api/')) {
    req.url = '/api/' + req.url.split('/api/')[1];
  } else if (req.url.startsWith('/crm/')) {
    req.url = req.url.replace(/^\/crm/, '') || '/';
  } else if (req.url === '/crm') {
    req.url = '/';
  }
  next();
});

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
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.status(200).send('CRM API Server is running successfully.');
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
