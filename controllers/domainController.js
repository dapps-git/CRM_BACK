const Domain = require('../models/Domain');
const sendEmail = require('../utils/sendEmail');

// Helper to format date for email notifications
const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// @desc    Get all domain records with search, filter & metrics
// @route   GET /api/domain
// @access  Private
const getDomains = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { domainName: searchRegex },
        { projectName: searchRegex },
        { platform: searchRegex },
        { accountHolder: searchRegex },
        { ownerEmail: searchRegex },
      ];
    }

    if (status && ['Active', 'Expiring Soon', 'Expired'].includes(status)) {
      query.status = status;
    }

    const allDomains = await Domain.find(query).sort({ expirationDate: 1 });

    // Recalculate status dynamically for accuracy & trigger 2-week auto email alerts
    const now = new Date();
    const updatedDomains = await Promise.all(allDomains.map(async (domain) => {
      const newStatus = domain.calculateStatus();
      if (domain.status !== newStatus) {
        domain.status = newStatus;
        await domain.save();
      }

      // Check for 2-week (14 days) expiry alert auto-trigger if not sent recently
      if (domain.expirationDate) {
        const diffDays = Math.ceil((new Date(domain.expirationDate) - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 14 && diffDays >= 0) {
          // If alert wasn't sent in last 7 days
          const lastSent = domain.alertSentAt ? new Date(domain.alertSentAt) : null;
          const daysSinceAlert = lastSent ? (now - lastSent) / (1000 * 60 * 60 * 24) : 999;
          if (daysSinceAlert >= 7) {
            sendExpiryAlertEmail(domain).catch(err => console.error('Auto alert email failed:', err.message));
          }
        }
      }

      return domain;
    }));

    // Calculate metrics
    const totalDomains = updatedDomains.length;
    const activeDomains = updatedDomains.filter(d => d.status === 'Active').length;
    const expiringSoon = updatedDomains.filter(d => d.status === 'Expiring Soon').length;
    const expiredDomains = updatedDomains.filter(d => d.status === 'Expired').length;
    const totalRenewalCost = updatedDomains.reduce((sum, d) => sum + (Number(d.renewalCost) || 0), 0);

    res.status(200).json({
      success: true,
      count: totalDomains,
      metrics: {
        totalDomains,
        activeDomains,
        expiringSoon,
        expiredDomains,
        totalRenewalCost
      },
      domains: updatedDomains
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ message: 'Failed to fetch domain records', error: error.message });
  }
};

// @desc    Get single domain by ID
// @route   GET /api/domain/:id
// @access  Private
const getDomainById = async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({ message: 'Domain record not found' });
    }
    res.status(200).json(domain);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving domain record', error: error.message });
  }
};

// @desc    Create new domain record
// @route   POST /api/domain
// @access  Private
const createDomain = async (req, res) => {
  try {
    const {
      domainName,
      projectName,
      purchaseDate,
      expirationDate,
      platform,
      accountHolder,
      ownerEmail,
      renewalCost,
      notes
    } = req.body;

    if (!domainName || !expirationDate) {
      return res.status(400).json({ message: 'Domain Name and Expiration Date are required' });
    }

    const domain = new Domain({
      domainName,
      projectName,
      purchaseDate: purchaseDate || Date.now(),
      expirationDate,
      platform: platform || 'Hostinger',
      accountHolder: accountHolder || '',
      ownerEmail: ownerEmail || '',
      renewalCost: Number(renewalCost) || 0,
      notes: notes || ''
    });

    const savedDomain = await domain.save();

    // Check if within 2-week warning window immediately
    const diffDays = Math.ceil((new Date(savedDomain.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 14) {
      sendExpiryAlertEmail(savedDomain).catch(err => console.error('Alert email error:', err));
    }

    res.status(201).json(savedDomain);
  } catch (error) {
    console.error('Error creating domain:', error);
    res.status(500).json({ message: 'Failed to create domain record', error: error.message });
  }
};

// @desc    Update domain record
// @route   PUT /api/domain/:id
// @access  Private
const updateDomain = async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({ message: 'Domain record not found' });
    }

    const {
      domainName,
      projectName,
      purchaseDate,
      expirationDate,
      platform,
      accountHolder,
      ownerEmail,
      renewalCost,
      notes
    } = req.body;

    if (domainName) domain.domainName = domainName;
    if (projectName !== undefined) domain.projectName = projectName;
    if (purchaseDate) domain.purchaseDate = purchaseDate;
    if (expirationDate) domain.expirationDate = expirationDate;
    if (platform !== undefined) domain.platform = platform;
    if (accountHolder !== undefined) domain.accountHolder = accountHolder;
    if (ownerEmail !== undefined) domain.ownerEmail = ownerEmail;
    if (renewalCost !== undefined) domain.renewalCost = Number(renewalCost) || 0;
    if (notes !== undefined) domain.notes = notes;

    const updatedDomain = await domain.save();
    res.status(200).json(updatedDomain);
  } catch (error) {
    console.error('Error updating domain:', error);
    res.status(500).json({ message: 'Failed to update domain record', error: error.message });
  }
};

