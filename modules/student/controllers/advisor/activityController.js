const Activity = require('../../../../models/Activity');

/**
 * ฝั่งอาจารย์: ปฏิทินกิจกรรมของอาจารย์ (นิเทศ นัดหมาย ฯลฯ)
 * หมายเหตุ: ยังเก็บด้วย studentId = 'ADVISOR' ตามเดิม เพราะหน้าปฏิทินฝั่งอาจารย์กรองด้วยค่านี้
 * ถ้าจะรองรับอาจารย์หลายคนให้ย้ายไปใช้ ownerRole/ownerId แบบเดียวกับ Notification
 */
const OWNER = 'ADVISOR';

exports.create = async (req, res) => {
  try {
    const data = await Activity.create({ ...req.body, studentId: OWNER });
    res.status(201).json({ message: 'เพิ่มกิจกรรมสำเร็จ', data });
  } catch (error) { res.status(400).json({ message: 'เพิ่มกิจกรรมไม่สำเร็จ', error: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const data = await Activity.findOneAndUpdate({ _id: req.params.id, studentId: OWNER }, { $set: req.body }, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ message: 'ไม่พบกิจกรรม' });
    res.json({ message: 'แก้ไขกิจกรรมสำเร็จ', data });
  } catch (error) { res.status(400).json({ message: 'แก้ไขกิจกรรมไม่สำเร็จ', error: error.message }); }
};

exports.remove = async (req, res) => {
  try {
    const data = await Activity.findOneAndDelete({ _id: req.params.id, studentId: OWNER });
    if (!data) return res.status(404).json({ message: 'ไม่พบกิจกรรม' });
    res.json({ message: 'ลบกิจกรรมสำเร็จ' });
  } catch (error) { res.status(400).json({ message: 'ลบกิจกรรมไม่สำเร็จ', error: error.message }); }
};
