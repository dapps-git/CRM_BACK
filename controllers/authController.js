const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Helper to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey_crevionads_12345', {
    expiresIn: process.env.SESSION_EXPIRY || '24h',
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

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
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

// @desc    Request forgot password OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide email' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Email does not exist' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Reset Password OTP - Crevionads CRM',
      text: `Your password reset OTP is: ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #ef4444;">Reset Password Verification</h2>
          <p>We received a request to reset your password. Use this OTP to verify your identity:</p>
          <h1 style="background-color: #1e293b; padding: 15px; border-radius: 6px; text-align: center; color: #f43f5e; letter-spacing: 5px;">${otp}</h1>
          <p style="font-size: 12px; color: #94a3b8;">If you did not request this, you can ignore this email.</p>
        </div>
      `
    });

    res.status(200).json({ message: 'Password reset OTP sent to email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during forgot password' });
  }
};

// @desc    Verify forgot password OTP & set new password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Please provide all details' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Set new password
    user.password = newPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successful. You can log in now.' });
  } catch (error) {
    console.error(error);
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

// @desc    Force reset admin default users in database
// @route   GET /api/auth/reset-admins
// @access  Public
const resetAdmins = async (req, res) => {
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
    }

    res.status(200).json({ 
      status: 'success', 
      message: 'Admin accounts reset successfully! You can now log in.',
      credentials: admins 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to reset admins', error: error.message });
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
