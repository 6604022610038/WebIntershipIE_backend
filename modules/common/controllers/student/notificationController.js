const Notification = require('../../../../models/Notification');

// ฝั่งนักศึกษา (อาจารย์ดูของนักศึกษาได้ผ่านเงื่อนไข role ในแต่ละฟังก์ชัน)

exports.getByStudent = async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.username !== req.params.studentId) return res.status(403).json({ message: 'ไม่มีสิทธิ์ดูการแจ้งเตือนนี้' });
    res.json(await Notification.find({ recipientRole: 'student', recipientId: req.params.studentId }).sort({ createdAt: -1 }));
  } catch (error) { res.status(500).json({ message: 'ไม่สามารถดึงการแจ้งเตือนได้', error: error.message }); }
};

exports.markAllReadForStudent = async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.username !== req.params.studentId) return res.status(403).json({ message: 'ไม่มีสิทธิ์ดำเนินการนี้' });
    await Notification.updateMany({ recipientRole: 'student', recipientId: req.params.studentId }, { isRead: true });
    res.json({ message: 'อ่านการแจ้งเตือนทั้งหมดแล้ว' });
  } catch (error) { res.status(400).json({ message: 'อัปเดตการแจ้งเตือนไม่สำเร็จ', error: error.message }); }
};
