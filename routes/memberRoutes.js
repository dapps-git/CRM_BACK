const express = require('express');
const router = express.Router();
const {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  triggerBirthdayAlert
} = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMembers)
  .post(protect, createMember);

router.route('/:id')
  .put(protect, updateMember)
  .delete(protect, deleteMember);

router.post('/:id/trigger-birthday', protect, triggerBirthdayAlert);

module.exports = router;
