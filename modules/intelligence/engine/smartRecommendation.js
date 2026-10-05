const { daysBetween, toDate } = require("./shared");

/* ============================================================
   5) 🧠 SMART RECOMMENDATION ENGINE
   ============================================================
   สร้างรายการสิ่งที่ควรทำ (action items) เฉพาะบุคคล โดยพิจารณาจาก
   Progress, Risk, รายงานที่ค้างอยู่ และผลประเมิน แล้วจัดลำดับความสำคัญ
   ============================================================ */
function buildRecommendations({
  student,
  progress,
  risk,
  weeklyReports = [],
  evaluations = [],
}) {
  const items = [];
  const now = new Date();

  const pushItem = (priority, icon, title, detail, action) => {
    items.push({ priority, icon, title, detail, action });
  };

  // 1) ไม่มีการส่งรายงานเลย / ทิ้งช่วงนาน -> เร่งด่วนที่สุด
  if (risk?.idleDays != null && risk.idleDays >= 10) {
    pushItem(
      "high",
      "⏰",
      "ส่งรายงานที่ค้างอยู่โดยเร็ว",
      `ไม่มีการส่งรายงานมาแล้ว ${risk.idleDays} วัน ซึ่งอาจกระทบความคืบหน้าและผลประเมิน`,
      "ไปที่หน้า 'บันทึกรายงาน' เพื่อบันทึกความคืบหน้าล่าสุด"
    );
  } else if (!risk?.lastActivityAt) {
    pushItem(
      "high",
      "🚀",
      "เริ่มบันทึกรายงานฉบับแรก",
      "ยังไม่พบประวัติการส่งรายงานใด ๆ นับตั้งแต่เริ่มฝึกงาน",
      "สร้างรายงานประจำสัปดาห์ฉบับแรกของคุณ"
    );
  }

  // 2) รายงานที่ต้องแก้ไขค้างอยู่
  const needFixWeekly = weeklyReports.filter((r) => r.status === "ต้องแก้ไข");
  if (needFixWeekly.length) {
    pushItem(
      "high",
      "✏️",
      "แก้ไขรายงานตามคำแนะนำอาจารย์",
      `มีรายงานที่ต้องแก้ไขค้างอยู่ ${needFixWeekly.length} ฉบับ`,
      "เปิดดูความคิดเห็นจากอาจารย์แล้วปรับปรุงเนื้อหาที่เกี่ยวข้อง"
    );
  }

  // 3) ความคืบหน้าล่าช้ากว่ากรอบเวลา
  if (progress) {
    const gap = progress.breakdown.time.percent - progress.breakdown.reports.percent;
    if (gap >= 15) {
      pushItem(
        "medium",
        "📈",
        "เร่งอัตราการส่งรายงานให้ทันกรอบเวลา",
        `การส่งรายงานตามหลังกรอบเวลาที่ควรจะเป็นอยู่ประมาณ ${Math.round(gap)}%`,
        "วางแผนส่งรายงานสัปดาห์ละ 1 ฉบับให้สม่ำเสมอ"
      );
    }
  }

  // 4) ยังไม่มีผลประเมิน หรือคะแนนต่ำในบางด้าน
  const latestEval = evaluations[0];
  if (!latestEval) {
    pushItem(
      "low",
      "⭐",
      "ติดตามขอผลประเมินจากอาจารย์นิเทศก์",
      "ยังไม่มีผลประเมินในระบบ การมีผลประเมินช่วยให้เห็นจุดแข็ง-จุดที่ควรพัฒนาได้ชัดเจนขึ้น",
      "สอบถามอาจารย์ที่ปรึกษาเกี่ยวกับกำหนดการประเมินครั้งถัดไป"
    );
  } else {
    const skills = latestEval.skills || {};
    const skillLabels = {
      knowledge: "ความรู้ในงาน",
      performance: "ผลการปฏิบัติงาน",
      problemSolving: "การแก้ปัญหา",
      teamwork: "การทำงานเป็นทีม",
      ethics: "จรรยาบรรณ/วินัย",
    };
    const weakSkill = Object.entries(skills)
      .filter(([, v]) => Number(v) > 0)
      .sort((a, b) => a[1] - b[1])[0];
    if (weakSkill && Number(weakSkill[1]) <= 3) {
      pushItem(
        "medium",
        "🎯",
        `พัฒนาทักษะด้าน "${skillLabels[weakSkill[0]] || weakSkill[0]}"`,
        `ผลประเมินล่าสุดให้คะแนนด้านนี้ ${weakSkill[1]}/5 ซึ่งต่ำกว่าด้านอื่น`,
        "ขอคำแนะนำเพิ่มเติมจากพี่เลี้ยงในสถานประกอบการ หรือฝึกฝนผ่านงานที่ได้รับมอบหมาย"
      );
    }
  }

  // 5) รายงานเนื้อหาสั้นเกินไปต่อเนื่องหลายฉบับ
  const recentWeekly = weeklyReports.slice(0, 3);
  const shortReports = recentWeekly.filter(
    (r) => ((r.workDescription || "").trim().length < 80)
  );
  if (recentWeekly.length >= 2 && shortReports.length === recentWeekly.length) {
    pushItem(
      "low",
      "📝",
      "เพิ่มรายละเอียดในรายงานให้ครบถ้วนขึ้น",
      "รายงานล่าสุดหลายฉบับมีเนื้อหาค่อนข้างสั้น อาจทำให้อาจารย์ประเมินความคืบหน้าได้ไม่ครบถ้วน",
      "อธิบายงานที่ทำ ปัญหาที่พบ และวิธีแก้ไขให้ละเอียดขึ้นในรายงานฉบับถัดไป"
    );
  }

  // 6) ใกล้สิ้นสุดการฝึกงานแต่ progress ยังต่ำ
  const end = toDate(student?.internshipEnd);
  if (end && progress) {
    const daysLeft = daysBetween(now, end);
    if (daysLeft >= 0 && daysLeft <= 14 && progress.percent < 85) {
      pushItem(
        "high",
        "🏁",
        "ใกล้สิ้นสุดการฝึกงานแล้ว เตรียมสรุปงานให้ครบ",
        `เหลือเวลาอีกประมาณ ${daysLeft} วัน แต่ความคืบหน้าโดยรวมอยู่ที่ ${progress.percent}%`,
        "ตรวจสอบรายงานที่ยังค้าง และเตรียมเอกสารสรุปผลการฝึกงานล่วงหน้า"
      );
    }
  }

  // ถ้าไม่มีข้อควรปรับปรุงเลย ให้กำลังใจแทน
  if (!items.length) {
    pushItem(
      "low",
      "🎉",
      "รักษามาตรฐานการฝึกงานที่ดีต่อไป",
      "ไม่พบสิ่งที่ต้องปรับปรุงเร่งด่วนในขณะนี้ ความคืบหน้าและวินัยการส่งรายงานอยู่ในเกณฑ์ดี",
      "ส่งรายงานอย่างสม่ำเสมอและติดตามคำแนะนำจากอาจารย์ต่อไป"
    );
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

module.exports = { buildRecommendations };
