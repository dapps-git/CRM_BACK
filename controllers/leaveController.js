const Leave = require('../models/Leave');
const Member = require('../models/Member');

// @desc    Mark attendance/leave for a member on a specific date
// @route   POST /api/leave
// @access  Private
const markLeave = async (req, res) => {
  try {
    const { memberId, date, status, reason } = req.body;

    if (!memberId || !date || !status) {
      return res.status(400).json({ message: 'Please provide memberId, date and status' });
    }

    // Normalize date to midnight (UTC or local, consistently midnight)
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Upsert leave record
    const leave = await Leave.findOneAndUpdate(
      { memberId, date: normalizedDate },
      { status, reason: reason || '' },
      { new: true, upsert: true }
    );

    res.status(200).json(leave);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Failed to mark leave' });
  }
};

// @desc    Delete a specific leave record
// @route   DELETE /api/leave/:id
// @access  Private
const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave record not found' });
    }

    await leave.deleteOne();
    res.status(200).json({ message: 'Leave record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete leave record' });
  }
};

// @desc    Get monthly summary matrix for all members
// @route   GET /api/leave/summary
// @access  Private
const getMonthlySummary = async (req, res) => {
  try {
    // Expecting month as 'YYYY-MM', e.g. '2026-07'
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ message: 'Please provide a month in YYYY-MM format' });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    // Get all members
    const members = await Member.find().sort({ name: 1 });

    // Get all leaves in this month, populated with member name
    const leaves = await Leave.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('memberId', 'name');

    const summary = members.map(member => {
      // Find leaves for this member
      const memberLeaves = leaves.filter(l => l.memberId && l.memberId._id.toString() === member._id.toString());
      
      const stats = {
        present: 0,
        absent: 0,
        casual: 0,
        sick: 0,
        halfDay: 0,
        totalLeave: 0
      };

      const dailyStatus = {};

      memberLeaves.forEach(l => {
        const dateStr = l.date.toISOString().split('T')[0];
        dailyStatus[dateStr] = l.status;

        if (l.status === 'Present') stats.present += 1;
        else if (l.status === 'Absent') {
          stats.absent += 1;
          stats.totalLeave += 1;
        } else if (l.status === 'Casual Leave') {
          stats.casual += 1;
          stats.totalLeave += 1;
        } else if (l.status === 'Sick Leave') {
          stats.sick += 1;
          stats.totalLeave += 1;
        } else if (l.status === 'Half Day') {
          stats.halfDay += 1;
          stats.totalLeave += 0.5;
        }
      });

      return {
        member: {
          _id: member._id,
          name: member.name,
          phoneNumber: member.phoneNumber
        },
        stats,
        dailyStatus
      };
    });

    res.status(200).json({
      summary,
      leaves: leaves.map(l => ({
        _id: l._id,
        date: l.date.toISOString().split('T')[0],
        memberId: l.memberId?._id || '',
        memberName: l.memberId?.name || 'Unknown Partner',
        status: l.status,
        reason: l.reason || ''
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving leave summary' });
  }
};

module.exports = {
  markLeave,
  deleteLeave,
  getMonthlySummary
};
