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

router.route('/')
  .get(protect, getExpenses)
  .post(protect, upload.single('billImage'), createExpense);

router.route('/:id')
  .put(protect, upload.single('billImage'), updateExpense)
  .delete(protect, deleteExpense);

module.exports = router;
