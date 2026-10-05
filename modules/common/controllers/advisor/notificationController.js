const Notification = require('../../../../models/Notification');

// ฝั่งอาจารย์: แจ้งเตือนของอาจารย์คนที่ล็อกอินอยู่

exports.markAllReadForAdvisor = async (req, res) => {
  try {
    if (req.user.role !== 'advisor') return res.status(403).json({ message: 'ไม่มีสิทธิ์ดำเนินการนี้' });
    await Notification.updateMany({ recipientRole: 'advisor', recipientId: req.user.username }, { isRead: true });
    res.json({ message: 'อ่านการแจ้งเตือนทั้งหมดแล้ว' });
  } catch (error) { res.status(400).json({ message: 'อัปเดตการแจ้งเตือนไม่สำเร็จ', error: error.message }); }
};
