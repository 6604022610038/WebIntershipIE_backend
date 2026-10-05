const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    advisorId: { type: String, default: "" },
    score: { type: Number, min: 0, max: 5, default: 0 },
    comment: { type: String, default: "" },
    skills: {
      knowledge: { type: Number, default: 0 },
      performance: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      teamwork: { type: Number, default: 0 },
      ethics: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evaluation", evaluationSchema);
