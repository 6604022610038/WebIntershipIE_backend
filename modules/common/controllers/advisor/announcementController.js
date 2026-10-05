const Announcement = require("../../../../models/Announcement");
const Notification = require("../../../../models/Notification");
const Student = require("../../../../models/Student");

// ฝั่งอาจารย์: สร้าง/แก้ไข/ลบประกาศ

exports.create = async (req, res) => {
  try {

    const {
      title,
      content,
      type,
      publishDate,
      isPublished,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        message:
          "กรุณากรอกหัวข้อและรายละเอียดประกาศ",
      });
    }

    const announcement =
      await Announcement.create({
        title,
        content,
        type: type || "ทั่วไป",
        publishDate:
          publishDate || new Date(),
        isPublished:
          isPublished !== false,
        createdBy:
          req.user.username,
      });


    // ===============================
    // ส่งแจ้งเตือนไปให้นักศึกษาทุกคน
    // ===============================

    const students =
      await Student.find({}, "studentId");

    if (announcement.isPublished) {

      const notifications =
        students.map((student) => ({
          recipientRole: "student",
          recipientId: student.studentId,
          title: announcement.title,
          detail: announcement.content,
          type:
            announcement.type === "สำคัญ"
              ? "warning"
              : "info",
          isRead: false,
        }));

      if (notifications.length) {
        await Notification.insertMany(
          notifications
        );
      }
    }


    res.status(201).json({
      message: "สร้างประกาศสำเร็จ",
      data: announcement,
    });

  } catch (error) {

    res.status(400).json({
      message: "สร้างประกาศไม่สำเร็จ",
      error: error.message,
    });

  }
};

exports.update = async (req, res) => {
  try {

    const {
      title,
      content,
      type,
      publishDate,
      isPublished,
    } = req.body;

    const announcement =
      await Announcement.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            title,
            content,
            type,
            publishDate,
            isPublished,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!announcement) {
      return res.status(404).json({
        message: "ไม่พบประกาศ",
      });
    }

    res.json({
      message: "แก้ไขประกาศสำเร็จ",
      data: announcement,
    });

  } catch (error) {

    res.status(400).json({
      message: "แก้ไขประกาศไม่สำเร็จ",
      error: error.message,
    });

  }
};

exports.remove = async (req, res) => {
  try {

    const announcement =
      await Announcement.findByIdAndDelete(
        req.params.id
      );

    if (!announcement) {
      return res.status(404).json({
        message: "ไม่พบประกาศ",
      });
    }

    res.json({
      message: "ลบประกาศสำเร็จ",
    });

  } catch (error) {

    res.status(400).json({
      message: "ลบประกาศไม่สำเร็จ",
      error: error.message,
    });

  }
};
