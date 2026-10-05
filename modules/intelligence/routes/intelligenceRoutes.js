const express = require("express");
const auth = require("../../../middleware/auth");
const allowRoles = require("../../../middleware/role");
const intelligenceController = require("../controllers/intelligenceController");

const router = express.Router();

router.get(
  "/student/:studentId",
  auth,
  allowRoles("student", "advisor"),
  intelligenceController.getStudentTwin
);

router.get(
  "/advisor-overview",
  auth,
  allowRoles("advisor"),
  intelligenceController.getAdvisorOverview
);

// 🧠 Smart Recommendation Engine
router.get(
  "/recommendations/:studentId",
  auth,
  allowRoles("student", "advisor"),
  intelligenceController.getRecommendations
);

// 📄 Report Intelligence
router.get(
  "/report-quality/:studentId",
  auth,
  allowRoles("student", "advisor"),
  intelligenceController.getReportIntelligence
);

// 🤖 AI Internship Mentor
router.post(
  "/mentor/:studentId",
  auth,
  allowRoles("student", "advisor"),
  intelligenceController.askMentor
);

// 🔮 What-if Simulator
router.post(
  "/whatif/:studentId",
  auth,
  allowRoles("student", "advisor"),
  intelligenceController.simulateWhatIf
);

// 🕵️ Anomaly Detection
router.get(
  "/anomalies",
  auth,
  allowRoles("advisor"),
  intelligenceController.getAnomalyOverview
);

router.get(
  "/anomalies/:studentId",
  auth,
  allowRoles("student", "advisor"),
  intelligenceController.getStudentAnomalies
);

module.exports = router;
