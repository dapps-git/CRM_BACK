const Settings = require('../models/Settings');
const { uploadToCloudinaryOrLocal } = require('../middleware/uploadMiddleware');

// @desc    Get system settings (singleton)
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if not exists
      settings = await Settings.create({
        companyName: 'Crevionads',
        theme: 'dark'
      });
    }
    res.status(200).json({
      companyName: settings.companyName,
      companyLogo: settings.companyLogo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving settings' });
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const { companyName, theme, emailConfig, cloudinaryConfig } = req.body;

    if (companyName) settings.companyName = companyName;
    if (theme) settings.theme = theme;

    // Parse sub-objects if they arrive as JSON string (usually from multipart/form-data upload)
    if (emailConfig) {
      settings.emailConfig = typeof emailConfig === 'string' ? JSON.parse(emailConfig) : emailConfig;
    }
    if (cloudinaryConfig) {
      settings.cloudinaryConfig = typeof cloudinaryConfig === 'string' ? JSON.parse(cloudinaryConfig) : cloudinaryConfig;
    }

    // Handle company logo file upload
    if (req.file) {
      settings.companyLogo = await uploadToCloudinaryOrLocal(req.file);
    }

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Failed to update settings' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
