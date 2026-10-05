const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    activityDate: { type: Date, required: true },
    time: { type: String, default: "" },
    type: { type: String, default: "ทั่วไป" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
