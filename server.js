const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}
try { require('dotenv').config({ override: true }); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();

// Seed Default Admin Accounts (ONLY crevionads@gmail.com)
const seedAdminUsers = async () => {
  try {
    // Delete any legacy creweanads account
    await User.deleteMany({ email: 'creweanads@gmail.com' });

    const primaryAdmin = { email: 'crevionads@gmail.com', password: 'Crevionads@CRM1234' };
    const existing = await User.findOne({ email: primaryAdmin.email.toLowerCase() });
    if (!existing) {
      await User.create({
        email: primaryAdmin.email.toLowerCase(),
        password: primaryAdmin.password,
        mobileNumber: '9947400278',
        isVerified: true
      });
      console.log(`✅ Admin user seeded & verified: ${primaryAdmin.email}`);
    }
  } catch (error) {
    console.error('Error seeding default users:', error.message);
  }
};

// Automatic background check for domains expiring within 14 days (2 weeks)
const checkExpiringDomainsJob = async () => {
  try {
    const Domain = require('./models/Domain');
    const sendEmail = require('./utils/sendEmail');
    const formatDate = (d) => {
      if (!d) return '';
      const date = new Date(d);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const now = new Date();
    const allDomains = await Domain.find({ expirationDate: { $exists: true, $ne: null } });

    for (const domain of allDomains) {
      const exp = new Date(domain.expirationDate);
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

      // Update status if changed
      const newStatus = domain.calculateStatus();
      if (domain.status !== newStatus) {
        domain.status = newStatus;
        await domain.save();
      }

      // If expiring within 14 days (2 weeks)
      if (diffDays <= 14 && diffDays >= 0) {
        const lastSent = domain.alertSentAt ? new Date(domain.alertSentAt) : null;
        const daysSinceAlert = lastSent ? (now - lastSent) / (1000 * 60 * 60 * 24) : 999;

        // If alert was not sent in last 7 days
        if (daysSinceAlert >= 7) {
          const expDateStr = formatDate(domain.expirationDate);
          const purchaseDateStr = domain.purchaseDate ? formatDate(domain.purchaseDate) : 'N/A';
          const recipients = [domain.ownerEmail, 'crevionads@gmail.com'].filter(Boolean).join(', ');
          const subject = `⚠️ Domain Expiration Alert: ${domain.domainName}`;

          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 32px 16px;">
              <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
                <!-- Brand Header -->
                <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                  <span style="font-size: 18px; font-weight: 800; color: #8a32c6; letter-spacing: -0.5px;">Crevion<span style="color: #0f172a;">.ads</span></span>
                </div>

                <!-- Title -->
                <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.3px;">Domain Expiration Alert</h1>
                
                <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                  The following domain is scheduled to expire soon. Please review the details below:
                </p>

                <!-- Domain Details Table -->
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 13px;">
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b; width: 40%;">Domain Name</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${domain.domainName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Project Name</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${domain.projectName || 'N/A'}</td>
                  </tr>
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Platform</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${domain.platform || 'Hostinger'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Account Holder</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${domain.accountHolder || 'N/A'}</td>
                  </tr>
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Purchase Date</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${purchaseDateStr || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; ${domain.renewalCost ? 'border-bottom: 1px solid #e2e8f0;' : ''} font-weight: 600; color: #64748b;">Expiration Date</td>
                    <td style="padding: 10px 14px; ${domain.renewalCost ? 'border-bottom: 1px solid #e2e8f0;' : ''} font-weight: 700; color: #e11d48;">${expDateStr}</td>
                  </tr>
                  ${domain.renewalCost ? `
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Est. Renewal Cost</td>
                    <td style="padding: 10px 14px; font-weight: 700; color: #059669;">₹${Number(domain.renewalCost).toLocaleString()}</td>
                  </tr>` : ''}
                </table>

                <!-- Alert Box -->
                <div style="background-color: #fff1f2; border-left: 3px solid #f43f5e; padding: 12px 14px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                  <p style="font-size: 12.5px; color: #9f1239; margin: 0; font-weight: 500;">
                    Action Required: Please renew this domain promptly to prevent website downtime.
                  </p>
                </div>

                <!-- Footer -->
                <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  <p style="font-size: 12px; color: #94a3b8; margin: 0;">Crevion ads CRM | Automated System Notification</p>
                </div>
              </div>
            </div>
          `;

          await sendEmail({ to: recipients, subject, html });
          domain.alertSentAt = now;
          await domain.save();
          console.log(`[AUTO DOMAIN ALERT] Expiration warning sent for ${domain.domainName} to ${recipients}`);
        }
      }
    }
  } catch (err) {
    console.error('Error running domain expiration check job:', err.message);
  }
};

// Connect Database
connectDB().then(() => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    seedAdminUsers();
    // Run background domain expiration and birthday alert jobs immediately, at 6:00 AM daily, and on interval
    const cron = require('node-cron');
    const { checkUpcomingBirthdaysJob } = require('./controllers/memberController');
    checkExpiringDomainsJob();
    checkUpcomingBirthdaysJob();

    // Daily cron job at 6:00 AM (0 6 * * *)
    cron.schedule('0 6 * * *', () => {
      console.log('[CRON JOB 6:00 AM] Running daily domain & birthday alert check...');
      checkExpiringDomainsJob();
      checkUpcomingBirthdaysJob();
    });

    setInterval(() => {
      checkExpiringDomainsJob();
      checkUpcomingBirthdaysJob();
    }, 6 * 60 * 60 * 1000);
  }
}).catch(() => {});

// Universal CORS Middleware with preflight handling
const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'authorization',
    'x-auth-token',
    'X-Auth-Token',
    'x-access-token',
    '*'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static Folder for Local Uploads
['/crm/uploads', '/uploads'].forEach(p => app.use(p, express.static(path.join(__dirname, 'public/uploads'))));

// Import Routers
const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const clientRoutes = require('./routes/clientRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const memberRoutes = require('./routes/memberRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const noteRoutes = require('./routes/noteRoutes');
const domainRoutes = require('./routes/domainRoutes');
const serverRoutes = require('./routes/serverRoutes');

// Mount Routers for all possible cPanel / local subpaths
app.use(['/crm/api/auth', '/crm/auth', '/api/auth', '/auth'], authRoutes);
app.use(['/crm/api/business', '/crm/business', '/api/business', '/business'], businessRoutes);
app.use(['/crm/api/client', '/crm/client', '/api/client', '/client'], clientRoutes);
app.use(['/crm/api/income', '/crm/income', '/api/income', '/income'], incomeRoutes);
app.use(['/crm/api/expense', '/crm/expense', '/api/expense', '/expense'], expenseRoutes);
app.use(['/crm/api/member', '/crm/member', '/api/member', '/member'], memberRoutes);
app.use(['/crm/api/leave', '/crm/leave', '/api/leave', '/leave'], leaveRoutes);
app.use(['/crm/api/settings', '/crm/settings', '/api/settings', '/settings'], settingsRoutes);
app.use(['/crm/api/dashboard', '/crm/dashboard', '/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/crm/api/invoice', '/crm/invoice', '/api/invoice', '/invoice'], invoiceRoutes);
app.use(['/crm/api/notes', '/crm/notes', '/api/notes', '/notes'], noteRoutes);
app.use(['/crm/api/domain', '/crm/domain', '/api/domain', '/domain'], domainRoutes);
app.use(['/crm/api/server-config', '/crm/server-config', '/api/server-config', '/server-config'], serverRoutes);

// Test public route to verify deployment
app.get(['/crm/api/invoice/test-public', '/api/invoice/test-public', '/crm/invoice/test-public', '/invoice/test-public'], (req, res) => {
  res.status(200).send('Invoice public test OK');
});

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
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`🚀 CRM Backend server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is currently in use. Please terminate the conflicting process or change PORT in .env.`);
    process.exit(1);
  } else {
    console.error('Server startup error:', err);
    process.exit(1);
  }
});
