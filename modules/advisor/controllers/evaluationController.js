const Evaluation = require('../../../models/Evaluation');

exports.getByStudent = async (req, res) => {
  try { res.json(await Evaluation.find({ studentId: req.params.studentId }).sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'ไม่สามารถดึงผลประเมินได้', error: error.message }); }
};

exports.getAll = async (req, res) => {
  try { res.json(await Evaluation.find().sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'ไม่สามารถดึงผลประเมินได้', error: error.message }); }
};

exports.create = async (req, res) => {
  try {
    const data = await Evaluation.create({ ...req.body, advisorId: req.user.username });
    res.status(201).json({ message: 'บันทึกผลประเมินสำเร็จ', data });
  } catch (error) { res.status(400).json({ message: 'บันทึกผลประเมินไม่สำเร็จ', error: error.message }); }
};
