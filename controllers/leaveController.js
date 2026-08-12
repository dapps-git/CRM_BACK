const Leave = require('../models/Leave');
const Member = require('../models/Member');

// @desc    Mark attendance/leave for a member on a specific date
// @route   POST /api/leave
// @access  Private
const markLeave = async (req, res) => {
  try {
    const { memberId, memberIds, date, status, reason } = req.body;

    if (!date || !status) {
      return res.status(400).json({ message: 'Please provide date and status' });
    }

    // Normalize date to midnight (UTC consistently)
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    let targetMemberIds = [];
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      targetMemberIds = memberIds;
    } else if (memberId === 'ALL' || status === 'Company Holiday') {
      const allMembers = await Member.find().select('_id');
      targetMemberIds = allMembers.map(m => m._id);
    } else if (memberId && memberId !== 'ALL') {
      targetMemberIds = [memberId];
    } else {
      const allMembers = await Member.find().select('_id');
      targetMemberIds = allMembers.map(m => m._id);
    }

    if (targetMemberIds.length === 0) {
      return res.status(400).json({ message: 'No team members found' });
    }

    const operations = targetMemberIds.map(mId => ({
      updateOne: {
        filter: { memberId: mId, date: normalizedDate },
        update: { status, reason: reason || (status === 'Company Holiday' ? 'Company Holiday' : '') },
        upsert: true
      }
    }));

    await Leave.bulkWrite(operations);

    res.status(200).json({ message: `Attendance updated for ${targetMemberIds.length} member(s)` });
  } catch (error) {
    console.error('Failed to mark leave:', error);
    res.status(400).json({ message: error.message || 'Failed to mark leave' });
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
    if (!year || !monthNum) {
      return res.status(400).json({ message: 'Invalid month format' });
    }

    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    // Get all members
    const members = await Member.find().sort({ name: 1 });

    // Get all leaves in this month, populated with member name
    const leaves = await Leave.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('memberId', 'name');

    const summary = members.map(member => {
      // Find leaves for this member safely
      const memberLeaves = leaves.filter(l => {
        if (!l.memberId) return false;
        const leaveMemberId = l.memberId._id ? l.memberId._id.toString() : l.memberId.toString();
        return leaveMemberId === member._id.toString();
      });
      
      const stats = {
        present: 0,
        absent: 0,
        casual: 0,
        sick: 0,
        holiday: 0,
        halfDay: 0,
        totalLeave: 0
      };

      const dailyStatus = {};

      memberLeaves.forEach(l => {
        if (!l.date) return;
        const dateStr = l.date.toISOString().split('T')[0];
        dailyStatus[dateStr] = l.status;

        if (l.status === 'Present') stats.present += 1;
        else if (l.status === 'Absent') {
          stats.absent += 1;
          stats.totalLeave += 1;
        } else if (l.status === 'Casual Leave') {
          stats.casual += 1;
          stats.totalLeave += 1;
        } else if (l.status === 'Company Holiday') {
          stats.holiday += 1;
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

    const safeLeaves = leaves.map(l => ({
      _id: l._id,
      date: l.date ? l.date.toISOString().split('T')[0] : '',
      memberId: l.memberId?._id ? l.memberId._id.toString() : (l.memberId ? l.memberId.toString() : ''),
      memberName: l.memberId?.name || 'Unknown Partner',
      status: l.status,
      reason: l.reason || ''
    }));

    res.status(200).json({
      summary,
      leaves: safeLeaves
    });
  } catch (error) {
    console.error('Error in getMonthlySummary:', error);
    res.status(500).json({ message: 'Server error retrieving leave summary', error: error.message });
  }
};

module.exports = {
  markLeave,
  deleteLeave,
  getMonthlySummary
};
