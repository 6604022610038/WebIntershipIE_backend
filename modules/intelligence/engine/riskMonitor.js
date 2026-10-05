const { clamp, daysBetween, toDate } = require("./shared");

/* ============================================================
   2) 🚦 RISK MONITOR
   ============================================================
   ตรวจจับสัญญาณเสี่ยงของนักศึกษาแต่ละคนแบบ rule-based แล้วให้คะแนน
   ความเสี่ยงสะสม (riskScore) จากนั้นจัดระดับ low / medium / high
   ============================================================ */
function computeRisk({ student, weeklyReports = [], evaluations = [], progress, now = new Date() }) {
  const reasons = [];
  let score = 0;

  // 1) ไม่มีการส่งรายงานประจำสัปดาห์มานานเกินไป
  const lastWeekly = weeklyReports[0] ? toDate(weeklyReports[0].createdAt) : null;
  const lastActivityDates = [lastWeekly].filter(Boolean);
  const lastActivity = lastActivityDates.length
    ? new Date(Math.max(...lastActivityDates.map((d) => d.getTime())))
    : null;

  const status = String(student?.status || "");
  const isActive = !status.includes("เสร็จสิ้น") && !status.includes("จบ");

  if (isActive) {
    if (!lastActivity) {
      score += 35;
      reasons.push("ยังไม่มีการส่งรายงานใด ๆ นับตั้งแต่เริ่มฝึกงาน");
    } else {
      const idleDays = daysBetween(lastActivity, now);
      if (idleDays >= 21) {
        score += 40;
        reasons.push(`ไม่มีการส่งรายงานมาแล้ว ${idleDays} วัน`);
      } else if (idleDays >= 10) {
        score += 20;
        reasons.push(`ไม่มีการส่งรายงานมาแล้ว ${idleDays} วัน`);
      }
    }
  }

  // 2) มีรายงานที่ต้องแก้ไขค้างอยู่
  const needFix = weeklyReports.filter((r) => r.status === "ต้องแก้ไข").length;
  if (needFix > 0) {
    score += Math.min(25, needFix * 12);
    reasons.push(`มีรายงานที่ต้องแก้ไขค้างอยู่ ${needFix} ฉบับ`);
  }

  // 3) ความคืบหน้าล่าช้ากว่าที่ควรจะเป็น (ตามกรอบเวลา)
  if (progress) {
    const gap = progress.breakdown.time.percent - progress.breakdown.reports.percent;
    if (gap >= 30) {
      score += 25;
      reasons.push("ส่งรายงานล่าช้ากว่ากรอบเวลาที่ควรจะเป็นอย่างมาก");
    } else if (gap >= 15) {
      score += 12;
      reasons.push("ส่งรายงานตามหลังกรอบเวลาเล็กน้อย");
    }
  }

  // 4) ผลประเมินต่ำ
  const latestEval = evaluations[0];
  if (latestEval && Number(latestEval.score) > 0 && Number(latestEval.score) < 3) {
    score += 25;
    reasons.push(`คะแนนประเมินล่าสุดค่อนข้างต่ำ (${latestEval.score}/5)`);
  }

  score = clamp(Math.round(score), 0, 100);

  let level = "low";
  if (score >= 55) level = "high";
  else if (score >= 25) level = "medium";

  return {
    level,
    score,
    reasons,
    lastActivityAt: lastActivity,
    idleDays: lastActivity ? daysBetween(lastActivity, now) : null,
  };
}

module.exports = { computeRisk };
