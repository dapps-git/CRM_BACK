const Expense = require('../models/Expense');
const { uploadToCloudinaryOrLocal } = require('../middleware/uploadMiddleware');

// @desc    Get all expenses (with filtering)
// @route   GET /api/expense
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, partner, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (category) {
      filter.category = category;
    }

    if (partner) {
      filter.partner = partner;
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      expenses,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving expense records' });
  }
};

// @desc    Create an expense record
// @route   POST /api/expense
// @access  Private
const createExpense = async (req, res) => {
  try {
    const { amount, date, category, reason, description, partner } = req.body;

    let billImageUrl = '';
    if (req.file) {
      billImageUrl = await uploadToCloudinaryOrLocal(req.file);
    }

    const expense = await Expense.create({
      amount: Number(amount),
      date: date || new Date(),
      category,
      reason,
      description,
      partner,
      billImage: billImageUrl
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Failed to create expense record' });
  }
};

// @desc    Update an expense record
// @route   PUT /api/expense/:id
// @access  Private
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense record not found' });
    }

    let updatedData = { ...req.body };
    if (updatedData.amount) updatedData.amount = Number(updatedData.amount);

    if (req.file) {
      updatedData.billImage = await uploadToCloudinaryOrLocal(req.file);
    }

    const updated = await Expense.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Failed to update expense record' });
  }
};

// @desc    Delete an expense record
// @route   DELETE /api/expense/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense record not found' });
    }

    await expense.deleteOne();
    res.status(200).json({ message: 'Expense record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete expense record' });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
};
