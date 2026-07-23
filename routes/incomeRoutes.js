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

router.route('/')
  .get(protect, getIncomes)
  .post(protect, upload.single('receiptImage'), createIncome);

router.route('/:id')
  .put(protect, upload.single('receiptImage'), updateIncome)
  .delete(protect, deleteIncome);

module.exports = router;
