const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} = require('../controllers/expenseController');
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
  .get(protect, getExpenses)
  .post(protect, handleUpload('billImage'), createExpense);

router.route('/:id')
  .put(protect, handleUpload('billImage'), updateExpense)
  .delete(protect, deleteExpense);

module.exports = router;
