const Invoice = require('../models/Invoice');
const InvoiceCompanyConfig = require('../models/InvoiceCompanyConfig');
const DescriptionSuggestion = require('../models/DescriptionSuggestion');

// Default Crevion Ads address details
const DEFAULT_COMPANY = {
  name: 'Crevion ads',
  phone: '+91 81139 08262',
  email: 'crevionads@gmail.com',
  website: 'Crevionads.com',
  address: 'K.P.M Arcade, Kerala, Valanchery, India'
};

// @desc    Get all invoices
// @route   GET /api/invoice
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { clientName: { $regex: search, $options: 'i' } },
          { clientPhone: { $regex: search, $options: 'i' } },
          { clientEmail: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      invoices,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('getInvoices error:', error);
    res.status(500).json({ message: 'Server error retrieving invoices' });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoice/:id
// @access  Private
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving invoice' });
  }
};

// Helper: Generate next invoice number
const generateNextInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  const nextNum = count + 1;
  return `INV-${String(nextNum).padStart(4, '0')}`;
};

// @desc    Create or Update invoice (upsert so regenerating PDF updates existing record)
// @route   POST /api/invoice
// @access  Private
const createOrUpdateInvoice = async (req, res) => {
  try {
    const {
      _id,
      invoiceNumber,
      clientName,
      clientPhone,
      clientAddress,
      clientEmail,
      invoiceDate,
      terms,
      dueDate,
      items,
      totalAmount,
      receivedAmount,
      balanceDue,
      companyDetails
    } = req.body;

    if (!clientName) {
      return res.status(400).json({ message: 'Client name is required' });
    }

    // Process items & auto-save descriptions to suggestions
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.title && item.title.trim()) {
          const existing = await DescriptionSuggestion.findOne({ title: item.title.trim() });
          if (!existing) {
            await DescriptionSuggestion.create({
              title: item.title.trim(),
              description: item.description ? item.description.trim() : ''
            });
          }
        }
      }
    }

    let invoice;
    if (_id) {
      invoice = await Invoice.findByIdAndUpdate(
        _id,
        {
          invoiceNumber,
          clientName,
          clientPhone,
          clientAddress,
          clientEmail,
          invoiceDate: invoiceDate || new Date(),
          terms: terms || 'Due on receipt',
          dueDate: dueDate || new Date(),
          items: items || [],
          totalAmount: Number(totalAmount) || 0,
          receivedAmount: Number(receivedAmount) || 0,
          balanceDue: Number(balanceDue) || 0,
          companyDetails: companyDetails || DEFAULT_COMPANY
        },
        { new: true, runValidators: false }
      );
    } else if (invoiceNumber) {
      // Check if invoice with this invoiceNumber already exists
      const existing = await Invoice.findOne({ invoiceNumber });
      if (existing) {
        invoice = await Invoice.findByIdAndUpdate(
          existing._id,
          {
            clientName,
            clientPhone,
            clientAddress,
            clientEmail,
            invoiceDate: invoiceDate || new Date(),
            terms: terms || 'Due on receipt',
            dueDate: dueDate || new Date(),
            items: items || [],
            totalAmount: Number(totalAmount) || 0,
            receivedAmount: Number(receivedAmount) || 0,
            balanceDue: Number(balanceDue) || 0,
            companyDetails: companyDetails || DEFAULT_COMPANY
          },
          { new: true, runValidators: false }
        );
      }
    }

    if (!invoice) {
      const finalInvoiceNum = invoiceNumber || await generateNextInvoiceNumber();
      invoice = await Invoice.create({
        invoiceNumber: finalInvoiceNum,
        clientName,
        clientPhone,
        clientAddress,
        clientEmail,
        invoiceDate: invoiceDate || new Date(),
        terms: terms || 'Due on receipt',
        dueDate: dueDate || new Date(),
        items: items || [],
        totalAmount: Number(totalAmount) || 0,
        receivedAmount: Number(receivedAmount) || 0,
        balanceDue: Number(balanceDue) || 0,
        companyDetails: companyDetails || DEFAULT_COMPANY
      });
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error('createOrUpdateInvoice error:', error);
    res.status(400).json({ message: error.message || 'Failed to save invoice' });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoice/:id
// @access  Private
const updateInvoice = async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: false }
    );
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update invoice' });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoice/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    await invoice.deleteOne();
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete invoice' });
  }
};

