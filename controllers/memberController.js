const Member = require('../models/Member');
const sendEmail = require('../utils/sendEmail');

// Helper to format date DD/MM/YYYY
const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Automated job to check for birthdays (2 days before & exact birthday morning at 6:00 AM)
const checkUpcomingBirthdaysJob = async () => {
  try {
    const members = await Member.find({ dob: { $ne: null } });
    const now = new Date();
    const currentYear = now.getFullYear();
    const companyEmail = 'crevionads@gmail.com';

    for (const member of members) {
      if (!member.dob) continue;

      const dobDate = new Date(member.dob);
      const nextBday = new Date(currentYear, dobDate.getMonth(), dobDate.getDate());

      // Calculate days difference (0 = today, 2 = 2 days before)
      const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffMs = nextBday.getTime() - todayDateOnly.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const dobFormatted = formatDate(member.dob);

      // ── 1. ALERT 2 DAYS BEFORE BIRTHDAY ──
      if (diffDays > 0 && diffDays <= 2) {
        if (member.birthday2DaysAlertSentYear !== currentYear) {
          const subject = `🎂 Upcoming Birthday Alert: ${member.name}'s Birthday is in 2 Days!`;
          const html = `
            <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; background-color: #ffffff;">
              <div style="background-color: #8a32c6; padding: 18px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">🎂 2-Day Birthday Reminder</h2>
              </div>
              
              <div style="padding: 24px; color: #333333; line-height: 1.6;">
                <p style="font-size: 14px; font-weight: bold; color: #111827;">Hello Team,</p>
                <p style="font-size: 13.5px; color: #4b5563;">
                  This is an automated notification from <strong>Crevion ads CRM</strong> to let you know that <strong>${member.name}</strong>'s birthday is coming up in 2 days!
                </p>

                <div style="background-color: #fcf4ff; border: 1px solid #f0abfc; padding: 18px; margin: 20px 0; text-align: center;">
                  <h3 style="margin: 0; color: #8a32c6; font-size: 18px; font-weight: 800;">🎉 ${member.name}</h3>
                  <p style="margin: 6px 0 0 0; font-size: 14px; color: #701a75; font-weight: bold;">
                    Date of Birth: ${dobFormatted}
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #86198f; font-weight: 600;">
                    Member's birthday is coming in 2 days! Wish them a Happy Birthday!
                  </p>
                </div>

                <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
                  <p style="font-size: 13px; margin: 0; color: #374151; font-weight: 600;">Thanks from</p>
                  <p style="font-size: 16px; margin: 4px 0 0 0; color: #8a32c6; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CREVIONADS</p>
                  <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Crevion ads CRM | crevionads@gmail.com</p>
                </div>
              </div>
            </div>
          `;

          await sendEmail({ to: companyEmail, subject, html });
          member.birthday2DaysAlertSentYear = currentYear;
          await member.save();
          console.log(`[BIRTHDAY 2-DAY ALERT SENT] 🎂 Sent 2-day birthday reminder for ${member.name} to ${companyEmail}`);
        }
      }

      // ── 2. ALERT ON EXACT BIRTHDAY MORNING (AT 6:00 AM) ──
      if (diffDays === 0) {
        if (member.birthdayTodayAlertSentYear !== currentYear) {
          const subject = `🎉 TODAY IS BIRTHDAY! Wish ${member.name} Happy Birthday Today!`;
          const html = `
            <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; background-color: #ffffff;">
              <div style="background-color: #8a32c6; padding: 18px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">🎉 Today is Birthday!</h2>
              </div>
              
              <div style="padding: 24px; color: #333333; line-height: 1.6;">
                <p style="font-size: 14px; font-weight: bold; color: #111827;">Hello Team,</p>
                <p style="font-size: 13.5px; color: #4b5563;">
                  This is an automated 6:00 AM birthday morning notification from <strong>Crevion ads CRM</strong>!
                </p>

                <div style="background-color: #fcf4ff; border: 1px solid #f0abfc; padding: 20px; margin: 20px 0; text-align: center;">
                  <h3 style="margin: 0; color: #8a32c6; font-size: 20px; font-weight: 800;">🎈 TODAY IS ${member.name.toUpperCase()}'S BIRTHDAY! 🎂</h3>
                  <p style="margin: 8px 0 0 0; font-size: 14px; color: #701a75; font-weight: bold;">
                    Date of Birth: ${dobFormatted}
                  </p>
                  <p style="margin: 6px 0 0 0; font-size: 14px; color: #86198f; font-weight: 800;">
                    Wish them a Very Happy Birthday Today!
                  </p>
                </div>

                <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
                  <p style="font-size: 13px; margin: 0; color: #374151; font-weight: 600;">Thanks from</p>
                  <p style="font-size: 16px; margin: 4px 0 0 0; color: #8a32c6; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CREVIONADS</p>
                  <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Crevion ads CRM | crevionads@gmail.com</p>
                </div>
              </div>
            </div>
          `;

          await sendEmail({ to: companyEmail, subject, html });
          member.birthdayTodayAlertSentYear = currentYear;
          await member.save();
          console.log(`[BIRTHDAY MORNING 6 AM ALERT SENT] 🎉 Sent birthday morning alert for ${member.name} to ${companyEmail}`);
        }
      }
    }
  } catch (err) {
    console.error('Error running birthday check job:', err.message);
  }
};

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

    // Trigger birthday check job asynchronously
    checkUpcomingBirthdaysJob().catch(err => console.error('Birthday job error:', err.message));

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
    const { name, phoneNumber, profileImage, dob, idProofs } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ message: 'Please provide name and phone number' });
    }

    const member = await Member.create({
      name: name ? String(name).toUpperCase().trim() : '',
      phoneNumber,
      profileImage: profileImage || '',
      dob: dob ? new Date(dob) : null,
      idProofs: idProofs || []
    });

    // Check birthday immediately after creation
    checkUpcomingBirthdaysJob().catch(err => console.error('Birthday check error:', err.message));

    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(400).json({ message: 'Failed to create member', error: error.message });
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

    const { name, phoneNumber, profileImage, dob, idProofs } = req.body;
    if (name !== undefined) member.name = String(name).toUpperCase().trim();
    if (phoneNumber !== undefined) member.phoneNumber = phoneNumber;
    if (profileImage !== undefined) member.profileImage = profileImage;
    if (dob !== undefined) {
      member.dob = dob ? new Date(dob) : null;
      member.birthdayAlertSentYear = null; // Reset year alert trigger on date change
    }
    if (idProofs !== undefined) member.idProofs = idProofs;

    const updated = await member.save();

    // Check birthday immediately after update
    checkUpcomingBirthdaysJob().catch(err => console.error('Birthday check error:', err.message));

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(400).json({ message: 'Failed to update member', error: error.message });
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

