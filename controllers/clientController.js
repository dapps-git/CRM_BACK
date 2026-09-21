const Client = require('../models/Client');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// @desc    Get all clients with search, sort, pagination
// @route   GET /api/client
// @access  Private
const getClients = async (req, res) => {
  try {
    const { search, sortBy, order, page = 1 } = req.query;
    const limit = 7; // Limit is fixed at 7 records per page
    const skip = (page - 1) * limit;

    // Filter Query
    let query = {};
    if (search) {
      query = {
        $or: [
          { clientName: { $regex: search, $options: 'i' } },
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
      if (sortBy === 'clientName') {
        sort = { clientName: sortOrder };
      } else if (sortBy === 'date') {
        sort = { date: sortOrder };
      } else {
        sort = { [sortBy]: sortOrder };
      }
    }

    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      clients,
      page: Number(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving clients' });
  }
};

// @desc    Get single client
// @route   GET /api/client/:id
// @access  Private
const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client record not found' });
    }
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving client record' });
  }
};

// @desc    Create a client
// @route   POST /api/client
// @access  Private
const createClient = async (req, res) => {
  try {
    const { clientName, agentName, role, contactNumber, location, requirement, description, date } = req.body;

    const client = await Client.create({
      clientName,
      agentName,
      role,
      contactNumber,
      location,
      requirement,
      description,
      date: date || new Date()
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(400).json({ message: error.message || 'Failed to create client record' });
  }
};

// @desc    Update a client
// @route   PUT /api/client/:id
// @access  Private
const updateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client record not found' });
    }

    const { clientName, agentName, role, contactNumber, location, requirement, description, date } = req.body;

    const updated = await Client.findByIdAndUpdate(
      req.params.id,
      { clientName, agentName, role, contactNumber, location, requirement, description, date },
      { new: true, runValidators: false }
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(400).json({ message: error.message || 'Failed to update client' });
  }
};

// @desc    Delete a client
// @route   DELETE /api/client/:id
// @access  Private
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client record not found' });
    }

    await client.deleteOne();
    res.status(200).json({ message: 'Client record removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete client' });
  }
};

// @desc    Export clients to Excel
// @route   GET /api/client/export/excel
// @access  Private
const exportExcel = async (req, res) => {
  try {
    const clients = await Client.find().sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients');

    worksheet.columns = [
      { header: 'Client Name', key: 'clientName', width: 25 },
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

    clients.forEach((item) => {
      worksheet.addRow({
        clientName: item.clientName,
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
      'attachment; filename=' + 'our_clients.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to export Excel report' });
  }
};

// @desc    Export clients to PDF
// @route   GET /api/client/export/pdf
// @access  Private
const exportPDF = async (req, res) => {
  try {
    const clients = await Client.find().sort({ date: -1 });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=our_clients.pdf');

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Crevionads Our Clients Report', { align: 'center' });
    doc.moveDown();

    // Table settings
    const tableTop = 100;
    const rowHeight = 35;
    const colWidths = [120, 90, 100, 110, 110]; // Fit in A4 size
    const cols = ['Client Name', 'Agent', 'Contact', 'Location', 'Requirement'];

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
    clients.forEach((item) => {
      if (y > 750) {
        doc.addPage();
        y = 50; // New page starting point
      }
      doc.text(item.clientName.substring(0, 20), 30, y);
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
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  exportExcel,
  exportPDF
};