// @desc    Get permanent company address & details config
// @route   GET /api/invoice/config
// @access  Private
const getCompanyConfig = async (req, res) => {
  try {
    let config = await InvoiceCompanyConfig.findOne();
    if (!config) {
      config = await InvoiceCompanyConfig.create(DEFAULT_COMPANY);
    }
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve company details' });
  }
};

// @desc    Update permanent company address & details config
// @route   PUT /api/invoice/config
// @access  Private
const updateCompanyConfig = async (req, res) => {
  try {
    let config = await InvoiceCompanyConfig.findOne();
    if (!config) {
      config = await InvoiceCompanyConfig.create({ ...DEFAULT_COMPANY, ...req.body });
    } else {
      config = await InvoiceCompanyConfig.findByIdAndUpdate(config._id, req.body, { new: true });
    }
    res.status(200).json(config);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update company details' });
  }
};

const DEFAULT_SUGGESTIONS = [
  { title: 'Meta Ads', description: 'Professional Meta Ads campaign setup, audience targeting, campaign management, optimization, and performance monitoring for Facebook and Instagram advertising.' },
  { title: 'Poster', description: 'Professional poster design services with creative layouts, premium visuals, and brand-focused design.' },
  { title: 'Video', description: 'Professional video editing with visual effects, sound optimization, subtitles, branding elements, and production-ready delivery.' },
  { title: 'GMB Creation', description: 'Google My Business (GMB) profile creation, business information setup, and optimization for improved local online visibility.' },
  { title: 'GMB SEO', description: 'Google Business Profile (GMB) SEO optimization to improve local search rankings, visibility, and customer engagement.' },
  { title: 'Static Website', description: 'Professional static website development including custom design, navigation, contact form, and SEO-friendly structure.' },
  { title: 'Dynamic Website', description: 'Professional dynamic website development featuring an admin panel, database integration, responsive UI, and scalable functionality.' },
  { title: 'Ecommerce', description: 'E-commerce website design and development with product catalog, shopping cart, secure checkout, payment gateway integration, and responsive design.' },
  { title: 'AI Videos', description: 'AI-generated video creation with custom visuals, animations, voiceover integration, and professional editing.' },
  { title: 'Branding', description: 'Professional branding services including brand strategy, visual identity, logo usage, color palette, and brand guidelines.' },
  { title: 'Letter Head', description: 'Professional letterhead design with a custom branded layout, corporate identity, and print-ready format.' },
  { title: 'Visiting Card', description: 'Professional visiting card design with custom branding, premium layout, and print-ready artwork.' },
  { title: 'NFC Card', description: 'Custom NFC business card setup and configuration with digital contact sharing and brand customization.' },
  { title: 'Website Seo', description: 'Professional website SEO services to improve search engine rankings, organic traffic, and overall website visibility.' },
  { title: 'GMB Number Adding', description: 'Google Business Profile contact number setup and profile information update.' }
];

// @desc    Get reusable description suggestions
// @route   GET /api/invoice/suggestions
// @access  Private
const getSuggestions = async (req, res) => {
  try {
    let suggestions = await DescriptionSuggestion.find().sort({ title: 1 });
    if (!suggestions || suggestions.length === 0) {
      await DescriptionSuggestion.insertMany(DEFAULT_SUGGESTIONS);
      suggestions = await DescriptionSuggestion.find().sort({ title: 1 });
    } else {
      for (const def of DEFAULT_SUGGESTIONS) {
        const exists = suggestions.some(s => s.title.toLowerCase() === def.title.toLowerCase());
        if (!exists) {
          await DescriptionSuggestion.create(def);
        }
      }
      suggestions = await DescriptionSuggestion.find().sort({ title: 1 });
    }
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load suggestions' });
  }
};

// @desc    Save new description suggestion
// @route   POST /api/invoice/suggestions
// @access  Private
const saveSuggestion = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    let suggestion = await DescriptionSuggestion.findOne({ title: title.trim() });
    if (!suggestion) {
      suggestion = await DescriptionSuggestion.create({
        title: title.trim(),
        description: description ? description.trim() : ''
      });
    } else {
      suggestion.description = description || suggestion.description;
      await suggestion.save();
    }

    res.status(200).json(suggestion);
  } catch (error) {
    res.status(400).json({ message: 'Failed to save suggestion' });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createOrUpdateInvoice,
  updateInvoice,
  deleteInvoice,
  getCompanyConfig,
  updateCompanyConfig,
  getSuggestions,
  saveSuggestion
};
