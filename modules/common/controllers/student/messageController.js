const Message = require('../../../../models/Message');

// ฝั่งนักศึกษา: แชทกับอาจารย์ เห็นได้เฉพาะบทสนทนาของตัวเอง

exports.getThread = async (req, res) => {
  try {
    const studentId = req.user.username;
    if (req.params.studentId !== studentId) return res.status(403).json({ message: 'ไม่มีสิทธิ์ดูข้อความนี้' });

    const messages = await Message.find({ studentId }).sort({ createdAt: 1 });
    await Message.updateMany({ studentId, sender: 'advisor', readByStudent: false }, { $set: { readByStudent: true } });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อความได้', error: error.message });
  }
};

exports.send = async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'กรุณาพิมพ์ข้อความ' });

    const data = await Message.create({
      studentId: req.user.username,
      sender: 'student',
      senderName: req.user.name || req.user.username,
      text,
      readByStudent: true,
      readByAdvisor: false,
    });
    res.status(201).json({ message: 'ส่งข้อความสำเร็จ', data });
  } catch (error) {
    res.status(400).json({ message: 'ส่งข้อความไม่สำเร็จ', error: error.message });
  }
};

// จำนวนข้อความจากอาจารย์ที่ยังไม่อ่าน (ใช้แสดง badge)
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ studentId: req.user.username, sender: 'advisor', readByStudent: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงจำนวนข้อความได้', error: error.message });
  }
};
