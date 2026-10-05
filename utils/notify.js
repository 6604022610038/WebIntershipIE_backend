const Notification = require('../models/Notification');
const Student = require('../models/Student');
const User = require('../models/User');

/** แจ้งเตือนนักศึกษา 1 คน */
function notifyStudent(studentId, { title, detail = '', type = 'info' }) {
  return Notification.create({ recipientRole: 'student', recipientId: studentId, title, detail, type });
}

/**
 * แจ้งเตือนอาจารย์ที่ดูแลนักศึกษาคนนี้ (Student.advisorId)
 * ถ้ายังไม่ได้กำหนดอาจารย์ที่ปรึกษา จะแจ้งอาจารย์ทุกคนเพื่อไม่ให้แจ้งเตือนหาย
 */
async function notifyAdvisorsOf(studentId, { title, detail = '', type = 'info' }) {
  const student = await Student.findOne({ studentId }, 'advisorId').lean();
  let advisorIds = student && student.advisorId ? [student.advisorId] : [];
  if (!advisorIds.length) advisorIds = (await User.find({ role: 'advisor' }, 'username').lean()).map((u) => u.username);
  if (!advisorIds.length) return [];
  return Notification.insertMany(advisorIds.map((recipientId) => ({ recipientRole: 'advisor', recipientId, title, detail, type })));
}

module.exports = { notifyStudent, notifyAdvisorsOf };
