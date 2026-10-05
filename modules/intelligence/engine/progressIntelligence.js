const { MS_PER_WEEK, clamp, toDate } = require("./shared");

/* ============================================================
   1) 📊 PROGRESS INTELLIGENCE
   ============================================================
   คำนวณความก้าวหน้าของนักศึกษาโดยรวม 3 มิติ ถ่วงน้ำหนัก:
     - เวลา (Time)      45%  : เทียบวันที่เริ่ม-สิ้นสุดฝึกงานกับวันนี้
     - รายงาน (Reports) 40%  : จำนวนรายงานประจำสัปดาห์ที่ส่ง/ผ่านแล้ว เทียบกับที่ควรส่ง ณ สัปดาห์ปัจจุบัน
     - ผลประเมิน (Eval) 15%  : คะแนนประเมินล่าสุด เทียบเต็ม 5
   ============================================================ */
function computeProgress({ student, weeklyReports = [], evaluations = [], now = new Date() }) {
  const start = toDate(student?.internshipStart);
  const end = toDate(student?.internshipEnd);
  const totalWeeks = Number(student?.totalWeeks) > 0 ? Number(student.totalWeeks) : 16;

  // --- Time dimension ---
  let timePercent = 0;
  let weeksElapsed = 0;
  if (start) {
    const effectiveEnd = end || new Date(start.getTime() + totalWeeks * MS_PER_WEEK);
    const totalSpan = effectiveEnd.getTime() - start.getTime();
    const elapsedSpan = now.getTime() - start.getTime();
    weeksElapsed = clamp(Math.floor(elapsedSpan / MS_PER_WEEK), 0, totalWeeks);
    timePercent = totalSpan > 0 ? clamp((elapsedSpan / totalSpan) * 100, 0, 100) : 0;
  }

  // --- Reports dimension ---
  const expectedReportsByNow = Math.max(1, Math.min(totalWeeks, weeksElapsed || 1));
  const approvedStatuses = new Set(["อาจารย์ตรวจแล้ว"]);
  const submittedStatuses = new Set(["ส่งแล้ว", "อาจารย์ตรวจแล้ว", "ต้องแก้ไข"]);

  const submittedCount = weeklyReports.filter((r) => submittedStatuses.has(r.status)).length;
  const approvedCount = weeklyReports.filter((r) => approvedStatuses.has(r.status)).length;

  // นับรายงานที่ "นับความคืบหน้าได้" = ส่งแล้วทั้งหมด (ให้เครดิตแม้รอตรวจ) + โบนัสเล็กน้อยถ้าผ่านแล้ว
  const reportScore = submittedCount + approvedCount * 0.15;
  const reportPercent = clamp((reportScore / expectedReportsByNow) * 100, 0, 100);

  // --- Evaluation dimension ---
  const latestEval = evaluations[0];
  const evalPercent = latestEval ? clamp((Number(latestEval.score) || 0) / 5 * 100, 0, 100) : 0;

  const overall = Math.round(timePercent * 0.45 + reportPercent * 0.4 + evalPercent * 0.15);

  return {
    percent: clamp(overall, 0, 100),
    breakdown: {
      time: { percent: Math.round(timePercent), weight: 45, weeksElapsed, totalWeeks },
      reports: {
        percent: Math.round(reportPercent),
        weight: 40,
        submitted: submittedCount,
        approved: approvedCount,
        expectedByNow: expectedReportsByNow,
      },
      evaluation: { percent: Math.round(evalPercent), weight: 15, hasEvaluation: !!latestEval },
    },
    weeksElapsed,
    totalWeeks,
  };
}

module.exports = { computeProgress };
