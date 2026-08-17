const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  // Config options to try in sequence for maximum delivery success on live hosting
  const configsToTry = [
    { host: 'smtp.gmail.com', port: 587, secure: false, user: 'crevionads@gmail.com', pass: 'jqjdnwdujzqnubra' },
    { host: 'smtp.gmail.com', port: 465, secure: true, user: 'crevionads@gmail.com', pass: 'jqjdnwdujzqnubra' },
    { host: 'smtp.gmail.com', port: 25, secure: false, user: 'crevionads@gmail.com', pass: 'jqjdnwdujzqnubra' }
  ];

  // If user configured DB settings, prepend DB config as first priority
  if (mongoose.connection.readyState === 1) {
    try {
      const settings = await Settings.findOne().maxTimeMS(1500);
      if (settings && settings.emailConfig && settings.emailConfig.user && settings.emailConfig.pass) {
        const dbUser = settings.emailConfig.user.trim();
        const dbPass = settings.emailConfig.pass.trim().replace(/\s+/g, '');
        const dbHost = settings.emailConfig.host || (dbUser.includes('@gmail.com') ? 'smtp.gmail.com' : 'smtp.hostinger.com');
        const dbPort = Number(settings.emailConfig.port) || 465;

        configsToTry.unshift({
          host: dbHost,
          port: dbPort,
          secure: dbPort === 465,
          user: dbUser,
          pass: dbPass
        });
      }
    } catch (e) {}
  }

  let lastError = null;

  for (const cfg of configsToTry) {
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: {
          user: cfg.user,
          pass: cfg.pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000
      });

      const mailOptions = {
        from: `"Crevion ads CRM" <${cfg.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email delivered via ${cfg.host}:${cfg.port} to ${options.to}: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error(`⚠️ Email attempt failed via ${cfg.host}:${cfg.port}:`, err.message);
      lastError = err;
    }
  }

  console.error('❌ All SMTP delivery attempts failed:', lastError?.message);
  return { error: lastError?.message || 'SMTP delivery failed' };
};

module.exports = sendEmail;
