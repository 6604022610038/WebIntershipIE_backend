const Student = require('../../../models/Student');

exports.getByStudentId = async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลการฝึกงาน' });
    res.json({
      studentId: student.studentId,
      company: student.company,
      position: student.position,
      internshipStart: student.internshipStart,
      internshipEnd: student.internshipEnd,
      status: student.status,
      progress: student.progress,
      totalWeeks: student.totalWeeks,
      currentWeek: student.currentWeek,
    });
  } catch (error) { res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลการฝึกงานได้', error: error.message }); }
};

exports.updateByStudentId = async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.username !== req.params.studentId) return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขข้อมูลนี้' });
    const allowed = (({ company, position, internshipStart, internshipEnd, status, progress, totalWeeks, currentWeek }) => ({ company, position, internshipStart, internshipEnd, status, progress, totalWeeks, currentWeek }))(req.body);
    const student = await Student.findOneAndUpdate({ studentId: req.params.studentId }, { $set: allowed }, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.json({ message: 'บันทึกข้อมูลการฝึกงานสำเร็จ', data: student });
  } catch (error) { res.status(400).json({ message: 'บันทึกข้อมูลการฝึกงานไม่สำเร็จ', error: error.message }); }
};
