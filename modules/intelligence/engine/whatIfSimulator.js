const { computeProgress } = require("./progressIntelligence");
const { computeRisk } = require("./riskMonitor");
const { MS_PER_DAY, MS_PER_WEEK, clamp, toDate } = require("./shared");

/* ============================================================
   8) 🔮 WHAT-IF SIMULATOR
   ============================================================
   จำลองสถานการณ์สมมติ แล้วเทียบผลกับสถานะปัจจุบัน (baseline)
   scenario = {
     extraReports : จำนวนรายงานประจำสัปดาห์ที่จะส่งเพิ่ม (0-12)
     daysAhead    : เลื่อนเวลาไปข้างหน้ากี่วัน (0-120) — เช่น "ถ้าไม่ทำอะไรอีก 2 สัปดาห์"
     fixPending   : true = แก้รายงานที่ "ต้องแก้ไข" ทั้งหมดให้เรียบร้อย
     evalScore    : สมมติคะแนนประเมินล่าสุด (1-5) หรือ null
   }
   ============================================================ */
function simulateWhatIf({ student, weeklyReports = [], evaluations = [], scenario = {} }) {
  const extraReports = clamp(Math.round(Number(scenario.extraReports) || 0), 0, 12);
  const daysAhead = clamp(Math.round(Number(scenario.daysAhead) || 0), 0, 120);
  const fixPending = !!scenario.fixPending;
  const evalScore =
    scenario.evalScore === null || scenario.evalScore === undefined || scenario.evalScore === ""
      ? null
      : clamp(Number(scenario.evalScore) || 0, 1, 5);

  const baseNow = new Date();
  const futureNow = new Date(baseNow.getTime() + daysAhead * MS_PER_DAY);

  const summarize = (weekly, evals, now) => {
    const progress = computeProgress({ student, weeklyReports: weekly, evaluations: evals, now });
    const risk = computeRisk({ student, weeklyReports: weekly, evaluations: evals, progress, now });
    return { progress, risk };
  };

  // --- baseline: ปัจจุบัน ---
  const base = summarize(weeklyReports, evaluations, baseNow);

  // --- scenario ---
  let simWeekly = weeklyReports.map((r) =>
    fixPending && r.status === "ต้องแก้ไข" ? { ...r, status: "ส่งแล้ว" } : r
  );

  const maxWeek = simWeekly.reduce((m, r) => Math.max(m, Number(r.weekNumber) || 0), 0);
  const synthetic = Array.from({ length: extraReports }, (_, i) => ({
    _id: `sim-${i}`,
    weekNumber: maxWeek + i + 1,
    status: "ส่งแล้ว",
    createdAt: futureNow,
  }));
  simWeekly = [...synthetic, ...simWeekly];

  let simEvals = evaluations;
  if (evalScore !== null) {
    simEvals = [{ ...(evaluations[0] || {}), score: evalScore, createdAt: futureNow }, ...evaluations.slice(1)];
  }

  const sim = summarize(simWeekly, simEvals, futureNow);

  // --- projection ณ วันสิ้นสุดฝึกงาน ---
  const end = toDate(student?.internshipEnd);
  let projection = null;
  if (end && end.getTime() > baseNow.getTime()) {
    const weeksLeft = Math.max(0, Math.ceil((end.getTime() - baseNow.getTime()) / MS_PER_WEEK));
    const maxSubmit = weeksLeft;
    const idle = summarize(weeklyReports, evaluations, end);
    const steadyReports = [
      ...Array.from({ length: maxSubmit }, (_, i) => ({
        _id: `proj-${i}`,
        weekNumber: maxWeek + i + 1,
        status: "ส่งแล้ว",
        createdAt: end,
      })),
      ...weeklyReports,
    ];
    const steady = summarize(steadyReports, evaluations, end);
    projection = {
      weeksLeft,
      ifIdle: { percent: idle.progress.percent, riskLevel: idle.risk.level, riskScore: idle.risk.score },
      ifSteady: { percent: steady.progress.percent, riskLevel: steady.risk.level, riskScore: steady.risk.score },
    };
  }

  const pick = ({ progress, risk }) => ({
    percent: progress.percent,
    reportsPercent: progress.breakdown.reports.percent,
    submitted: progress.breakdown.reports.submitted,
    expectedByNow: progress.breakdown.reports.expectedByNow,
    riskLevel: risk.level,
    riskScore: risk.score,
    reasons: risk.reasons,
  });

  const baseline = pick(base);
  const simulated = pick(sim);

  const delta = {
    percent: simulated.percent - baseline.percent,
    riskScore: simulated.riskScore - baseline.riskScore,
  };

  let verdict;
  if (delta.riskScore <= -10 || delta.percent >= 5) verdict = "positive";
  else if (delta.riskScore >= 10 || delta.percent <= -5) verdict = "negative";
  else verdict = "neutral";

  const verdictText = {
    positive: "สถานการณ์นี้ช่วยให้ภาพรวมการฝึกงานดีขึ้น",
    neutral: "สถานการณ์นี้ไม่ทำให้ภาพรวมเปลี่ยนแปลงมากนัก",
    negative: "สถานการณ์นี้ทำให้ภาพรวมแย่ลง ควรหลีกเลี่ยงหรือวางแผนรับมือ",
  }[verdict];

  return {
    scenario: { extraReports, daysAhead, fixPending, evalScore },
    baseline,
    simulated,
    delta,
    verdict,
    verdictText,
    projection,
  };
}

module.exports = { simulateWhatIf };
