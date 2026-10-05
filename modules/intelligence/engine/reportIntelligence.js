const { clamp } = require("./shared");

/* ============================================================
   6) 📄 REPORT INTELLIGENCE
   ============================================================
   วิเคราะห์คุณภาพของรายงานประจำสัปดาห์แบบ rule-based:
   ความยาวเนื้อหา, การระบุปัญหา/วิธีแก้, และคำเตือนของแต่ละฉบับ
   ============================================================ */
const VAGUE_PATTERNS = [/^-+$/, /^\.+$/, /^(ไม่มี|เหมือนเดิม|ทำงานปกติ)\.?$/];

function scoreText(text, { minGood = 120, minOk = 40 } = {}) {
  const clean = (text || "").trim();
  const length = clean.length;
  const isVague = !clean || VAGUE_PATTERNS.some((p) => p.test(clean));
  let quality = "poor";
  if (!isVague) {
    if (length >= minGood) quality = "good";
    else if (length >= minOk) quality = "fair";
  }
  return { length, isVague, quality };
}

function analyzeReport(report, type = "weekly") {
  const descText = report.workDescription;
  const desc = scoreText(descText);
  const hasProblem = (report.problems || "").trim().length > 0;
  const hasSolution = (report.solution || "").trim().length > 0;

  const flags = [];
  if (desc.isVague) flags.push("เนื้อหางานที่ทำระบุไว้กว้างเกินไปหรือไม่ได้ระบุ");
  else if (desc.quality === "fair") flags.push("เนื้อหางานที่ทำค่อนข้างสั้น ควรอธิบายเพิ่มเติม");

  if (hasProblem && !hasSolution) {
    flags.push("ระบุปัญหาไว้แต่ยังไม่ได้ระบุวิธีแก้ไข");
  }

  let qualityScore = 0;
  if (desc.quality === "good") qualityScore += 60;
  else if (desc.quality === "fair") qualityScore += 35;
  else qualityScore += 10;

  if (hasProblem) qualityScore += 15;
  if (hasSolution) qualityScore += 25;
  qualityScore = clamp(Math.round(qualityScore), 0, 100);

  return {
    reportId: report._id,
    type,
    weekNumber: report.weekNumber,
    date: report.reportDate || report.startDate || report.createdAt,
    title: report.workTitle || report.title || "",
    status: report.status,
    qualityScore,
    hasProblem,
    hasSolution,
    flags,
  };
}

function buildReportIntelligence({ weeklyReports = [] }) {
  const weeklyAnalysis = weeklyReports.map((r) => analyzeReport(r, "weekly"));
  const all = weeklyAnalysis;

  const avgQuality = all.length
    ? Math.round(all.reduce((s, r) => s + r.qualityScore, 0) / all.length)
    : 0;

  const flagged = all
    .filter((r) => r.flags.length > 0)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return {
    avgQuality,
    totalAnalyzed: all.length,
    flaggedCount: flagged.length,
    flagged: flagged.slice(0, 10),
    weeklyAnalysis,
  };
}

module.exports = { analyzeReport, buildReportIntelligence };
