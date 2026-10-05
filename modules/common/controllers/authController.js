const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../../models/User");
const Student = require("../../../models/Student");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "กรุณากรอกรหัสผู้ใช้และรหัสผ่าน" });
    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ message: "ไม่พบผู้ใช้งาน" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    const token = jwt.sign({ userId: user._id.toString(), username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const student = user.role === "student" ? await Student.findOne({ studentId: user.username }) : null;
    res.json({ message: "เข้าสู่ระบบสำเร็จ", token, user: { id: user._id, username: user.username, name: user.name, role: user.role, studentId: student?.studentId || null } });
  } catch (error) { console.error(error); res.status(500).json({ message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }); }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    const student = user.role === "student" ? await Student.findOne({ studentId: user.username }) : null;
    res.json({ user, student });
  } catch (error) { res.status(500).json({ message: "ไม่สามารถดึงข้อมูลผู้ใช้ได้" }); }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "กรุณากรอกชื่อ" });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    user.name = name.trim();
    await user.save();
    let student = null;
    if (user.role === "student") {
      student = await Student.findOneAndUpdate({ studentId: user.username }, { $set: { name: user.name, ...(email !== undefined ? { email } : {}) } }, { new: true, runValidators: true });
    }
    res.json({ message: "บันทึกโปรไฟล์สำเร็จ", user: { id: user._id, username: user.username, name: user.name, role: user.role, studentId: student?.studentId || null }, student });
  } catch (error) { res.status(400).json({ message: "บันทึกโปรไฟล์ไม่สำเร็จ", error: error.message }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ message: "กรุณากรอกรหัสผ่านให้ถูกต้อง (อย่างน้อย 6 ตัวอักษร)" });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) { res.status(500).json({ message: "เปลี่ยนรหัสผ่านไม่สำเร็จ" }); }
};
