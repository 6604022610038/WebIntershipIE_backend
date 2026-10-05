const mongoose = require("mongoose");

const formDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "แบบฟอร์มนักศึกษา",
        "แบบประเมิน",
        "แบบฟอร์มรายงาน",
        "เอกสารอื่นๆ",
      ],
      default: "เอกสารอื่นๆ",
    },

    filename: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    mimetype: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    uploadedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "FormDocument",
  formDocumentSchema
);