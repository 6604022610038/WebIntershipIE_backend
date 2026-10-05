const mongoose = require("mongoose");

const weeklyReportSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
    },

    weekNumber: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    workTitle: {
      type: String,
      required: true,
    },

    workDescription: {
      type: String,
      required: true,
    },

    problems: {
      type: String,
      default: "",
    },

    solution: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "ร่าง",
        "ส่งแล้ว",
        "อาจารย์ตรวจแล้ว",
        "ต้องแก้ไข",
      ],
      default: "ร่าง",
    },

    advisorComment: {
      type: String,
      default: "",
    },

    attachments: {
      type: [
        {
          filename: { type: String, required: true },
          originalName: { type: String, required: true },
          mimetype: { type: String, required: true },
          size: { type: Number, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "WeeklyReport",
  weeklyReportSchema
);