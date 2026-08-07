const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  createOrUpdateInvoice,
  updateInvoice,
  deleteInvoice,
  getCompanyConfig,
  updateCompanyConfig,
  getSuggestions,
  saveSuggestion
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

router.get('/config', protect, getCompanyConfig);
router.put('/config', protect, updateCompanyConfig);

router.get('/suggestions', protect, getSuggestions);
router.post('/suggestions', protect, saveSuggestion);

router.route('/')
  .get(protect, getInvoices)
  .post(protect, createOrUpdateInvoice);

router.route('/:id')
  .get(protect, getInvoiceById)
  .put(protect, updateInvoice)
  .delete(protect, deleteInvoice);

module.exports = router;
