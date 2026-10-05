const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["ทั่วไป", "สำคัญ", "กำหนดการ"],
      default: "ทั่วไป",
    },

    publishDate: {
      type: Date,
      default: Date.now,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Announcement",
  announcementSchema
);