const Student = require('../../../models/Student');
const WeeklyReport = require('../../../models/WeeklyReport');
const Activity = require('../../../models/Activity');
const Evaluation = require('../../../models/Evaluation');
const Notification = require('../../../models/Notification');
const Message = require('../../../models/Message');

exports.getAdvisorDashboard = async (req, res) => {
  try {
    const [students, weeklyReports, evaluations, notifications, activities, unreadMessages] = await Promise.all([
      Student.find().sort({ createdAt: -1 }).lean(),
      WeeklyReport.find().sort({ createdAt: -1 }).lean(),
      Evaluation.find().sort({ createdAt: -1 }).lean(),
      Notification.find({ recipientRole: 'advisor', recipientId: req.user.username }).sort({ createdAt: -1 }).limit(30).lean(),
      Activity.find().sort({ activityDate: 1, time: 1 }).lean(),
      Message.countDocuments({ sender: 'student', readByAdvisor: false }),
    ]);
    res.json({ students, weeklyReports, evaluations, notifications, activities, unreadMessages });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถโหลด Dashboard อาจารย์ได้', error: error.message });
  }
};
