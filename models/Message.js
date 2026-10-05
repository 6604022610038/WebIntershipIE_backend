const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // studentId คือ "กุญแจ" ของบทสนทนา เพราะระบบนี้มีอาจารย์คนเดียว
    // นักศึกษาแต่ละคนจะมีห้องแชทกับอาจารย์แค่ห้องเดียว
    studentId: { type: String, required: true, index: true },

    sender: { type: String, enum: ["student", "advisor"], required: true },
    senderName: { type: String, default: "" },

    text: { type: String, required: true, trim: true },

    readByStudent: { type: Boolean, default: false },
    readByAdvisor: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ studentId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);