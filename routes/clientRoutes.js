const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  exportExcel,
  exportPDF
} = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');

router.get('/export/excel', protect, exportExcel);
router.get('/export/pdf', protect, exportPDF);

router.route('/')
  .get(protect, getClients)
  .post(protect, createClient);

router.route('/:id')
  .get(protect, getClientById)
  .put(protect, updateClient)
  .delete(protect, deleteClient);

module.exports = router;
