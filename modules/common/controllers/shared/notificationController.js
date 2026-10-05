const Notification = require('../../../../models/Notification');

// ทำเครื่องหมายอ่านแล้ว: แก้ได้เฉพาะแจ้งเตือนที่ส่งถึงตัวเอง ใช้ได้ทั้งสองบทบาท

exports.markRead = async (req, res) => {
  try {
    // ทั้งนักศึกษาและอาจารย์ แก้ได้เฉพาะแจ้งเตือนที่ส่งถึงตัวเอง
    const filter = { _id: req.params.id, recipientRole: req.user.role, recipientId: req.user.username };
    const item = await Notification.findOneAndUpdate(filter, { isRead: true }, { new: true });
    if (!item) return res.status(404).json({ message: 'ไม่พบการแจ้งเตือน' });
    res.json({ message: 'อ่านการแจ้งเตือนแล้ว', data: item });
  } catch (error) { res.status(400).json({ message: 'อัปเดตการแจ้งเตือนไม่สำเร็จ', error: error.message }); }
};
