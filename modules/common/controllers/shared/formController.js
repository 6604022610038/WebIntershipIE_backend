const FormDocument = require('../../../../models/FormDocument');
const { formatSize } = require('../../../../utils/format');

// นักศึกษาและอาจารย์ดูรายการไฟล์ได้

exports.getAll = async (req, res) => {
  try {
    const forms = await FormDocument.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      forms.map((f) => ({
        ...f,
        sizeLabel: formatSize(f.size),
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: 'ไม่สามารถดึงข้อมูลแบบฟอร์มได้',
      error: error.message,
    });
  }
};
