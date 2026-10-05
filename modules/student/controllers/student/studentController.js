const Student = require('../../../../models/Student');
const User = require('../../../../models/User');
const { own } = require('../../../../utils/access');

/** ฝั่งนักศึกษา: ดู/แก้ข้อมูลของตัวเอง (อาจารย์ผ่านเงื่อนไข own() ได้เช่นกัน) */

exports.getByStudentId = async (req, res) => {
  try {
    if (!own(req, req.params.studentId)) return res.status(403).json({ message: 'ไม่มีสิทธิ์ดูข้อมูลนี้' });
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.json(student);
  } catch (error) { res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลนักศึกษาได้', error: error.message }); }
};

exports.updateByStudentId = async (req, res) => {
  try {
    if (!own(req, req.params.studentId)) return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขข้อมูลนี้' });
    const allowed = (({ name, email, major, phone, address }) => ({ name, email, major, phone, address }))(req.body);
    Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);
    const student = await Student.findOneAndUpdate({ studentId: req.params.studentId }, { $set: allowed }, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    if (req.user.role === 'student' && allowed.name) await User.findOneAndUpdate({ username: req.user.username }, { name: allowed.name });
    res.json({ message: 'บันทึกข้อมูลส่วนตัวสำเร็จ', data: student });
  } catch (error) { res.status(400).json({ message: 'บันทึกข้อมูลส่วนตัวไม่สำเร็จ', error: error.message }); }
};

exports.getById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    if (!own(req, student.studentId)) return res.status(403).json({ message: 'ไม่มีสิทธิ์ดูข้อมูลนี้' });
    res.json(student);
  } catch (error) { res.status(400).json({ message: 'ID นักศึกษาไม่ถูกต้อง', error: error.message }); }
};
