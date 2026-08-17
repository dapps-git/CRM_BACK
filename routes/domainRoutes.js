const express = require('express');
const router = express.Router();
const {
  getDomains,
  getDomainById,
  createDomain,
  updateDomain,
  deleteDomain,
  triggerSendAlert,
} = require('../controllers/domainController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:id/send-alert', protect, triggerSendAlert);

router.route('/')
  .get(protect, getDomains)
  .post(protect, createDomain);

router.route('/:id')
  .get(protect, getDomainById)
  .put(protect, updateDomain)
  .delete(protect, deleteDomain);

module.exports = router;
