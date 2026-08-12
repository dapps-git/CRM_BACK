const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  togglePin
} = require('../controllers/noteController');

router.get('/',            protect, getNotes);
router.post('/',           protect, createNote);
router.put('/:id',         protect, updateNote);
router.delete('/:id',      protect, deleteNote);
router.patch('/:id/pin',   protect, togglePin);

module.exports = router;
