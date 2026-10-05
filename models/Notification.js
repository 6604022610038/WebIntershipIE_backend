const mongoose = require("mongoose");

/**
 * recipientRole + recipientId ระบุผู้รับแจ้งเตือนอย่างชัดเจน
 *  - student: recipientId = รหัสนักศึกษา (username)
 *  - advisor: recipientId = username ของอาจารย์คนนั้น
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientRole: { type: String, enum: ["student", "advisor"], required: true },
    recipientId: { type: String, required: true },
    title: { type: String, required: true },
    detail: { type: String, default: "" },
    type: { type: String, default: "info" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientRole: 1, recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
