const Member = require('../models/Member');

// @desc    Get all members with search
// @route   GET /api/member
// @access  Private
const getMembers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const members = await Member.find(query).sort({ name: 1 });
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving members' });
  }
};

// @desc    Create a member
// @route   POST /api/member
// @access  Private
const createMember = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ message: 'Please provide name and phone number' });
    }

    const member = await Member.create({ name, phoneNumber });
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create member' });
  }
};

// @desc    Update a member
// @route   PUT /api/member/:id
// @access  Private
const updateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const updated = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update member' });
  }
};

// @desc    Delete a member
// @route   DELETE /api/member/:id
// @access  Private
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    await member.deleteOne();
    res.status(200).json({ message: 'Member deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete member' });
  }
};

module.exports = {
  getMembers,
  createMember,
  updateMember,
  deleteMember
};
