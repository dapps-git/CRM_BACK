const Note = require('../models/Note');

// GET all notes
const getNotes = async (req, res) => {
  try {
    const notes = await Note.find().sort({ pinned: -1, updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

// CREATE note
const createNote = async (req, res) => {
  try {
    const { title, content, color } = req.body;
    const note = await Note.create({ title, content, color });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create note' });
  }
};

// UPDATE note
const updateNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: false }
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update note' });
  }
};

// DELETE note
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note' });
  }
};

// TOGGLE PIN
const togglePin = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    note.pinned = !note.pinned;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle pin' });
  }
};

module.exports = { getNotes, createNote, updateNote, deleteNote, togglePin };
