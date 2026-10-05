/**
 * 🧠 INTELLIGENCE ENGINE — จุดเข้าใช้งานเดียวของระบบวิเคราะห์ (rule-based, ไม่พึ่ง API ภายนอก)
 *
 *  Progress Intelligence    -> progressIntelligence.js
 *  Risk Monitor             -> riskMonitor.js
 *  Digital Twin (+Journey)  -> digitalTwin.js
 *  Advisor Command Center   -> commandCenter.js
 *  Smart Recommendation     -> smartRecommendation.js
 *  Report Intelligence      -> reportIntelligence.js
 *  AI / Smart Mentor        -> aiMentor.js
 *  What-if Simulator        -> whatIfSimulator.js
 *  Anomaly Detection        -> anomalyDetection.js
 */
module.exports = {
  ...require("./progressIntelligence"),
  ...require("./riskMonitor"),
  ...require("./digitalTwin"),
  ...require("./commandCenter"),
  ...require("./smartRecommendation"),
  ...require("./reportIntelligence"),
  ...require("./aiMentor"),
  ...require("./whatIfSimulator"),
  ...require("./anomalyDetection"),
};
