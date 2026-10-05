const WeeklyReport = require('../../../../models/WeeklyReport');
const { notifyStudent } = require('../../../../utils/notify');

/** ฝั่งอาจารย์: ดูรายงานทั้งหมด อนุมัติ หรือส่งกลับให้แก้ไข */

exports.getAll = async (req, res) => {
  try { res.json(await WeeklyReport.find().sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'ไม่สามารถดึงรายงานทั้งหมดได้', error: error.message }); }
};

exports.approve = async (req, res) => {
  try {
    const report = await WeeklyReport.findByIdAndUpdate(req.params.id, { status: 'อาจารย์ตรวจแล้ว', advisorComment: req.body.advisorComment || '' }, { new: true });
    if (!report) return res.status(404).json({ message: 'ไม่พบรายงาน' });
    await notifyStudent(report.studentId, { title: 'อาจารย์ตรวจรายงานประจำสัปดาห์แล้ว', detail: `รายงานสัปดาห์ที่ ${report.weekNumber} ได้รับการอนุมัติแล้ว`, type: 'success' });
    res.json({ message: 'อนุมัติรายงานสำเร็จ', data: report });
  } catch (error) { res.status(400).json({ message: 'อนุมัติรายงานไม่สำเร็จ', error: error.message }); }
};

exports.reject = async (req, res) => {
  try {
    const comment = req.body.advisorComment || 'กรุณาตรวจสอบและแก้ไขรายงาน';
    const report = await WeeklyReport.findByIdAndUpdate(req.params.id, { status: 'ต้องแก้ไข', advisorComment: comment }, { new: true });
    if (!report) return res.status(404).json({ message: 'ไม่พบรายงาน' });
    await notifyStudent(report.studentId, { title: 'อาจารย์ส่งรายงานกลับมาแก้ไข', detail: comment, type: 'warning' });
    res.json({ message: 'ส่งรายงานกลับไปแก้ไขแล้ว', data: report });
  } catch (error) { res.status(400).json({ message: 'ไม่สามารถส่งกลับไปแก้ไขได้', error: error.message }); }
};
