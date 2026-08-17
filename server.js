const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}
try { require('dotenv').config(); } catch (e) {}
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
        mobileNumber: '9745307450',
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
          const companyEmail = 'crevionads@gmail.com';
          const recipients = [domain.ownerEmail, companyEmail].filter(Boolean).join(',');
          const expDateStr = formatDate(domain.expirationDate);
          const purchaseDateStr = formatDate(domain.purchaseDate);

          const subject = `⚠️ URGENT: Domain Expiration Warning for ${domain.domainName}`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
              <div style="background-color: #8a32c6; padding: 18px; text-align: center; border-radius: 6px 6px 0 0;">
                <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">⚠️ Domain Expiration Warning</h2>
              </div>
              
              <div style="padding: 24px; color: #333333; line-height: 1.6;">
                <p style="font-size: 15px; font-weight: bold; color: #111827;">Hello,</p>
                <p style="font-size: 14px; color: #4b5563;">
                  This is an automated alert from <strong>Crevion ads CRM</strong> to notify you that the following domain is expiring soon. Please review the details below:
                </p>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13.5px; border: 1px solid #e5e7eb;">
                  <tr style="background-color: #f9fafb;">
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; width: 40%; color: #374151;">Domain Name:</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold; font-size: 15px;">${domain.domainName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Project Name:</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #111827;">${domain.projectName || 'N/A'}</td>
                  </tr>
                  <tr style="background-color: #f9fafb;">
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Platform ( Register ):</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #8a32c6;">${domain.platform || 'Hostinger'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Account Holder:</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${domain.accountHolder || 'N/A'}</td>
                  </tr>
                  <tr style="background-color: #f9fafb;">
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Purchased Date:</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${purchaseDateStr || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Expiration Date:</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${expDateStr}</td>
                  </tr>
                  ${domain.renewalCost ? `
                  <tr style="background-color: #f9fafb;">
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Est. Renewal Cost:</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #059669;">₹${Number(domain.renewalCost).toLocaleString()}</td>
                  </tr>` : ''}
                </table>

                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 24px;">
                  <p style="font-size: 13.5px; color: #b91c1c; margin: 0; font-weight: bold;">
                    ⚠️ Action Required: Please renew this domain immediately to prevent website downtime or loss of domain ownership.
                  </p>
                </div>

                <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
                  <p style="font-size: 14px; margin: 0; color: #374151; font-weight: 600;">Thank you,</p>
                  <p style="font-size: 16px; margin: 4px 0 0 0; color: #8a32c6; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CREVIONADS</p>
                  <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Crevion ads CRM | crevionads@gmail.com</p>
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
const noteRoutes = require('./routes/noteRoutes');
const domainRoutes = require('./routes/domainRoutes');
const serverRoutes = require('./routes/serverRoutes');

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
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is currently busy by an existing process. Reconnecting...`);
  } else {
    console.error('Server startup error:', err);
  }
});
