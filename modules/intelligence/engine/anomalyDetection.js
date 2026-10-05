const { analyzeReport } = require("./reportIntelligence");
const { MS_PER_DAY, daysBetween, toDate } = require("./shared");

/* ============================================================
   9) 🕵️ ANOMALY DETECTION
   ============================================================
   ตรวจจับพฤติกรรม/ข้อมูลที่ผิดปกติในการส่งรายงานและผลประเมิน (rule-based)
   ============================================================ */
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, "").toLowerCase();
}

function trigrams(text) {
  const t = normalizeText(text);
  const set = new Set();
  for (let i = 0; i <= t.length - 3; i++) set.add(t.slice(i, i + 3));
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((x) => b.has(x) && inter++);
  return inter / (a.size + b.size - inter);
}

function detectAnomalies({ student, weeklyReports = [], evaluations = [] }) {
  const anomalies = [];
  const now = new Date();
  const studentId = student?.studentId;
  const studentName = student?.name;
  const start = toDate(student?.internshipStart);
  const end = toDate(student?.internshipEnd);

  const add = (type, severity, title, detail, date) =>
    anomalies.push({ type, severity, studentId, studentName, title, detail, date: date || null });

  // 1) ส่งรายงานย้อนหลังรวดเดียว (>=3 ฉบับภายใน 24 ชม.)
  const weeklyByTime = weeklyReports
    .map((r) => ({ r, t: toDate(r.createdAt) }))
    .filter((x) => x.t)
    .sort((a, b) => a.t - b.t);
  for (let i = 0; i + 2 < weeklyByTime.length; i++) {
    if (weeklyByTime[i + 2].t - weeklyByTime[i].t <= MS_PER_DAY) {
      const cluster = weeklyByTime.filter((x) => x.t - weeklyByTime[i].t >= 0 && x.t - weeklyByTime[i].t <= MS_PER_DAY);
      add(
        "bulk-submission",
        "medium",
        "ส่งรายงานย้อนหลังรวดเดียว",
        `ส่งรายงานประจำสัปดาห์ ${cluster.length} ฉบับภายใน 24 ชั่วโมง อาจไม่ได้บันทึกตามความเป็นจริงรายสัปดาห์`,
        weeklyByTime[i].t
      );
      break;
    }
  }

  // 2) เนื้อหารายงานซ้ำ/คล้ายกันมาก
  const contentItems = [
    ...weeklyReports.map((r) => ({ label: `สัปดาห์ที่ ${r.weekNumber ?? "-"}`, text: r.workDescription, date: r.createdAt })),
  ].filter((x) => normalizeText(x.text).length >= 30);
  const grams = contentItems.map((x) => trigrams(x.text));
  let dupCount = 0;
  let firstDup = null;
  for (let i = 0; i < contentItems.length; i++) {
    for (let j = i + 1; j < contentItems.length; j++) {
      if (jaccard(grams[i], grams[j]) >= 0.85) {
        dupCount++;
        if (!firstDup) firstDup = [contentItems[i], contentItems[j]];
      }
    }
  }
  if (dupCount > 0) {
    add(
      "duplicate-content",
      dupCount >= 3 ? "high" : "medium",
      "เนื้อหารายงานซ้ำกัน",
      `พบรายงานที่มีเนื้อหาเหมือนกันเกือบทั้งหมด ${dupCount} คู่ (เช่น ${firstDup[0].label} กับ ${firstDup[1].label})`,
      firstDup[1].date
    );
  }

  // 3) ส่งรายงานประจำสัปดาห์ล่าช้ามากเมื่อเทียบกับวันสิ้นสุดสัปดาห์
  const lateWeekly = weeklyReports.filter((r) => {
    const created = toDate(r.createdAt);
    const wEnd = toDate(r.endDate);
    return created && wEnd && daysBetween(wEnd, created) > 14;
  });
  if (lateWeekly.length) {
    add(
      "late-submission",
      lateWeekly.length >= 3 ? "high" : "low",
      "ส่งรายงานล่าช้ามาก",
      `มีรายงานประจำสัปดาห์ ${lateWeekly.length} ฉบับที่ส่งช้ากว่าวันสิ้นสุดสัปดาห์เกิน 14 วัน`,
      lateWeekly[0].createdAt
    );
  }

  // 6) หมายเลขสัปดาห์ซ้ำ
  const weekCounts = {};
  weeklyReports.forEach((r) => {
    if (r.weekNumber != null) weekCounts[r.weekNumber] = (weekCounts[r.weekNumber] || 0) + 1;
  });
  const dupWeeks = Object.keys(weekCounts).filter((k) => weekCounts[k] > 1);
  if (dupWeeks.length) {
    add(
      "duplicate-week",
      "low",
      "หมายเลขสัปดาห์ซ้ำ",
      `พบรายงานประจำสัปดาห์ที่ใช้หมายเลขสัปดาห์ซ้ำกัน: สัปดาห์ที่ ${dupWeeks.join(", ")}`,
      null
    );
  }

  // 7) คะแนนประเมินเปลี่ยนแปลงผิดปกติ
  if (evaluations.length >= 2) {
    const a = Number(evaluations[0].score);
    const b = Number(evaluations[1].score);
    if (a > 0 && b > 0 && Math.abs(a - b) >= 2) {
      add(
        "eval-jump",
        "medium",
        "คะแนนประเมินเปลี่ยนแปลงผิดปกติ",
        `คะแนนประเมิน${a > b ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(a - b)} คะแนนจากครั้งก่อน (${b} → ${a})`,
        evaluations[0].createdAt
      );
    }
  }

  // 8) คุณภาพรายงานล่าสุดตกฮวบเมื่อเทียบกับค่าเฉลี่ย
  if (weeklyReports.length >= 4) {
    const scores = weeklyReports.map((r) => analyzeReport(r, "weekly").qualityScore); // ใหม่สุดอยู่หน้าสุด
    const latest = scores[0];
    const rest = scores.slice(1);
    const avgRest = rest.reduce((s, x) => s + x, 0) / rest.length;
    if (avgRest - latest >= 40) {
      add(
        "quality-drop",
        "low",
        "คุณภาพรายงานล่าสุดลดลงอย่างมาก",
        `คะแนนคุณภาพรายงานล่าสุด ${latest}% ต่ำกว่าค่าเฉลี่ยก่อนหน้า (${Math.round(avgRest)}%) มาก`,
        weeklyReports[0].createdAt
      );
    }
  }

  return anomalies.sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);
}

function buildAnomalyOverview({ students = [], weeklyReports = [], evaluations = [] }) {
  const group = (list) =>
    list.reduce((m, x) => {
      (m[x.studentId] = m[x.studentId] || []).push(x);
      return m;
    }, {});
  const w = group(weeklyReports);
  const e = group(evaluations);
  const byCreatedDesc = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

  const anomalies = students.flatMap((student) =>
    detectAnomalies({
      student,
      weeklyReports: (w[student.studentId] || []).slice().sort(byCreatedDesc),
      evaluations: (e[student.studentId] || []).slice().sort(byCreatedDesc),
    })
  );
  anomalies.sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);

  return {
    total: anomalies.length,
    bySeverity: {
      high: anomalies.filter((a) => a.severity === "high").length,
      medium: anomalies.filter((a) => a.severity === "medium").length,
      low: anomalies.filter((a) => a.severity === "low").length,
    },
    studentsAffected: new Set(anomalies.map((a) => a.studentId)).size,
    anomalies,
  };
}

module.exports = { buildAnomalyOverview, detectAnomalies };
