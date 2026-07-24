const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  try {
    // 1. Try checking env variables
    let service = process.env.EMAIL_SERVICE;
    let user = process.env.EMAIL_USER;
    let pass = process.env.EMAIL_PASS;

    // 2. Fallback to settings from database
    if (!user || !pass) {
      const settings = await Settings.findOne();
      if (settings && settings.emailConfig && settings.emailConfig.user) {
        service = settings.emailConfig.service || 'gmail';
        user = settings.emailConfig.user;
        pass = settings.emailConfig.pass;
      }
    }

    // Check if configuration exists
    if (!user || !pass || user.includes('your_') || pass.includes('your_')) {
      console.log('----------------------------------------------------');
      console.log(`[EMAIL SIMULATOR] To: ${options.to}`);
      console.log(`[EMAIL SIMULATOR] Subject: ${options.subject}`);
      console.log(`[EMAIL SIMULATOR] Body:\n${options.text}`);
      console.log('----------------------------------------------------');
      return { simulated: true };
    }

    // Create Robust Gmail Transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ''), // Strip spaces from App Password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Crevionads CRM" <${user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email send failed, fallback to simulation:', error.message);
    console.log('----------------------------------------------------');
    console.log(`[EMAIL SIMULATOR - FALLBACK] To: ${options.to}`);
    console.log(`[EMAIL SIMULATOR - FALLBACK] Subject: ${options.subject}`);
    console.log(`[EMAIL SIMULATOR - FALLBACK] Body:\n${options.text}`);
    console.log('----------------------------------------------------');
    return { simulated: true, error: error.message };
  }
};

module.exports = sendEmail;
