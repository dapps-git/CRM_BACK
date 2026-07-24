const express = require('express');
const router = express.Router();
const {
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome
} = require('../controllers/incomeController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const handleUpload = (fieldname) => (req, res, next) => {
  upload.single(fieldname)(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ message: err.message || 'Error processing uploaded file' });
    }
    next();
  });
};

router.route('/')
  .get(protect, getIncomes)
  .post(protect, handleUpload('receiptImage'), createIncome);

router.route('/:id')
  .put(protect, handleUpload('receiptImage'), updateIncome)
  .delete(protect, deleteIncome);

module.exports = router;
