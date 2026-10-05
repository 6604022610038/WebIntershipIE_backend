const fs = require('fs');
const path = require('path');

const FormDocument = require('../../../../models/FormDocument');
const { formatSize } = require('../../../../utils/format');

const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'forms');

// ฝั่งอาจารย์: อัปโหลด/ลบแบบฟอร์ม

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาแนบไฟล์' });
    }

    const { title, description, category } = req.body;

    const doc = await FormDocument.create({
      title: title?.trim() || req.file.originalname,
      description: description || '',
      category: category || 'เอกสารอื่นๆ',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/forms/${req.file.filename}`,
      uploadedBy: req.user?.username || req.user?.role || '',
    });

    res.status(201).json({
      ...doc.toObject(),
      sizeLabel: formatSize(doc.size),
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(
        path.join(uploadDir, req.file.filename),
        () => {}
      );
    }

    res.status(500).json({
      message: 'อัปโหลดไฟล์ไม่สำเร็จ',
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await FormDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: 'ไม่พบไฟล์นี้' });
    }

    await doc.deleteOne();

    fs.unlink(path.join(uploadDir, doc.filename), () => {});

    res.json({ message: 'ลบไฟล์เรียบร้อย' });
  } catch (error) {
    res.status(500).json({
      message: 'ลบไฟล์ไม่สำเร็จ',
      error: error.message,
    });
  }
};
