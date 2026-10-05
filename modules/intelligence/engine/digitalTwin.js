const { computeProgress } = require("./progressIntelligence");
const { computeRisk } = require("./riskMonitor");
const { toDate } = require("./shared");

/* ============================================================
   3) 🗺️ INTERNSHIP JOURNEY
   ============================================================
   สร้างไทม์ไลน์เหตุการณ์ทั้งหมดของนักศึกษาคนหนึ่ง เรียงตามวันที่
   ตั้งแต่วันเริ่มฝึกงานจนถึงวันสิ้นสุด (หรือปัจจุบัน)
   ============================================================ */
function buildJourney({ student, weeklyReports = [], evaluations = [], activities = [] }) {
  const events = [];
  const now = new Date();

  const start = toDate(student?.internshipStart);
  const end = toDate(student?.internshipEnd);

  if (start) {
    events.push({
      date: start,
      type: "milestone",
      icon: "🚀",
      title: "เริ่มต้นฝึกงาน",
      detail: student?.company ? `ณ ${student.company}` : "",
      status: "done",
    });
  }

  weeklyReports.forEach((r) => {
    events.push({
      date: toDate(r.createdAt) || toDate(r.startDate),
      type: "weekly-report",
      icon: "📘",
      title: `รายงานสัปดาห์ที่ ${r.weekNumber ?? "-"}: ${r.workTitle || ""}`.trim(),
      detail: r.status,
      status:
        r.status === "อาจารย์ตรวจแล้ว" ? "done" : r.status === "ต้องแก้ไข" ? "warning" : "pending",
    });
  });

  evaluations.forEach((e) => {
    events.push({
      date: toDate(e.createdAt),
      type: "evaluation",
      icon: "⭐",
      title: `ผลประเมินจากอาจารย์ (${e.score ?? "-"}/5)`,
      detail: e.comment || "",
      status: "done",
    });
  });

  activities.forEach((a) => {
    events.push({
      date: toDate(a.activityDate),
      type: "activity",
      icon: "📅",
      title: a.title,
      detail: a.description || a.type || "",
      status: toDate(a.activityDate) && toDate(a.activityDate) < now ? "done" : "pending",
    });
  });

  if (end) {
    events.push({
      date: end,
      type: "milestone",
      icon: end < now ? "🏁" : "🎯",
      title: end < now ? "สิ้นสุดการฝึกงาน" : "กำหนดสิ้นสุดการฝึกงาน",
      detail: "",
      status: end < now ? "done" : "future",
    });
  }

  return events
    .filter((e) => e.date instanceof Date)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* ============================================================
   4) 👨‍🎓 DIGITAL TWIN — โปรไฟล์สถานะแบบ Interactive ของนักศึกษา 1 คน
   ============================================================ */
function buildStudentTwin({
  student,
  weeklyReports = [],
  evaluations = [],
  activities = [],
}) {
  const progress = computeProgress({ student, weeklyReports, evaluations });
  const risk = computeRisk({ student, weeklyReports, evaluations, progress });
  const journey = buildJourney({ student, weeklyReports, evaluations, activities });

  const latestEval = evaluations[0];
  const skills = latestEval?.skills || {
    knowledge: 0,
    performance: 0,
    problemSolving: 0,
    teamwork: 0,
    ethics: 0,
  };

  const now = new Date();
  const reportStatus = {
    draft: weeklyReports.filter((r) => r.status === "ร่าง").length,
    submitted: weeklyReports.filter((r) => r.status === "ส่งแล้ว").length,
    approved: weeklyReports.filter((r) => r.status === "อาจารย์ตรวจแล้ว").length,
    needFix: weeklyReports.filter((r) => r.status === "ต้องแก้ไข").length,
  };

  const evaluationScores = evaluations
    .map((e) => Number(e.score))
    .filter((n) => Number.isFinite(n) && n > 0);
  const averageEvaluation = evaluationScores.length
    ? Math.round((evaluationScores.reduce((a, b) => a + b, 0) / evaluationScores.length) * 100) / 100
    : null;

  const requiredHours = Math.max(0, Number(student?.requiredHours) || 0);
  const completedHours = Math.max(0, Number(student?.totalHours) || 0);
  const hoursPercent = requiredHours
    ? Math.min(100, Math.round((completedHours / requiredHours) * 100))
    : null;

  const upcomingActivities = activities.filter((a) => {
    const d = toDate(a.activityDate);
    return d && d >= now;
  }).slice(0, 5);

  const insight = buildInsightText({ student, progress, risk });

  return {
    student,
    progress,
    risk,
    journey,
    skills,
    insight,
    stats: {
      weeklyReportCount: weeklyReports.length,
      evaluationCount: evaluations.length,
      activityCount: activities.length,
      reportStatus,
      averageEvaluation,
      hours: {
        completed: completedHours,
        required: requiredHours,
        percent: hoursPercent,
      },
      upcomingActivities,
      lastReportAt: weeklyReports[0]?.createdAt || null,
      lastEvaluationAt: evaluations[0]?.createdAt || null,
    },
  };
}

/** สร้างข้อความสรุปสถานะแบบภาษาคน (rule-based, ไม่พึ่ง LLM ภายนอก) */
function buildInsightText({ progress, risk }) {
  const parts = [];

  if (progress.percent >= 80) parts.push("ความคืบหน้าฝึกงานอยู่ในเกณฑ์ดีมาก");
  else if (progress.percent >= 50) parts.push("ความคืบหน้าฝึกงานอยู่ในเกณฑ์ปกติ");
  else parts.push("ความคืบหน้าฝึกงานยังตามหลังกรอบเวลา");

  if (risk.level === "high") parts.push("ควรติดต่อดูแลอย่างเร่งด่วนเนื่องจากพบสัญญาณเสี่ยงหลายจุด");
  else if (risk.level === "medium") parts.push("ควรติดตามอย่างใกล้ชิดในสัปดาห์นี้");
  else parts.push("ยังไม่พบสัญญาณที่น่ากังวล");

  return parts.join(" • ");
}

module.exports = { buildJourney, buildStudentTwin };
