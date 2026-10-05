/** ส่วนกลางที่ทั้งนักศึกษาและอาจารย์ใช้ร่วมกัน (Auth, แจ้งเตือน, ประกาศ, แชท, แบบฟอร์ม) */
module.exports = [
  ['/api/auth', require('./routes/authRoutes')],
  ['/api/notifications', require('./routes/notificationRoutes')],
  ['/api/announcements', require('./routes/announcementRoutes')],
  ['/api/messages', require('./routes/messageRoutes')],
  ['/api/forms', require('./routes/formRoutes')],
];
