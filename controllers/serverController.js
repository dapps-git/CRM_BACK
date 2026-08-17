const ServerConfig = require('../models/ServerConfig');
const { encrypt, decrypt } = require('../utils/encryption');

// Helper to decrypt sensitive password fields for response
const formatServerResponse = (serverObj) => {
  const doc = serverObj.toObject ? serverObj.toObject() : { ...serverObj };
  if (doc.adminPassword) {
    doc.adminPassword = decrypt(doc.adminPassword);
  }
  if (doc.databasePassword) {
    doc.databasePassword = decrypt(doc.databasePassword);
  }
  return doc;
};

// @desc    Get all server configs with search & metrics
// @route   GET /api/server-config
// @access  Private
const getServerConfigs = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { projectName: searchRegex },
        { accountName: searchRegex },
        { websiteUrl: searchRegex },
        { frontendServer: searchRegex },
        { backendServer: searchRegex },
        { adminServer: searchRegex },
        { adminEmail: searchRegex },
        { databaseUrl: searchRegex },
      ];
    }

    const rawServers = await ServerConfig.find(query).sort({ updatedAt: -1 });

    const totalServers = rawServers.length;
    const vercelProjects = rawServers.filter(s => (s.frontendServer || '').toLowerCase().includes('vercel')).length;
    const renderProjects = rawServers.filter(s => (s.backendServer || '').toLowerCase().includes('render')).length;
    const databaseTracked = rawServers.filter(s => !!s.databaseUrl).length;

    // Decrypt sensitive password fields for authorized response
    const decryptedServers = rawServers.map(s => formatServerResponse(s));

    res.status(200).json({
      success: true,
      count: totalServers,
      metrics: {
        totalServers,
        vercelProjects,
        renderProjects,
        databaseTracked
      },
      servers: decryptedServers
    });
  } catch (error) {
    console.error('Error fetching server configs:', error);
    res.status(500).json({ message: 'Failed to fetch server records', error: error.message });
  }
};

// @desc    Get single server config by ID
// @route   GET /api/server-config/:id
// @access  Private
const getServerConfigById = async (req, res) => {
  try {
    const server = await ServerConfig.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server record not found' });
    }
    res.status(200).json(formatServerResponse(server));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching server record', error: error.message });
  }
};

// @desc    Create new server config
// @route   POST /api/server-config
// @access  Private
const createServerConfig = async (req, res) => {
  try {
    const {
      projectName,
      accountName,
      websiteUrl,
      frontendServer,
      backendServer,
      adminServer,
      adminPanelUrl,
      adminEmail,
      adminPassword,
      databaseUrl,
      databasePassword,
      notes
    } = req.body;

    if (!projectName) {
      return res.status(400).json({ message: 'Project Name is required' });
    }

    // Encrypt sensitive passwords before saving at rest in MongoDB
    const server = new ServerConfig({
      projectName,
      accountName: accountName || '',
      websiteUrl: websiteUrl || '',
      frontendServer: frontendServer || 'Vercel',
      backendServer: backendServer || 'Render',
      adminServer: adminServer || 'cPanel',
      adminPanelUrl: adminPanelUrl || '',
      adminEmail: adminEmail || '',
      adminPassword: adminPassword ? encrypt(adminPassword) : '',
      databaseUrl: databaseUrl || '',
      databasePassword: databasePassword ? encrypt(databasePassword) : '',
      notes: notes || ''
    });

    const savedServer = await server.save();
    res.status(201).json(formatServerResponse(savedServer));
  } catch (error) {
    console.error('Error creating server config:', error);
    res.status(500).json({ message: 'Failed to create server record', error: error.message });
  }
};

// @desc    Update server config
// @route   PUT /api/server-config/:id
// @access  Private
const updateServerConfig = async (req, res) => {
  try {
    const server = await ServerConfig.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server record not found' });
    }

    const {
      projectName,
      accountName,
      websiteUrl,
      frontendServer,
      backendServer,
      adminServer,
      adminPanelUrl,
      adminEmail,
      adminPassword,
      databaseUrl,
      databasePassword,
      notes
    } = req.body;

    if (projectName) server.projectName = projectName;
    if (accountName !== undefined) server.accountName = accountName;
    if (websiteUrl !== undefined) server.websiteUrl = websiteUrl;
    if (frontendServer !== undefined) server.frontendServer = frontendServer;
    if (backendServer !== undefined) server.backendServer = backendServer;
    if (adminServer !== undefined) server.adminServer = adminServer;
    if (adminPanelUrl !== undefined) server.adminPanelUrl = adminPanelUrl;
    if (adminEmail !== undefined) server.adminEmail = adminEmail;
    if (adminPassword !== undefined) {
      server.adminPassword = adminPassword ? encrypt(adminPassword) : '';
    }
    if (databaseUrl !== undefined) server.databaseUrl = databaseUrl;
    if (databasePassword !== undefined) {
      server.databasePassword = databasePassword ? encrypt(databasePassword) : '';
    }
    if (notes !== undefined) server.notes = notes;

    const updatedServer = await server.save();
    res.status(200).json(formatServerResponse(updatedServer));
  } catch (error) {
    console.error('Error updating server config:', error);
    res.status(500).json({ message: 'Failed to update server record', error: error.message });
  }
};

// @desc    Delete server config
// @route   DELETE /api/server-config/:id
// @access  Private
const deleteServerConfig = async (req, res) => {
  try {
    const server = await ServerConfig.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server record not found' });
    }

    await ServerConfig.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Server record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete server record', error: error.message });
  }
};

module.exports = {
  getServerConfigs,
  getServerConfigById,
  createServerConfig,
  updateServerConfig,
  deleteServerConfig,
};
