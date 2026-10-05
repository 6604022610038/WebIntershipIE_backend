/** อาจารย์ดูได้ทุกคน, นักศึกษาดูได้เฉพาะข้อมูลของตัวเอง */
function own(req, studentId) {
  return req.user.role === 'advisor' || req.user.username === studentId;
}

module.exports = { own };
