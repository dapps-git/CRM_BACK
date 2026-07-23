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

// cPanel & Local Subpath Normalizer Middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/crm/')) {
    req.url = req.url.replace(/^\/crm/, '') || '/';
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
app.use(['/crm/uploads', '/uploads'], express.static(path.join(__dirname, 'public/uploads')));

// Mount Routes (Uses wildcard matching to support any cPanel subpath or prefix)
app.use(['*/auth', '*/api/auth'], require('./routes/authRoutes'));
app.use(['*/business', '*/api/business'], require('./routes/businessRoutes'));
app.use(['*/income', '*/api/income'], require('./routes/incomeRoutes'));
app.use(['*/expense', '*/api/expense'], require('./routes/expenseRoutes'));
app.use(['*/member', '*/api/member'], require('./routes/memberRoutes'));
app.use(['*/leave', '*/api/leave'], require('./routes/leaveRoutes'));
app.use(['*/settings', '*/api/settings'], require('./routes/settingsRoutes'));
app.use(['*/dashboard', '*/api/dashboard'], require('./routes/dashboardRoutes'));

// Basic Health Check & Root Routes
app.all('*', (req, res, next) => {
  if (req.path === '/' || req.path.endsWith('/health') || req.path.endsWith('/crm')) {
    return res.status(200).send('CRM API Server is running successfully.');
  }
  next();
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
