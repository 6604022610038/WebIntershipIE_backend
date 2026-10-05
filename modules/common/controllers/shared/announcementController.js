const Announcement = require("../../../../models/Announcement");

// นักศึกษาและอาจารย์อ่านประกาศได้เหมือนกัน

exports.getAll = async (req, res) => {
  try {
    const announcements =
      await Announcement.find({
        isPublished: true,
      }).sort({
        publishDate: -1,
        createdAt: -1,
      });

    res.json(announcements);

  } catch (error) {

    res.status(500).json({
      message: "ไม่สามารถดึงประกาศได้",
      error: error.message,
    });

  }
};

exports.getById = async (req, res) => {
  try {

    const announcement =
      await Announcement.findById(
        req.params.id
      );

    if (!announcement) {
      return res.status(404).json({
        message: "ไม่พบประกาศ",
      });
    }

    res.json(announcement);

  } catch (error) {

    res.status(400).json({
      message: "ไม่สามารถดึงประกาศได้",
      error: error.message,
    });

  }
};
