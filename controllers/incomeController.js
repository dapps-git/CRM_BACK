const Income = require('../models/Income');
const { uploadToCloudinaryOrLocal } = require('../middleware/uploadMiddleware');

// @desc    Get all income records (with filtering)
// @route   GET /api/income
// @access  Private
const getIncomes = async (req, res) => {
  try {
    const { startDate, endDate, receiver, source, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (receiver) {
      filter.receiver = receiver;
    }

    if (source) {
      filter.source = { $regex: source, $options: 'i' };
    }

    const total = await Income.countDocuments(filter);
    const incomes = await Income.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      incomes,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving income records' });
  }
};

// @desc    Create an income record
// @route   POST /api/income
// @access  Private
const createIncome = async (req, res) => {
  try {
    const { amount, date, source, receiver, businessName, commissionEnabled, commissionAgent, commissionAmount } = req.body;

    let receiptImageUrl = '';
    if (req.file) {
      receiptImageUrl = await uploadToCloudinaryOrLocal(req.file);
    }

    const income = await Income.create({
      amount: Number(amount),
      date: date || new Date(),
      source,
      receiver,
      businessName,
      commissionEnabled: commissionEnabled === 'true' || commissionEnabled === true,
      commissionAgent,
      commissionAmount: commissionAmount ? Number(commissionAmount) : 0,
      receiptImage: receiptImageUrl
    });

    res.status(201).json(income);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Failed to create income record' });
  }
};

// @desc    Update an income record
// @route   PUT /api/income/:id
// @access  Private
const updateIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) {
      return res.status(404).json({ message: 'Income record not found' });
    }

    let updatedData = { ...req.body };
    
    // Cast variables
    if (updatedData.amount) updatedData.amount = Number(updatedData.amount);
    if (updatedData.commissionAmount) updatedData.commissionAmount = Number(updatedData.commissionAmount);
    if (updatedData.commissionEnabled) {
      updatedData.commissionEnabled = updatedData.commissionEnabled === 'true' || updatedData.commissionEnabled === true;
    }

    if (req.file) {
      updatedData.receiptImage = await uploadToCloudinaryOrLocal(req.file);
    }

    const updated = await Income.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Failed to update income record' });
  }
};

// @desc    Delete an income record
// @route   DELETE /api/income/:id
// @access  Private
const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) {
      return res.status(404).json({ message: 'Income record not found' });
    }

    await income.deleteOne();
    res.status(200).json({ message: 'Income record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete income record' });
  }
};

module.exports = {
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome
};
