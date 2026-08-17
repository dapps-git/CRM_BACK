const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const ENCRYPTED_JWT_SECRET = require('../config/jwtConfig');

// Helper to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to sign JWT using SHA-256 encrypted secret key
const signToken = (id) => {
  return jwt.sign({ id }, ENCRYPTED_JWT_SECRET, {
    expiresIn: process.env.SESSION_EXPIRY || '365d',
  });
};

// @desc    Check login credentials and issue JWT directly
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ message: 'User account not found' });
    }

    const isMatch = await user.matchPassword(password.trim());
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

// @desc    Step 2: Verify OTP and issue JWT
// @route   POST /api/auth/verify-otp
// @access  Public
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

// @desc    Resend login OTP
// @route   POST /api/auth/resend-otp
// @access  Public
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

// @desc    Request forgot password OTP via Nodemailer
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    let cleanEmail = email ? email.trim().toLowerCase() : '';
    let user = null;

    if (cleanEmail) {
      user = await User.findOne({ email: cleanEmail });
    }

    // Fallback to primary admin account
    if (!user) {
      user = await User.findOne();
    }

    if (!user) {
      return res.status(404).json({ message: 'Admin user account not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes valid
    await user.save();

    console.log(`----------------------------------------------------`);
    console.log(`[NODEMAILER RESET OTP] Target: ${user.email} | OTP: ${otp}`);
    console.log(`----------------------------------------------------`);

    // Send OTP email using Nodemailer
    await sendEmail({
      to: user.email,
      subject: '🔑 Your Crevionads CRM Password Reset OTP',
      text: `Your password reset verification OTP is: ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #f4ce41; margin-top: 0;">🔑 Password Reset Verification</h2>
          <p style="font-size: 14px; color: #cbd5e1;">Use the verification code below to reset your Crevionads CRM admin password:</p>
          <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #334155; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: 800; color: #f43f5e; letter-spacing: 6px; font-family: monospace;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">This verification code is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
      `
    });

    res.status(200).json({ 
      success: true,
      message: `OTP code sent via email to ${user.email}`,
      email: user.email
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during forgot password' });
  }
};

// @desc    Verify forgot password OTP & set new password
// @route   POST /api/auth/reset-password
// @access  Public
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

    // Set new password (will be hashed automatically by pre-save hook)
    user.password = cleanPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log(`✅ Password successfully updated for admin account: ${user.email}. Old password no longer works.`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully! Old password will no longer work. Please log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// @desc    Change password (authenticated)
// @route   POST /api/auth/change-password
// @access  Private
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

// @desc    Get current user profile details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

const bcrypt = require('bcryptjs');

// @desc    Force reset admin default user in database
// @route   GET /api/auth/reset-admins
// @access  Public
const resetAdmins = async (req, res) => {
  try {
    // Delete any legacy creweanads account
    await User.deleteMany({ email: 'creweanads@gmail.com' });

    const primaryAdmin = { email: 'crevionads@gmail.com', password: 'Crevionads@CRM1234' };
    await User.deleteMany({ email: primaryAdmin.email.toLowerCase() });
    await User.create({
      email: primaryAdmin.email.toLowerCase(),
      password: primaryAdmin.password,
      mobileNumber: '9745307450',
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

module.exports = {
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  resetAdmins,
};
