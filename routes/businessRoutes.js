const express = require('express');
const router = express.Router();
const {
  getBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  exportExcel,
  exportPDF
} = require('../controllers/businessController');
const { protect } = require('../middleware/authMiddleware');

router.get('/export/excel', protect, exportExcel);
router.get('/export/pdf', protect, exportPDF);

router.route('/')
  .get(protect, getBusinesses)
  .post(protect, createBusiness);

router.route('/:id')
  .get(protect, getBusinessById)
  .put(protect, updateBusiness)
  .delete(protect, deleteBusiness);

module.exports = router;
