const Student = require('../../../../models/Student');

/** ฝั่งอาจารย์: จัดการรายชื่อนักศึกษาทั้งหมด */

exports.getAll = async (req, res) => {
  try { res.json(await Student.find().sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลนักศึกษาได้', error: error.message }); }
};

exports.create = async (req, res) => {
  try { res.status(201).json(await Student.create(req.body)); }
  catch (error) { res.status(400).json({ message: 'เพิ่มข้อมูลนักศึกษาไม่สำเร็จ', error: error.message }); }
};

exports.updateById = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.json({ message: 'แก้ไขข้อมูลสำเร็จ', data: student });
  } catch (error) { res.status(400).json({ message: 'แก้ไขข้อมูลนักศึกษาไม่สำเร็จ', error: error.message }); }
};

exports.deleteById = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.json({ message: 'ลบข้อมูลนักศึกษาสำเร็จ', student });
  } catch (error) { res.status(400).json({ message: 'ลบข้อมูลนักศึกษาไม่สำเร็จ', error: error.message }); }
};
