const express = require('express');
const router = express.Router();
const {
  getServerConfigs,
  getServerConfigById,
  createServerConfig,
  updateServerConfig,
  deleteServerConfig,
} = require('../controllers/serverController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getServerConfigs)
  .post(protect, createServerConfig);

router.route('/:id')
  .get(protect, getServerConfigById)
  .put(protect, updateServerConfig)
  .delete(protect, deleteServerConfig);

module.exports = router;
