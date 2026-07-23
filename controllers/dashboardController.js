const Business = require('../models/Business');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Member = require('../models/Member');
const Leave = require('../models/Leave');

// @desc    Get dashboard metrics & charts aggregation
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = async (req, res) => {
  try {
    // 1. Total Contacts (Leads)
    const totalContacts = await Business.countDocuments();

    // 2. Total Members
    const totalMembers = await Member.countDocuments();

    // 3. Today's Attendance
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayAttendance = await Leave.countDocuments({
      date: today,
      status: 'Present'
    });

    // 4. Financial Calculations (Total Income & Expenses)
    const incomeAgg = await Income.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expenseAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalIncome = incomeAgg[0] ? incomeAgg[0].total : 0;
    const totalExpense = expenseAgg[0] ? expenseAgg[0].total : 0;
    const netProfit = totalIncome - totalExpense;

    // 5. Recent Transaction lists
    const recentContacts = await Business.find().sort({ createdAt: -1 }).limit(5);
    const recentIncome = await Income.find().sort({ date: -1 }).limit(5);
    const recentExpense = await Expense.find().sort({ date: -1 }).limit(5);

    // 6. Chart: Monthly Income & Expense & Net Profit
    // Group transactions by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setUTCHours(0, 0, 0, 0);

    const monthlyIncome = await Income.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyExpense = await Expense.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Build chronological array of last 6 months
    const chartData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      const inc = monthlyIncome.find(item => item._id === key);
      const exp = monthlyExpense.find(item => item._id === key);

      const incomeVal = inc ? inc.total : 0;
      const expenseVal = exp ? exp.total : 0;

      chartData.push({
        month: label,
        income: incomeVal,
        expense: expenseVal,
        profit: incomeVal - expenseVal
      });
    }

    // 7. Expense Categories Breakdown
    const expenseBreakdown = await Expense.aggregate([
      {
        $group: {
          _id: '$category',
          value: { $sum: '$amount' }
        }
      },
      { $sort: { value: -1 } }
    ]);

    // 8. Partner Breakdown (Income receiver and Expense partner totals)
    const partnerIncome = await Income.aggregate([
      {
        $group: {
          _id: '$receiver',
          income: { $sum: '$amount' }
        }
      }
    ]);

    const partnerExpense = await Expense.aggregate([
      {
        $group: {
          _id: '$partner',
          expense: { $sum: '$amount' }
        }
      }
    ]);

    // Combine Partner Breakdowns
    const partners = ['Saleel VT', 'Anfas Sir', 'Shamna Madam', 'Sabith Boss'];
    const partnerBreakdown = partners.map(name => {
      const inc = partnerIncome.find(p => p._id === name);
      const exp = partnerExpense.find(p => p._id === name);
      return {
        name,
        income: inc ? inc.income : 0,
        expense: exp ? exp.expense : 0
      };
    });

    res.status(200).json({
      summary: {
        totalContacts,
        totalMembers,
        todayAttendance,
        totalIncome,
        totalExpense,
        netProfit
      },
      recent: {
        contacts: recentContacts,
        income: recentIncome,
        expenses: recentExpense
      },
      chartData,
      expenseBreakdown: expenseBreakdown.map(item => ({ name: item._id, value: item.value })),
      partnerBreakdown
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error aggregating dashboard data' });
  }
};

module.exports = { getDashboardData };
