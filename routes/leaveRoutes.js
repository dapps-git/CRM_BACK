const express = require('express');
const router = express.Router();
const {
  markLeave,
  deleteLeave,
  getMonthlySummary
} = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, markLeave);

router.route('/summary')
  .get(protect, getMonthlySummary);

router.route('/:id')
  .delete(protect, deleteLeave);

module.exports = router;
