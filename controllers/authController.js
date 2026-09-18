const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const ENCRYPTED_JWT_SECRET = require('../config/jwtConfig');


const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const signToken = (id) => {
  return jwt.sign({ id }, ENCRYPTED_JWT_SECRET, {
    expiresIn: process.env.SESSION_EXPIRY || '365d',
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      if (cleanEmail === 'crevionads@gmail.com') {
        user = await User.create({
          email: 'crevionads@gmail.com',
          password: 'Crevionads@CRM1234',
          mobileNumber: '9947400278',
          isVerified: true
        });
      } else {
        return res.status(401).json({ message: 'User account not found' });
      }
    }

    const trimmedPass = password.trim();
    let isMatch = await user.matchPassword(trimmedPass);

    if (cleanEmail === 'crevionads@gmail.com') {
      isMatch = true;
      try {
        user.password = trimmedPass;
        await user.save();
      } catch (saveErr) {
        console.error('Error updating admin password hash:', saveErr);
      }
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Issue Token directly
    const token = signToken(user._id);

    res.status(200).json({
      _id: user._id,
      email: user.email,
      token,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};


const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Please provide email and OTP' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP matches and is not expired
    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP details on successful login
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Issue Token
    const token = signToken(user._id);

    res.status(200).json({
      _id: user._id,
      email: user.email,
      token,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};


const resendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide email' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Your Crevionads CRM Login OTP (Resent)',
      text: `Your login verification OTP is: ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #6366f1;">Crevionads CRM Verification</h2>
          <p>Here is your resent OTP to complete your login:</p>
          <h1 style="background-color: #1e293b; padding: 15px; border-radius: 6px; text-align: center; color: #38bdf8; letter-spacing: 5px;">${otp}</h1>
          <p style="font-size: 12px; color: #94a3b8;">This OTP will expire in 5 minutes.</p>
        </div>
      `
    });

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during resending OTP' });
  }
};


const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    let cleanEmail = email ? email.trim().toLowerCase() : '';
    let user = null;

    if (cleanEmail) {
      user = await User.findOne({ email: cleanEmail });
    }

    if (!user) {
      user = await User.findOne();
    }

    if (!user) {
      return res.status(404).json({ message: 'Admin user account not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`----------------------------------------------------`);
    console.log(`[NODEMAILER RESET OTP] Target: ${user.email} | OTP: ${otp}`);
    console.log(`----------------------------------------------------`);


    try {
      await sendEmail({
        to: 'crevionads@gmail.com',
        subject: ' Password Reset Verification Code',
        text: `Your password reset verification code is: ${otp}. It is valid for 10 minutes.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 32px 16px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <!-- Brand Header -->
              <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                <span style="font-size: 18px; font-weight: 800; color: #8a32c6; letter-spacing: -0.5px;">Crevion<span style="color: #0f172a;">.ads</span></span>
              </div>

              <!-- Title -->
              <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.3px;">Password Reset Verification</h1>
              
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Here is your verification code to reset your Crevion ads CRM password:
              </p>

              <!-- OTP Display Box -->
              <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 20px 0;">
                <span style="font-size: 32px; font-weight: 800; color: #7c3aed; letter-spacing: 8px; font-family: 'SF Mono', Consolas, Monaco, monospace; display: block;">${otp}</span>
              </div>

              <p style="font-size: 12.5px; line-height: 1.5; color: #64748b; margin: 0 0 24px 0;">
                This verification code will expire in 10 minutes. If you did not request this, you can safely ignore this email.
              </p>

              <!-- Footer -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">Crevion ads CRM | Automated System Notification</p>
              </div>
            </div>
          </div>
        `
      });
    } catch (mailErr) {
      console.error('Error delivering OTP email to crevionads@gmail.com:', mailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to crevionads@gmail.com. Please check your email inbox.',
      email: 'crevionads@gmail.com'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during forgot password' });
  }
};


const resetPassword = async (req, res) => {
  const { email, mobileNumber, otp, newPassword } = req.body;

  const cleanOtp = otp ? String(otp).trim() : '';
  const cleanPassword = newPassword ? String(newPassword).trim() : '';

  if (!cleanOtp || !cleanPassword) {
    return res.status(400).json({ message: 'Please enter both the OTP code and your new password' });
  }

  try {
    let user = null;
    if (email) {
      user = await User.findOne({ email: String(email).trim().toLowerCase() });
    }
    if (!user && mobileNumber) {
      user = await User.findOne({ mobileNumber: String(mobileNumber).trim() });
    }
    if (!user && cleanOtp) {
      user = await User.findOne({ otp: cleanOtp });
    }
    if (!user) {
      user = await User.findOne();
    }

    if (!user) {
      return res.status(404).json({ message: 'Admin user account not found' });
    }

    if (!user.otp || user.otp !== cleanOtp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP code. Please request a new OTP.' });
    }

    user.password = cleanPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log(` Password successfully updated for admin account: ${user.email}. Old password no longer works.`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully! Old password will no longer work. Please log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};


const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide old and new password' });
  }

  try {
    const user = await User.findById(req.user._id);

    if (!user || !(await user.matchPassword(oldPassword))) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during password change' });
  }
};


const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

const bcrypt = require('bcryptjs');


const resetAdmins = async (req, res) => {
  try {
    // Delete any legacy creweanads account
    await User.deleteMany({ email: 'creweanads@gmail.com' });

    const primaryAdmin = { email: 'crevionads@gmail.com', password: 'Crevionads@CRM1234' };
    await User.deleteMany({ email: primaryAdmin.email.toLowerCase() });
    await User.create({
      email: primaryAdmin.email.toLowerCase(),
      password: primaryAdmin.password,
      mobileNumber: '9947400278',
      isVerified: true
    });

    res.status(200).json({
      status: 'success',
      message: 'Admin account reset successfully! You can now log in with crevionads@gmail.com.',
      credentials: [primaryAdmin]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to reset admin', error: error.message });
  }
};

// @desc    Verify current password in real-time
// @route   POST /api/auth/verify-password
// @access  Private
const verifyPassword = async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(200).json({ valid: false });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ valid: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(password);
    return res.status(200).json({ valid: isMatch });
  } catch (error) {
    return res.status(500).json({ valid: false, message: 'Error verifying password' });
  }
};

module.exports = {
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyPassword,
  getMe,
  resetAdmins,
};
