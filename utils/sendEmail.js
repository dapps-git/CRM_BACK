const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  try {
    let service = process.env.EMAIL_SERVICE || 'gmail';
    let host = process.env.EMAIL_HOST || '';
    let port = Number(process.env.EMAIL_PORT) || 465;
    
    // Default fallback to crevionads@gmail.com app password if env vars missing in live production
    let user = process.env.EMAIL_USER || 'crevionads@gmail.com';
    let pass = process.env.EMAIL_PASS || 'jqjdnwdujzqnubra';

    // Safely check database Settings without buffering timeout
    if (mongoose.connection.readyState === 1) {
      try {
        const settings = await Settings.findOne().maxTimeMS(1500);
        if (settings && settings.emailConfig && settings.emailConfig.user && settings.emailConfig.pass) {
          service = settings.emailConfig.service || service;
          user = settings.emailConfig.user;
          pass = settings.emailConfig.pass;
          host = settings.emailConfig.host || host;
        }
      } catch (e) {
        // Fallback to env or default credentials
      }
    }

    // Secondary fallback to guarantee valid credentials
    if (!user || user.includes('your_')) user = 'crevionads@gmail.com';
    if (!pass || pass.includes('your_')) pass = 'jqjdnwdujzqnubra';

    // Determine SMTP Server Host
    let smtpHost = 'smtp.gmail.com';
    if (host) {
      smtpHost = host;
    } else if (service.toLowerCase().includes('hostinger') || (user && (user.includes('@aladhwastudio.com') || user.includes('@crevionads.com')))) {
      smtpHost = 'smtp.hostinger.com';
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: port === 465,
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ''), // Strip spaces from App Password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Crevion ads CRM" <${user.trim()}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Real Email sent successfully to ${options.to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Real Email delivery error:', error.message);
    return { error: error.message };
  }
};

module.exports = sendEmail;
