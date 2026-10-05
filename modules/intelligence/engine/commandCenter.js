const { computeProgress } = require("./progressIntelligence");
const { computeRisk } = require("./riskMonitor");
const { toDate } = require("./shared");

/* ============================================================
   ADVISOR COMMAND CENTER
   ข้อมูลทั้งหมดมาจาก MongoDB จริง และคำนวณสถานะ ณ เวลาที่เรียก API
   ============================================================ */
function buildAdvisorOverview({
  students = [],
  weeklyReports = [],
  evaluations = [],
  activities = [],
  now = new Date(),
}) {
  const byStudent = (list) => {
    const map = new Map();
    list.forEach((item) => {
      const key = item.studentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  };

  const weeklyMap = byStudent(weeklyReports);
  const evalMap = byStudent(evaluations);
  const activityMap = byStudent(activities);

  let pendingReports = 0;
  let needFixReports = 0;
  let approvedReports = 0;
  let totalHours = 0;
  let requiredHours = 0;
  let evaluationScores = [];

  const roster = students.map((student) => {
    const sid = student.studentId;
    const sw = [...(weeklyMap.get(sid) || [])].sort(
      (a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
    );
    const se = [...(evalMap.get(sid) || [])].sort(
      (a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
    );
    const sa = [...(activityMap.get(sid) || [])].sort(
      (a, b) => new Date(a.activityDate || 0) - new Date(b.activityDate || 0)
    );

    const progress = computeProgress({ student, weeklyReports: sw, evaluations: se, now });
    const risk = computeRisk({ student, weeklyReports: sw, evaluations: se, progress, now });

    const statusCounts = {
      draft: sw.filter((r) => r.status === "ร่าง").length,
      submitted: sw.filter((r) => r.status === "ส่งแล้ว").length,
      approved: sw.filter((r) => r.status === "อาจารย์ตรวจแล้ว").length,
      needFix: sw.filter((r) => r.status === "ต้องแก้ไข").length,
    };

    const scoreValues = se
      .map((e) => Number(e.score))
      .filter((n) => Number.isFinite(n) && n > 0);

    const averageEvaluation = scoreValues.length
      ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 100) / 100
      : null;

    const completedHours = Math.max(0, Number(student.totalHours) || 0);
    const targetHours = Math.max(0, Number(student.requiredHours) || 0);
    const hoursPercent = targetHours
      ? Math.min(100, Math.round((completedHours / targetHours) * 100))
      : null;

    const lastActivity = sa
      .filter((a) => toDate(a.activityDate))
      .sort((a, b) => toDate(b.activityDate) - toDate(a.activityDate))[0];

    pendingReports += statusCounts.submitted;
    needFixReports += statusCounts.needFix;
    approvedReports += statusCounts.approved;
    totalHours += completedHours;
    requiredHours += targetHours;
    evaluationScores.push(...scoreValues);

    return {
      studentId: sid,
      name: student.name,
      email: student.email,
      major: student.major,
      company: student.company,
      position: student.position,
      status: student.status,
      currentWeek: student.currentWeek || progress.weeksElapsed,
      totalWeeks: student.totalWeeks || progress.totalWeeks,
      progress,
      risk,
      reports: statusCounts,
      evaluation: {
        average: averageEvaluation,
        latest: se[0]?.score ?? null,
        latestAt: se[0]?.createdAt || null,
      },
      hours: {
        completed: completedHours,
        required: targetHours,
        percent: hoursPercent,
      },
      lastReportAt: sw[0]?.createdAt || sw[0]?.updatedAt || null,
      lastActivityAt: lastActivity?.activityDate || null,
    };
  });

  const riskOrder = { high: 0, medium: 1, low: 2 };
  const attentionList = [...roster]
    .filter((r) => r.risk.level !== "low")
    .sort(
      (a, b) =>
        riskOrder[a.risk.level] - riskOrder[b.risk.level] ||
        b.risk.score - a.risk.score
    );

  const distribution = {
    high: roster.filter((r) => r.risk.level === "high").length,
    medium: roster.filter((r) => r.risk.level === "medium").length,
    low: roster.filter((r) => r.risk.level === "low").length,
  };

  const avgProgress = roster.length
    ? Math.round(roster.reduce((sum, r) => sum + r.progress.percent, 0) / roster.length)
    : 0;

  const avgEvaluation = evaluationScores.length
    ? Math.round((evaluationScores.reduce((a, b) => a + b, 0) / evaluationScores.length) * 100) / 100
    : null;

  return {
    generatedAt: now.toISOString(),
    roster: roster.sort((a, b) => (a.name || "").localeCompare(b.name || "", "th")),
    attentionList,
    distribution,
    avgProgress,
    avgEvaluation,
    totalStudents: roster.length,
    reports: {
      pending: pendingReports,
      needFix: needFixReports,
      approved: approvedReports,
    },
    hours: {
      completed: totalHours,
      required: requiredHours,
      percent: requiredHours ? Math.min(100, Math.round((totalHours / requiredHours) * 100)) : null,
    },
  };
}

module.exports = { buildAdvisorOverview };
