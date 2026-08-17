const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  try {
    let service = process.env.EMAIL_SERVICE || 'gmail';
    let host = process.env.EMAIL_HOST || '';
    let port = Number(process.env.EMAIL_PORT) || 465;
    let user = process.env.EMAIL_USER;
    let pass = process.env.EMAIL_PASS;

    // Fallback to database Settings document if env variables are empty or placeholder
    if (!user || !pass || user.includes('your_') || pass.includes('your_')) {
      const settings = await Settings.findOne();
      if (settings && settings.emailConfig && settings.emailConfig.user && settings.emailConfig.pass) {
        service = settings.emailConfig.service || service;
        user = settings.emailConfig.user;
        pass = settings.emailConfig.pass;
        host = settings.emailConfig.host || host;
      }
    }

    // If credentials are missing or still placeholder, notify user clearly
    if (!user || !pass || user.includes('your_') || pass.includes('your_')) {
      console.log('----------------------------------------------------');
      console.log(`[EMAIL NOTICE] Real email requires a valid App Password in backend/.env or Settings page.`);
      console.log(`[EMAIL SIMULATED OUTPUT] To: ${options.to}`);
      console.log(`[EMAIL SIMULATED OUTPUT] Subject: ${options.subject}`);
      console.log('----------------------------------------------------');
      return { simulated: true, message: 'SMTP app password missing in .env or Settings' };
    }

    // Determine SMTP Server Host
    let smtpHost = 'smtp.gmail.com';
    if (host) {
      smtpHost = host;
    } else if (service.toLowerCase().includes('hostinger') || user.includes('@aladhwastudio.com') || user.includes('@crevionads.com')) {
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
