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
  const subject = `⚠️ Domain Expiration Alert: ${domain.domainName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
        <!-- Brand Header -->
        <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 18px; font-weight: 800; color: #8a32c6; letter-spacing: -0.5px;">Crevion<span style="color: #0f172a;">.ads</span></span>
        </div>

        <!-- Title -->
        <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.3px;">Domain Expiration Alert</h1>
        
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
          The following domain is scheduled to expire soon. Please review the details below:
        </p>

        <!-- Domain Details Table -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 13px;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b; width: 40%;">Domain Name</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${domain.domainName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Project Name</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${domain.projectName || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Platform</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${domain.platform || 'Hostinger'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Account Holder</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${domain.accountHolder || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Purchase Date</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${purchaseDateStr || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; ${domain.renewalCost ? 'border-bottom: 1px solid #e2e8f0;' : ''} font-weight: 600; color: #64748b;">Expiration Date</td>
            <td style="padding: 10px 14px; ${domain.renewalCost ? 'border-bottom: 1px solid #e2e8f0;' : ''} font-weight: 700; color: #e11d48;">${expDateStr}</td>
          </tr>
          ${domain.renewalCost ? `
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Est. Renewal Cost</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #059669;">₹${Number(domain.renewalCost).toLocaleString()}</td>
          </tr>` : ''}
        </table>

        <!-- Alert Box -->
        <div style="background-color: #fff1f2; border-left: 3px solid #f43f5e; padding: 12px 14px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
          <p style="font-size: 12.5px; color: #9f1239; margin: 0; font-weight: 500;">
            Action Required: Please renew this domain promptly to prevent website downtime.
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">Crevion ads CRM | Automated System Notification</p>
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
