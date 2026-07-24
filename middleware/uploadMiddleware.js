const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const Settings = require('../models/Settings');

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File Filter (allows jpeg, jpg, png, gif, webp, svg, pdf)
const fileFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png|gif|webp|svg|pdf/;
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const isAllowedMime = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';

  if (extname || isAllowedMime) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDFs are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to handle upload to Cloudinary or fallback to local URL
const uploadToCloudinaryOrLocal = async (file) => {
  if (!file) return null;

  try {
    // 1. Try checking env variables first
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;

    // 2. Fallback to settings collection in Database
    if (!cloudName || !apiKey || !apiSecret) {
      const settings = await Settings.findOne();
      if (settings && settings.cloudinaryConfig) {
        cloudName = settings.cloudinaryConfig.cloudName;
        apiKey = settings.cloudinaryConfig.apiKey;
        apiSecret = settings.cloudinaryConfig.apiSecret;
      }
    }

    if (cloudName && apiKey && apiSecret && !cloudName.includes('your_')) {
      // Configure Cloudinary
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'crevionads_crm',
        resource_type: 'auto'
      });

      // Delete local temporary file
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }

      return result.secure_url;
    }

    // Fallback: Use local file URL
    return `https://tweaki.pw/crm/uploads/${file.filename}`;
  } catch (error) {
    console.error('Cloudinary upload failed, falling back to local storage:', error);
    return `https://tweaki.pw/crm/uploads/${file.filename}`;
  }
};

module.exports = { upload, uploadToCloudinaryOrLocal };
