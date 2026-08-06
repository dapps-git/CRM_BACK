const Business = require('../models/Business');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// @desc    Get all businesses with search, sort, pagination
// @route   GET /api/business
// @access  Private
const getBusinesses = async (req, res) => {
  try {
    const { search, sortBy, order, page = 1 } = req.query;
    const limit = 7; // Limit is fixed at 7 records per page
    const skip = (page - 1) * limit;

    // Filter Query
    let query = {};
    if (search) {
      query = {
        $or: [
          { businessName: { $regex: search, $options: 'i' } },
          { agentName: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { requirement: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Sort Query
    let sort = { date: -1 }; // Default sort is date descending
    if (sortBy) {
      const sortOrder = order === 'asc' ? 1 : -1;
      if (sortBy === 'businessName') {
        sort = { businessName: sortOrder };
      } else if (sortBy === 'date') {
        sort = { date: sortOrder };
      } else {
        sort = { [sortBy]: sortOrder };
      }
    }

    const total = await Business.countDocuments(query);
    const businesses = await Business.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      businesses,
      page: Number(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving businesses' });
  }
};

// @desc    Get single business
// @route   GET /api/business/:id
// @access  Private
const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ message: 'Business record not found' });
    }
    res.status(200).json(business);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving business record' });
  }
};

// @desc    Create a business
// @route   POST /api/business
// @access  Private
const createBusiness = async (req, res) => {
  try {
    const { businessName, agentName, role, contactNumber, location, requirement, description, date } = req.body;

    const business = await Business.create({
      businessName,
      agentName,
      role,
      contactNumber,
      location,
      requirement,
      description,
      date: date || new Date()
    });

    res.status(201).json(business);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Invalid data' });
  }
};

// @desc    Update a business
// @route   PUT /api/business/:id
// @access  Private
const updateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ message: 'Business record not found' });
    }

    const { businessName, agentName, role, contactNumber, location, requirement, description, date } = req.body;

    const updated = await Business.findByIdAndUpdate(
      req.params.id,
      { businessName, agentName, role, contactNumber, location, requirement, description, date },
      { new: true, runValidators: false }
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update business error:', error);
    res.status(400).json({ message: error.message || 'Failed to update business' });
  }
};

// @desc    Delete a business
// @route   DELETE /api/business/:id
// @access  Private
const deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ message: 'Business record not found' });
    }

    await business.deleteOne();
    res.status(200).json({ message: 'Business record removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete business' });
  }
};

// @desc    Export businesses to Excel
// @route   GET /api/business/export/excel
// @access  Private
const exportExcel = async (req, res) => {
  try {
    const businesses = await Business.find().sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Businesses');

    worksheet.columns = [
      { header: 'Business Name', key: 'businessName', width: 25 },
      { header: 'Agent Name', key: 'agentName', width: 20 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Contact Number', key: 'contactNumber', width: 18 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Requirement', key: 'requirement', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Date Added', key: 'date', width: 15 }
    ];

    // Styling Headers
    worksheet.getRow(1).font = { bold: true };

    businesses.forEach((item) => {
      worksheet.addRow({
        businessName: item.businessName,
        agentName: item.agentName,
        role: item.role,
        contactNumber: item.contactNumber,
        location: item.location,
        requirement: Array.isArray(item.requirement) ? item.requirement.join(', ') : (item.requirement || ''),
        description: item.description,
        date: new Date(item.date).toLocaleDateString()
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'businesses.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to export Excel report' });
  }
};

// @desc    Export businesses to PDF
// @route   GET /api/business/export/pdf
// @access  Private
const exportPDF = async (req, res) => {
  try {
    const businesses = await Business.find().sort({ date: -1 });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=businesses.pdf');

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Crevionads Business leads Report', { align: 'center' });
    doc.moveDown();

    // Table settings
    const tableTop = 100;
    const rowHeight = 35;
    const colWidths = [120, 90, 100, 110, 110]; // Fit in A4 size
    const cols = ['Business Name', 'Agent', 'Contact', 'Location', 'Requirement'];

    // Headers
    doc.fontSize(10).font('Helvetica-Bold');
    let x = 30;
    cols.forEach((col, i) => {
      doc.text(col, x, tableTop);
      x += colWidths[i];
    });

    // Draw horizontal line
    doc.moveTo(30, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    // Rows
    let y = tableTop + 25;
    doc.font('Helvetica');
    businesses.forEach((item) => {
      if (y > 750) {
        doc.addPage();
        y = 50; // New page starting point
      }
      doc.text(item.businessName.substring(0, 20), 30, y);
      doc.text(item.agentName.substring(0, 15), 150, y);
      doc.text(item.contactNumber.substring(0, 15), 240, y);
      doc.text(item.location.substring(0, 15), 340, y);
      const reqStr = Array.isArray(item.requirement) ? item.requirement.join(', ') : (item.requirement || '');
      doc.text(reqStr.substring(0, 20), 450, y);
      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to export PDF report' });
  }
};

module.exports = {
  getBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  exportExcel,
  exportPDF
};