// @desc    Manually trigger birthday email alert for a member
// @route   POST /api/member/:id/trigger-birthday
// @access  Private
const triggerBirthdayAlert = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const companyEmail = 'crevionads@gmail.com';
    const dobFormatted = formatDate(member.dob) || 'Upcoming';

    const subject = `🎂 Upcoming Birthday Alert: ${member.name}'s Birthday is Coming Up!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
        <div style="background-color: #8a32c6; padding: 18px; text-align: center; border-radius: 6px 6px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">🎂 Upcoming Birthday Alert</h2>
        </div>
        
        <div style="padding: 24px; color: #333333; line-height: 1.6;">
          <p style="font-size: 15px; font-weight: bold; color: #111827;">Hello Team,</p>
          <p style="font-size: 14px; color: #4b5563;">
            This is an automated notification from <strong>Crevion ads CRM</strong> to let you know that <strong>${member.name}</strong>'s birthday is coming up! Don't forget to wish them a Happy Birthday!
          </p>

          <div style="background-color: #fcf4ff; border: 1px solid #f0abfc; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #8a32c6; font-size: 18px; font-weight: 800;">🎉 ${member.name}</h3>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #701a75; font-weight: bold;">
              Date of Birth: ${dobFormatted}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #86198f; font-weight: 600;">
              Birthday is coming up! Please wish them a Happy Birthday!
            </p>
          </div>

          <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
            <p style="font-size: 14px; margin: 0; color: #374151; font-weight: 600;">Thanks from</p>
            <p style="font-size: 16px; margin: 4px 0 0 0; color: #8a32c6; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CREVIONADS</p>
            <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Crevion ads CRM | crevionads@gmail.com</p>
          </div>
        </div>
      </div>
    `;

    const info = await sendEmail({ to: companyEmail, subject, html });
    res.status(200).json({ message: `Birthday alert email sent to ${companyEmail}`, info });
  } catch (error) {
    console.error('Trigger birthday alert error:', error);
    res.status(500).json({ message: 'Failed to send birthday alert email', error: error.message });
  }
};

module.exports = {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  triggerBirthdayAlert,
  checkUpcomingBirthdaysJob
};