// @desc    Delete domain record
// @route   DELETE /api/domain/:id
// @access  Private
const deleteDomain = async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({ message: 'Domain record not found' });
    }

    await Domain.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Domain record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete domain record', error: error.message });
  }
};

// Internal Helper & Controller to send Expiration Alert Email
const sendExpiryAlertEmail = async (domain) => {
  const recipients = ['crevionads@gmail.com', 'saleelvt57@gmail.com'].join(',');

  const expDateStr = formatDate(domain.expirationDate);
  const purchaseDateStr = formatDate(domain.purchaseDate);
  const subject = `⚠️ URGENT: Domain Expiration Warning for ${domain.domainName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #8a32c6; padding: 18px; text-align: center; border-radius: 6px 6px 0 0;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">⚠️ Domain Expiration Warning</h2>
      </div>
      
      <div style="padding: 24px; color: #333333; line-height: 1.6;">
        <p style="font-size: 15px; font-weight: bold; color: #111827;">Hello,</p>
        <p style="font-size: 14px; color: #4b5563;">
          This is an automated alert from <strong>Crevion ads CRM</strong> to notify you that the following domain is expiring soon. Please review the details below:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13.5px; border: 1px solid #e5e7eb;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; width: 40%; color: #374151;">Domain Name:</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold; font-size: 15px;">${domain.domainName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Project Name:</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #111827;">${domain.projectName || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Platform ( Register ):</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #8a32c6;">${domain.platform || 'Hostinger'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Account Holder:</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${domain.accountHolder || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Purchased Date:</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${purchaseDateStr || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Expiration Date:</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${expDateStr}</td>
          </tr>
          ${domain.renewalCost ? `
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Est. Renewal Cost:</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #059669;">₹${Number(domain.renewalCost).toLocaleString()}</td>
          </tr>` : ''}
        </table>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 24px;">
          <p style="font-size: 13.5px; color: #b91c1c; margin: 0; font-weight: bold;">
            ⚠️ Action Required: Please renew this domain immediately to prevent website downtime or loss of domain ownership.
          </p>
        </div>

        <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
          <p style="font-size: 14px; margin: 0; color: #374151; font-weight: 600;">Thank you,</p>
          <p style="font-size: 16px; margin: 4px 0 0 0; color: #8a32c6; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CREVIONADS</p>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Crevion ads CRM | crevionads@gmail.com</p>
        </div>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: recipients,
    subject,
    html
  });

  domain.alertSentAt = new Date();
  await domain.save();

  return result;
};

// @desc    Manually trigger email alert for a domain
// @route   POST /api/domain/:id/send-alert
// @access  Private
const triggerSendAlert = async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({ message: 'Domain record not found' });
    }

    await sendExpiryAlertEmail(domain);
    res.status(200).json({ message: `Expiration alert email sent to ${[domain.ownerEmail, 'crevionads@gmail.com'].filter(Boolean).join(', ')}` });
  } catch (error) {
    console.error('Error sending domain alert:', error);
    res.status(500).json({ message: 'Failed to send alert email', error: error.message });
  }
};

module.exports = {
  getDomains,
  getDomainById,
  createDomain,
  updateDomain,
  deleteDomain,
  triggerSendAlert,
};
