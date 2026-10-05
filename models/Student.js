const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    advisorId: { type: String, default: "", index: true }, // username อาจารย์ที่ปรึกษา (ว่าง = แจ้งอาจารย์ทุกคน)

    phone: { type: String, default: "" },
    address: { type: String, default: "" },

    faculty: { type: String, default: "" },
    mentorName: { type: String, default: "" },
    mentorPosition: { type: String, default: "" },
    totalHours: { type: Number, default: 0 },
    requiredHours: { type: Number, default: 320 },

    major: {
      type: String,
      default: "Computer Mathematics",
    },

    company: {
      type: String,
      default: "",
    },

    position: {
      type: String,
      default: "",
    },

    internshipStart: {
      type: Date,
    },

    internshipEnd: {
      type: Date,
    },

    status: {
      type: String,
      default: "กำลังฝึกงาน",
    },

    progress: { type: Number, min: 0, max: 100, default: 0 },
    totalWeeks: { type: Number, default: 16 },
    currentWeek: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Student", studentSchema);