const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  try {
    let user = 'crevionads@gmail.com';
    let pass = 'jqjdnwdujzqnubra';
    let smtpHost = 'smtp.gmail.com';
    let port = 465;

    // Check database settings for custom SMTP if provided
    if (mongoose.connection.readyState === 1) {
      try {
        const settings = await Settings.findOne().maxTimeMS(1500);
        if (settings && settings.emailConfig && settings.emailConfig.user && settings.emailConfig.pass) {
          user = settings.emailConfig.user.trim();
          pass = settings.emailConfig.pass.trim().replace(/\s+/g, '');
          smtpHost = settings.emailConfig.host || (user.includes('@gmail.com') ? 'smtp.gmail.com' : 'smtp.hostinger.com');
          port = Number(settings.emailConfig.port) || (smtpHost.includes('gmail') ? 465 : 465);
        }
      } catch (e) {
        // Fallback to primary credentials
      }
    }

    // Force fallback to primary Gmail App Password if settings are default or missing
    if (!user || user.includes('your_')) user = 'crevionads@gmail.com';
    if (!pass || pass.includes('your_')) pass = 'jqjdnwdujzqnubra';
    if (user === 'crevionads@gmail.com') {
      smtpHost = 'smtp.gmail.com';
      port = 465;
      pass = 'jqjdnwdujzqnubra';
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: port === 465,
      auth: {
        user: user,
        pass: pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Crevion ads CRM" <${user}>`,
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
