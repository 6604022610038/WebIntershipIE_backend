/* ============================================================
   7) 🤖 AI INTERNSHIP MENTOR (rule-based, ไม่พึ่ง LLM ภายนอก)
   ============================================================
   วิเคราะห์คำถามของนักศึกษาด้วย keyword matching ภาษาไทย/อังกฤษ
   แล้วตอบกลับโดยอ้างอิงข้อมูลจริงจาก Digital Twin ของนักศึกษาคนนั้น
   ============================================================ */
const MENTOR_TOPICS = [
  {
    keywords: ["ความคืบหน้า", "progress", "เสร็จ", "กี่เปอร์เซ็นต์", "%"],
    handler: (ctx) =>
      `ความคืบหน้าการฝึกงานของคุณตอนนี้อยู่ที่ ${ctx.progress.percent}% ` +
      `(ตามกรอบเวลา ${ctx.progress.breakdown.time.percent}% • การส่งรายงาน ${ctx.progress.breakdown.reports.percent}% • ผลประเมิน ${ctx.progress.breakdown.evaluation.percent}%) ` +
      `${ctx.progress.percent >= 70 ? "ถือว่าอยู่ในเกณฑ์ดี รักษามาตรฐานนี้ไว้นะครับ 👍" : "ลองเพิ่มความสม่ำเสมอในการส่งรายงานเพื่อดันความคืบหน้าให้สูงขึ้นได้ครับ"}`,
  },
  {
    keywords: ["เสี่ยง", "risk", "ความเสี่ยง", "โดนตัด", "ไม่ผ่าน"],
    handler: (ctx) =>
      ctx.risk.level === "low"
        ? "ตอนนี้ยังไม่พบสัญญาณความเสี่ยงที่น่ากังวลครับ ระบบจะคอยแจ้งเตือนหากมีการทิ้งช่วงส่งรายงานนานเกินไป"
        : `ระบบตรวจพบความเสี่ยงระดับ${ctx.risk.level === "high" ? "สูง" : "ปานกลาง"} จากสาเหตุ: ${ctx.risk.reasons.join(
            ", "
          )}. แนะนำให้จัดการเรื่องนี้เป็นลำดับแรกครับ`,
  },
  {
    keywords: ["รายงาน", "report", "ส่งงาน", "ค้าง"],
    handler: (ctx) =>
      `คุณส่งรายงานประจำสัปดาห์แล้ว ${ctx.progress.breakdown.reports.submitted} ฉบับ ` +
      `จากที่ควรส่ง ${ctx.progress.breakdown.reports.expectedByNow} ฉบับ ณ ตอนนี้ ` +
      `${
        ctx.progress.breakdown.reports.submitted < ctx.progress.breakdown.reports.expectedByNow
          ? "ลองแบ่งเวลาสัปดาห์ละครั้งเพื่อบันทึกรายงานให้ทันครับ"
          : "ถือว่าส่งรายงานได้ตามกำหนดดีมากครับ"
      }`,
  },
  {
    keywords: ["ประเมิน", "evaluation", "คะแนน", "ทักษะ"],
    handler: (ctx) => {
      const latest = ctx.evaluations?.[0];
      if (!latest) return "ยังไม่มีผลประเมินในระบบครับ ลองสอบถามอาจารย์ที่ปรึกษาเกี่ยวกับรอบการประเมินถัดไปดูนะครับ";
      return `ผลประเมินล่าสุดของคุณอยู่ที่ ${latest.score}/5 ครับ ${
        latest.comment ? `อาจารย์ให้ความเห็นว่า "${latest.comment}"` : ""
      }`.trim();
    },
  },
  {
    keywords: ["ทำอะไรต่อ", "แนะนำ", "ควรทำอะไร", "next", "recommend"],
    handler: (ctx) => {
      const top = ctx.recommendations?.[0];
      if (!top) return "ตอนนี้ยังไม่มีคำแนะนำเป็นพิเศษครับ ทำตามแผนการฝึกงานปกติต่อไปได้เลย";
      return `สิ่งที่แนะนำให้ทำก่อนคือ "${top.title}" — ${top.detail} วิธีที่แนะนำ: ${top.action}`;
    },
  },
];

function buildMentorReply(question, ctx) {
  const q = String(question || "").trim();
  if (!q) {
    return {
      reply:
        "สวัสดีครับ 🤖 ผมคือ AI Internship Mentor ลองถามผมได้เลยครับ เช่น \"ความคืบหน้าตอนนี้เป็นยังไง\" หรือ \"ตอนนี้ควรทำอะไรต่อ\"",
      matchedTopic: null,
    };
  }

  const topic = MENTOR_TOPICS.find((t) => t.keywords.some((k) => q.toLowerCase().includes(k.toLowerCase())));

  if (topic) {
    return { reply: topic.handler(ctx), matchedTopic: topic.keywords[0] };
  }

  // fallback: สรุปภาพรวมสั้น ๆ พร้อมชวนถามใหม่
  return {
    reply:
      `ขอสรุปภาพรวมให้ก่อนนะครับ: ความคืบหน้า ${ctx.progress.percent}% ระดับความเสี่ยง ${
        ctx.risk.level === "low" ? "ปกติ" : ctx.risk.level === "medium" ? "ปานกลาง" : "สูง"
      } • ลองถามคำถามเจาะจงกว่านี้ได้ครับ เช่น "รายงานค้างไหม" "ควรทำอะไรต่อ" หรือ "ผลประเมินเป็นยังไง"`,
    matchedTopic: null,
  };
}

module.exports = { buildMentorReply };
