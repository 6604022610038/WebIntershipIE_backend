const Student = require('../../../models/Student');
const WeeklyReport = require('../../../models/WeeklyReport');
const Activity = require('../../../models/Activity');
const Evaluation = require('../../../models/Evaluation');
const Notification = require('../../../models/Notification');
const Message = require('../../../models/Message');
const Announcement = require('../../../models/Announcement');

exports.getStudentDashboard = async (req, res) => {
  try {
    const [student, weeklyReports, activities, evaluations, notifications, unreadMessages, announcements] = await Promise.all([
      Student.findOne({ studentId: req.params.studentId }).lean(),
      WeeklyReport.find({ studentId: req.params.studentId }).sort({ weekNumber: -1 }).lean(),
      Activity.find({ studentId: req.params.studentId }).sort({ activityDate: 1, time: 1 }).lean(),
      Evaluation.find({ studentId: req.params.studentId }).sort({ createdAt: -1 }).lean(),
      Notification.find({ recipientRole: 'student', recipientId: req.params.studentId }).sort({ createdAt: -1 }).limit(20).lean(),
      Message.countDocuments({ studentId: req.params.studentId, sender: 'advisor', readByStudent: false }),
      Announcement.find({ isPublished: true }).sort({ publishDate: -1, createdAt: -1 }).limit(5).lean(),
    ]);
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.json({ student, weeklyReports, activities, evaluations, notifications, unreadMessages, announcements });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถโหลด Dashboard ได้', error: error.message });
  }
};
