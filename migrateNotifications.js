/**
 * ย้ายแจ้งเตือนรูปแบบเก่า (studentId, ใช้ 'ADVISOR' แทนอาจารย์) ไปเป็น recipientRole + recipientId
 * และกำหนด advisorId ให้นักศึกษาที่ยังว่าง
 *
 * ใช้: node migrateNotifications.js [advisorUsername]
 * ถ้าไม่ระบุ advisorUsername จะใช้อาจารย์คนแรกที่พบในระบบ (ถ้ามีหลายคนควรระบุเอง)
 * รันซ้ำได้โดยไม่เสียหาย (ข้ามเอกสารที่ย้ายแล้ว)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Student = require('./models/Student');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const col = mongoose.connection.collection('notifications');

    const advisorUsername = process.argv[2] || (await User.findOne({ role: 'advisor' }).sort({ createdAt: 1 }))?.username;
    if (!advisorUsername) throw new Error('ไม่พบอาจารย์ในระบบ — ระบุ username ด้วย: node migrateNotifications.js teacher001');

    const toAdvisor = await col.updateMany(
      { recipientRole: { $exists: false }, studentId: 'ADVISOR' },
      { $set: { recipientRole: 'advisor', recipientId: advisorUsername }, $unset: { studentId: '' } }
    );
    const toStudent = await col.updateMany(
      { recipientRole: { $exists: false }, studentId: { $exists: true } },
      [{ $set: { recipientRole: 'student', recipientId: '$studentId' } }, { $unset: 'studentId' }]
    );
    const students = await Student.updateMany({ $or: [{ advisorId: { $exists: false } }, { advisorId: '' }] }, { $set: { advisorId: advisorUsername } });

    console.log(`แจ้งเตือนอาจารย์: ${toAdvisor.modifiedCount}, แจ้งเตือนนักศึกษา: ${toStudent.modifiedCount}, นักศึกษาที่กำหนดอาจารย์: ${students.modifiedCount} (advisor = ${advisorUsername})`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
