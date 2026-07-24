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

// Multer Memory Storage Configuration (avoids cPanel disk write permission issues)
const storage = multer.memoryStorage();

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

// Helper function to handle upload to Cloudinary or fallback to Base64 Data URI
const uploadToCloudinaryOrLocal = async (file) => {
  if (!file) return null;

  try {
    // 1. Convert buffer to base64 Data URI
    let fileData;
    if (file.buffer) {
      fileData = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    } else if (file.path && fs.existsSync(file.path)) {
      const b = fs.readFileSync(file.path);
      fileData = `data:${file.mimetype};base64,${b.toString('base64')}`;
    }

    // 2. Try Cloudinary configuration
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      const settings = await Settings.findOne();
      if (settings && settings.cloudinaryConfig) {
        cloudName = settings.cloudinaryConfig.cloudName;
        apiKey = settings.cloudinaryConfig.apiKey;
        apiSecret = settings.cloudinaryConfig.apiSecret;
      }
    }

    if (cloudName && apiKey && apiSecret && !cloudName.includes('your_') && fileData) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });

      const result = await cloudinary.uploader.upload(fileData, {
        folder: 'crevionads_crm',
        resource_type: 'auto'
      });

      return result.secure_url;
    }

    // Fallback: Return Base64 Data URI directly
    return fileData || '';
  } catch (error) {
    console.error('Upload error fallback:', error);
    if (file && file.buffer) {
      return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }
    return '';
  }
};

module.exports = { upload, uploadToCloudinaryOrLocal };
