const Student = require("../../../models/Student");
const WeeklyReport = require("../../../models/WeeklyReport");
const Evaluation = require("../../../models/Evaluation");
const Activity = require("../../../models/Activity");
const { own } = require("../../../utils/access");
const {
  computeProgress,
  computeRisk,
  buildStudentTwin,
  buildAdvisorOverview,
  buildRecommendations,
  buildReportIntelligence,
  buildMentorReply,
  simulateWhatIf,
  detectAnomalies,
  buildAnomalyOverview,
} = require("../engine");

/**
 * GET /api/intelligence/student/:studentId
 * 👨‍🎓 Digital Twin ของนักศึกษาคนเดียว (ตัวเอง หรืออาจารย์ที่ปรึกษาดูได้)
 */
exports.getStudentTwin = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!own(req, studentId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูข้อมูลนี้" });
    }

    const [student, weeklyReports, evaluations, activities] = await Promise.all([
      Student.findOne({ studentId }).lean(),
      WeeklyReport.find({ studentId }).sort({ weekNumber: -1 }).lean(),
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).lean(),
      Activity.find({ studentId }).sort({ activityDate: 1 }).lean(),
    ]);

    if (!student) return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });

    const twin = buildStudentTwin({ student, weeklyReports, evaluations, activities });

    // 🧠 Smart Recommendation Engine + 📄 Report Intelligence ต่อยอดจากข้อมูลชุดเดียวกัน
    twin.recommendations = buildRecommendations({
      student,
      progress: twin.progress,
      risk: twin.risk,
      weeklyReports,
      evaluations,
    });
    twin.reportIntelligence = buildReportIntelligence({ weeklyReports });

    res.json(twin);
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถวิเคราะห์ข้อมูลนักศึกษาได้", error: error.message });
  }
};

/**
 * GET /api/intelligence/recommendations/:studentId
 * 🧠 Smart Recommendation Engine (เรียกแยกได้ ถ้าไม่ต้องการโหลด twin ทั้งหมด)
 */
exports.getRecommendations = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!own(req, studentId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูข้อมูลนี้" });
    }

    const [student, weeklyReports, evaluations] = await Promise.all([
      Student.findOne({ studentId }).lean(),
      WeeklyReport.find({ studentId }).sort({ weekNumber: -1 }).lean(),
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!student) return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });

    const progress = computeProgress({ student, weeklyReports, evaluations });
    const risk = computeRisk({ student, weeklyReports, evaluations, progress });

    const recommendations = buildRecommendations({
      student,
      progress,
      risk,
      weeklyReports,
      evaluations,
    });

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถสร้างคำแนะนำได้", error: error.message });
  }
};

/**
 * GET /api/intelligence/report-quality/:studentId
 * 📄 Report Intelligence — วิเคราะห์คุณภาพรายงานของนักศึกษาคนเดียว
 */
exports.getReportIntelligence = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!own(req, studentId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูข้อมูลนี้" });
    }

    const [weeklyReports] = await Promise.all([
      WeeklyReport.find({ studentId }).sort({ weekNumber: -1 }).lean(),
    ]);

    res.json(buildReportIntelligence({ weeklyReports }));
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถวิเคราะห์คุณภาพรายงานได้", error: error.message });
  }
};

/**
 * POST /api/intelligence/mentor/:studentId
 * 🤖 AI Internship Mentor — ตอบคำถามโดยอ้างอิงข้อมูลจริงของนักศึกษา (rule-based)
 * body: { question, history? }
 */
exports.askMentor = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { question } = req.body || {};
    if (!own(req, studentId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ใช้งานผู้ช่วยนี้สำหรับนักศึกษาคนนี้" });
    }

    const [student, weeklyReports, evaluations, activities] = await Promise.all([
      Student.findOne({ studentId }).lean(),
      WeeklyReport.find({ studentId }).sort({ weekNumber: -1 }).lean(),
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).lean(),
      Activity.find({ studentId }).sort({ activityDate: 1 }).lean(),
    ]);

    if (!student) return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });

    const twin = buildStudentTwin({ student, weeklyReports, evaluations, activities });
    const recommendations = buildRecommendations({
      student,
      progress: twin.progress,
      risk: twin.risk,
      weeklyReports,
      evaluations,
    });

    const { reply, matchedTopic } = buildMentorReply(question, {
      progress: twin.progress,
      risk: twin.risk,
      evaluations,
      recommendations,
    });

    res.json({ reply, matchedTopic, askedAt: new Date() });
  } catch (error) {
    res.status(500).json({ message: "ผู้ช่วย AI ไม่สามารถตอบคำถามได้ในขณะนี้", error: error.message });
  }
};

/**
 * GET /api/intelligence/advisor-overview
 * 👨‍🏫 Advisor Command Center — ภาพรวมทุกนักศึกษา + Risk Monitor
 */
exports.getAdvisorOverview = async (req, res) => {
  try {
    const [students, weeklyReports, evaluations, activities] = await Promise.all([
      Student.find().lean(),
      WeeklyReport.find().lean(),
      Evaluation.find().lean(),
      Activity.find().lean(),
    ]);

    const overview = buildAdvisorOverview({ students, weeklyReports, evaluations, activities });
    res.json(overview);
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถวิเคราะห์ภาพรวมนักศึกษาได้", error: error.message });
  }
};

/**
 * POST /api/intelligence/whatif/:studentId
 * 🔮 What-if Simulator — จำลองสถานการณ์แล้วเทียบกับสถานะปัจจุบัน
 * body: { extraReports, daysAhead, fixPending, evalScore }
 */
exports.simulateWhatIf = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!own(req, studentId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูข้อมูลนี้" });
    }

    const [student, weeklyReports, evaluations] = await Promise.all([
      Student.findOne({ studentId }).lean(),
      WeeklyReport.find({ studentId }).sort({ weekNumber: -1 }).lean(),
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!student) return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });

    res.json(
      simulateWhatIf({ student, weeklyReports, evaluations, scenario: req.body || {} })
    );
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถจำลองสถานการณ์ได้", error: error.message });
  }
};

/**
 * GET /api/intelligence/anomalies
 * 🕵️ Anomaly Detection — ภาพรวมความผิดปกติของนักศึกษาทุกคน (อาจารย์)
 */
exports.getAnomalyOverview = async (req, res) => {
  try {
    const [students, weeklyReports, evaluations] = await Promise.all([
      Student.find().lean(),
      WeeklyReport.find().lean(),
      Evaluation.find().lean(),
    ]);
    res.json(buildAnomalyOverview({ students, weeklyReports, evaluations }));
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถตรวจจับความผิดปกติได้", error: error.message });
  }
};

/**
 * GET /api/intelligence/anomalies/:studentId
 * 🕵️ Anomaly Detection ของนักศึกษาคนเดียว
 */
exports.getStudentAnomalies = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!own(req, studentId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูข้อมูลนี้" });
    }

    const [student, weeklyReports, evaluations] = await Promise.all([
      Student.findOne({ studentId }).lean(),
      WeeklyReport.find({ studentId }).sort({ createdAt: -1 }).lean(),
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!student) return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });

    res.json({ anomalies: detectAnomalies({ student, weeklyReports, evaluations }) });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถตรวจจับความผิดปกติได้", error: error.message });
  }
};
