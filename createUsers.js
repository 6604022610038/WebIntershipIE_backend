/**
 * Seed ข้อมูลตัวอย่างที่ "เหมือนข้อมูลจริง"
 *  - นักศึกษา 30 คน ต่างชื่อ ต่างสถานประกอบการ ต่างสายงาน
 *  - รายงานประจำสัปดาห์/ประจำวันเนื้อหาไม่ซ้ำกัน แยกตามสายงานและโครงการของแต่ละคน
 *  - วันที่ทั้งหมดคำนวณจาก "วันนี้" (ตอนนี้อยู่สัปดาห์ที่ 8 จาก 16) จึงดูสดใหม่ทุกครั้งที่รัน
 *  - มีนักศึกษาหลายแบบ (ตรงเวลา / ล่าช้า / หายไป / ต้องแก้ไข / ส่งย้อนหลังรวดเดียว)
 *    เพื่อให้ Risk Monitor และ Anomaly Detection มีข้อมูลจริงให้แสดง
 *
 * รัน:  npm run seed
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Student = require('./models/Student');
const Activity = require('./models/Activity');
const Notification = require('./models/Notification');
const Evaluation = require('./models/Evaluation');
const WeeklyReport = require('./models/WeeklyReport');
const Announcement = require('./models/Announcement');
const Message = require('./models/Message');

const D = require('./seedData');

/* ---------------- ตัวช่วยเรื่องวันที่/สุ่ม ---------------- */
const NOW = new Date();
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const CURRENT_WEEK = 8;
const TOTAL_WEEKS = 16;

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const at = (d, h, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
const mondayOf = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
const notFuture = (d) => (d > NOW ? new Date(NOW.getTime() - 30 * 60 * 1000) : d);
const fmtTh = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
const fmtDay = (d) => d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });

const START = addDays(mondayOf(TODAY), -7 * (CURRENT_WEEK - 1));
const END = addDays(START, TOTAL_WEEKS * 7 - 3);
const SUNDAY = addDays(TODAY, (7 - TODAY.getDay()) % 7); // วันอาทิตย์ที่จะถึง (ปิดรับรายงานประจำสัปดาห์)

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------------- สร้างเอกสารแต่ละชนิด ---------------- */
const SUBMITTED_WEEKS = { main: 7, strong: 7, steady: 7, needfix: 7, late: 6, gap: 2, thin: 7, bulk: 6 };
const LATE_LAG = [0, 1, 15, 10, 8, 5];
const HOURS_FACTOR = { main: 1, strong: 1.03, steady: 0.98, needfix: 0.93, late: 0.86, gap: 0.62, thin: 0.9, bulk: 0.95 };
const PROGRESS = { main: 53, strong: 58, steady: 50, needfix: 44, late: 38, gap: 27, thin: 42, bulk: 45 };
const SKILL_BASE = { main: 82, strong: 88, steady: 76, needfix: 66, late: 64, thin: 62, bulk: 70 };

function statusFor(profile, w) {
  switch (profile) {
    case 'strong': return w <= 6 ? 'อาจารย์ตรวจแล้ว' : 'ส่งแล้ว';
    case 'steady': return w <= 5 ? 'อาจารย์ตรวจแล้ว' : 'ส่งแล้ว';
    case 'needfix': return [3, 5, 6].includes(w) ? 'ต้องแก้ไข' : w <= 5 ? 'อาจารย์ตรวจแล้ว' : 'ส่งแล้ว';
    case 'late': return w === 5 ? 'ต้องแก้ไข' : w <= 4 ? 'อาจารย์ตรวจแล้ว' : 'ส่งแล้ว';
    case 'gap': return 'ต้องแก้ไข';
    case 'thin': return w <= 4 ? 'อาจารย์ตรวจแล้ว' : 'ส่งแล้ว';
    case 'bulk': return w <= 3 ? 'อาจารย์ตรวจแล้ว' : 'ส่งแล้ว';
    case 'main': return w === 4 ? 'ต้องแก้ไข' : w <= 5 ? 'อาจารย์ตรวจแล้ว' : 'ส่งแล้ว';
    default: return 'ส่งแล้ว';
  }
}

function buildWeekly(row, idx) {
  const [studentId, , , co, , track, proj, tools, , , profile] = row;
  const rand = rng(1000 + idx);
  const fill = (s) => s.replace(/\{co\}/g, co).replace(/\{p\}/g, proj).replace(/\{t\}/g, tools);
  const docs = [];

  for (let w = 1; w <= SUBMITTED_WEEKS[profile]; w++) {
    const startDate = addDays(START, (w - 1) * 7);
    const endDate = addDays(startDate, 6);
    const status = statusFor(profile, w);

    let title, workDescription, problems, solution;
    if (profile === 'thin') {
      const [t, d] = D.THIN[w - 1];
      title = t; workDescription = d; problems = w % 3 === 0 ? 'ยังไม่คุ้นกับเครื่องมือของทีม' : '-'; solution = '-';
    } else {
      const tpl = D.WEEKLY[track][w - 1];
      [title, workDescription, problems, solution] = tpl.map(fill);
    }

    let lag = pick(rand, [-2, -1, 0, 0, 0, 1]);
    if (profile === 'late') lag = LATE_LAG[w - 1];
    let createdAt = at(addDays(endDate, lag), 17 + Math.floor(rand() * 5), Math.floor(rand() * 60));
    if (profile === 'bulk' && w >= 4) createdAt = at(addDays(TODAY, -7), 10, 12 + (w - 4) * 26);
    if (profile === 'gap' && w === 2) createdAt = at(addDays(endDate, 1), 18, 20);
    createdAt = notFuture(createdAt);

    let advisorComment = '';
    if (status === 'อาจารย์ตรวจแล้ว') {
      const pool = profile === 'thin' ? D.COMMENTS_THIN : D.COMMENTS_OK;
      advisorComment = pool[(w + idx) % pool.length];
    } else if (status === 'ต้องแก้ไข') {
      advisorComment = D.COMMENTS_FIX[(w + idx) % D.COMMENTS_FIX.length];
    }
    const reviewed = status !== 'ส่งแล้ว';
    const updatedAt = notFuture(reviewed ? addDays(createdAt, 1 + Math.floor(rand() * 2)) : createdAt);

    docs.push({ studentId, weekNumber: w, startDate, endDate, workTitle: title, workDescription, problems, solution, status, advisorComment, createdAt, updatedAt });
  }

  // ร่างของสัปดาห์ปัจจุบัน (เฉพาะบางคน)
  if (profile === 'main' || (profile === 'strong' && idx % 2 === 1)) {
    const startDate = addDays(START, (CURRENT_WEEK - 1) * 7);
    docs.push({
      studentId, weekNumber: CURRENT_WEEK, startDate, endDate: addDays(startDate, 6),
      workTitle: `ต่อยอดงาน ${proj} (ร่าง)`,
      workDescription: `ต่อจากสัปดาห์ก่อน ดำเนินงาน${proj}ในส่วนที่ค้างอยู่ ปรับตามข้อเสนอแนะของพี่เลี้ยงงาน และเตรียมข้อมูลสำหรับการประชุมความก้าวหน้าประจำสัปดาห์ (ยังเขียนไม่เสร็จ)`,
      problems: '-', solution: '-', status: 'ร่าง', advisorComment: '',
      createdAt: at(TODAY, 9, 5), updatedAt: at(TODAY, 9, 5),
    });
  }
  return docs;
}

function workdaysBack(from, n) {
  const out = [];
  let d = new Date(from);
  while (out.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
    d = addDays(d, -1);
  }
  return out;
}

function buildEvaluations(row, idx) {
  const [studentId, , , , , , , , , , profile] = row;
  if (profile === 'gap') return [];
  const rand = rng(9000 + idx);
  const make = (base, when, tier) => {
    const jitter = () => Math.round((rand() - 0.5) * 14);
    const skills = {
      knowledge: clamp(base + jitter(), 45, 100),
      performance: clamp(base + jitter(), 45, 100),
      problemSolving: clamp(base - 3 + jitter(), 45, 100),
      teamwork: clamp(base + 4 + jitter(), 45, 100),
      ethics: clamp(base + 9 + jitter(), 50, 100),
    };
    const avg = Object.values(skills).reduce((s, x) => s + x, 0) / 5;
    const score = Math.round(clamp(avg / 20, 0, 5) * 10) / 10;
    const pool = avg >= 80 ? D.EVAL_COMMENTS.high : avg >= 68 ? D.EVAL_COMMENTS.mid : D.EVAL_COMMENTS.low;
    return { studentId, advisorId: D.ADVISOR.username, score, comment: pool[(idx + tier) % pool.length], skills, createdAt: when, updatedAt: when };
  };
  const base = SKILL_BASE[profile];
  const list = [make(base, at(addDays(TODAY, -(4 + (idx % 9))), 15), 0)];
  if (profile === 'main') list.unshift(make(base - 6, at(addDays(START, 3 * 7 + 4), 14), 1));
  return list;
}

function buildActivities(row, idx) {
  const [studentId, , , co, , , proj, , mentor, , profile] = row;
  const list = [];
  if (profile === 'main') {
    list.push(
      { title: 'สัมมนาแนวทางเขียนรายงานฉบับสมบูรณ์', description: 'บรรยายโดยอาจารย์นิเทศ ห้องประชุมคณะ ชั้น 3', activityDate: addDays(TODAY, -3), time: '13:00 น.', type: 'กิจกรรม' },
      { title: 'ประชุมความก้าวหน้ากับพี่เลี้ยงงาน', description: `พูดคุยกับ${mentor} เรื่องแดชบอร์ดเวอร์ชันสองและแผนสัปดาห์นี้`, activityDate: addDays(TODAY, 1), time: '10:00 น.', type: 'นัดหมาย' },
      { title: 'ส่งรายงานประจำสัปดาห์ที่ 8', description: 'ปิดรับภายในเวลา 23:59 น. ผ่านระบบ', activityDate: SUNDAY, time: '23:59 น.', type: 'รายงาน' },
      { title: 'นัดพบอาจารย์นิเทศ (ออนไลน์)', description: 'ติดตามความคืบหน้าและตกลงแก้ไขรายงานสัปดาห์ที่ 4', activityDate: addDays(TODAY, 4), time: '13:30 น.', type: 'นัดหมาย' },
      { title: `สาธิตผลงาน${proj}ให้ทีม`, description: 'นำเสนอ 15 นาที ต่อหน้าทีมวิเคราะห์ข้อมูลและผู้จัดการฝ่าย', activityDate: addDays(TODAY, 9), time: '14:00 น.', type: 'กิจกรรม' },
      { title: 'ส่งแบบประเมินจากสถานประกอบการ', description: 'ให้พี่เลี้ยงงานกรอกแบบประเมินและอัปโหลดในระบบ', activityDate: addDays(TODAY, 16), time: '16:00 น.', type: 'รายงาน' },
    );
  } else {
    list.push({
      title: 'นิเทศที่สถานประกอบการ รอบที่ 2',
      description: `อาจารย์นิเทศพบนักศึกษาและ${mentor} ที่ ${co}`,
      activityDate: addDays(TODAY, 5 + (idx * 7 % 32)),
      time: pick(rng(idx + 77), ['09:30 น.', '10:30 น.', '13:30 น.', '15:00 น.']),
      type: 'นัดหมาย',
    });
  }
  return list.map((a) => ({ studentId, ...a }));
}

function mainNotifications(studentId, evalScore, mainWeeklies) {
  const w4 = mainWeeklies.find((r) => r.weekNumber === 4);
  const w5 = mainWeeklies.find((r) => r.weekNumber === 5);
  const deadline = SUNDAY;
  const mk = (title, detail, type, when, isRead) => ({ recipientRole: 'student', recipientId: studentId, title, detail, type, isRead, createdAt: notFuture(when), updatedAt: notFuture(when) });
  return [
    mk('อาจารย์ตรวจรายงานสัปดาห์ที่ 5 แล้ว', `รายงานช่วง ${fmtShort(w5.startDate)} – ${fmtShort(w5.endDate)} ผ่านการตรวจ พร้อมความเห็นจากอาจารย์`, 'success', addDays(w5.endDate, 2), true),
    mk('รายงานสัปดาห์ที่ 4 ต้องแก้ไข', 'อาจารย์ขอให้เพิ่มรายละเอียดส่วนปัญหาและวิธีแก้ไข กรุณาแก้ไขแล้วส่งใหม่', 'warning', addDays(w4.endDate, 3), true),
    mk('ผลประเมินกลางภาคออกแล้ว', `คะแนนประเมินล่าสุดของคุณคือ ${evalScore} / 5 ดูรายละเอียดได้ที่เมนูประเมินผล`, 'success', addDays(TODAY, -5), true),
    mk('มีนัดหมายใหม่จากอาจารย์นิเทศ', `นัดพบออนไลน์ ${fmtDay(addDays(TODAY, 4))} เวลา 13:30 น.`, 'info', addDays(TODAY, -2), false),
    mk('มีประกาศใหม่จากอาจารย์', D.ANNOUNCEMENTS[1].title, 'info', at(addDays(TODAY, -3), 10, 15), false),
    mk('ใกล้ถึงกำหนดส่งรายงานสัปดาห์ที่ 8', `ปิดรับภายในวันที่ ${fmtTh(deadline)} เวลา 23:59 น.`, 'warning', at(TODAY, 8, 30), false),
  ];
}

/* ---------------- main ---------------- */
async function upsertUser(username, password, name, role) {
  const hash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate({ username }, { $set: { username, password: hash, name, role } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function seed() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error('Missing MONGO_URI in .env');
    await mongoose.connect(uri);

    await upsertUser(D.ADVISOR.username, '123456', D.ADVISOR.name, 'advisor');
    await upsertUser(D.ADMIN.username, '123456', D.ADMIN.name, 'admin');

    const ids = D.STUDENTS.map((s) => s[0]);
    for (const row of D.STUDENTS) {
      const [studentId, name] = row;
      await upsertUser(studentId, '123456', name, 'student');
    }

    // ล้างข้อมูลเดิมของนักศึกษาชุดนี้ก่อนสร้างใหม่ (รวมข้อมูลตัวอย่างเก่า)
    const scope = { studentId: { $in: ids } };
    await Promise.all([Activity, WeeklyReport, Evaluation, Message].map((M) => M.deleteMany(scope)));
    await Notification.deleteMany({ $or: [
      { recipientRole: 'student', recipientId: { $in: ids } },
      { recipientRole: 'advisor', recipientId: D.ADVISOR.username },
    ] });
    await Announcement.deleteMany({ title: { $in: D.ANNOUNCEMENTS.map((a) => a.title) } });

    const weeklyAll = [], evalAll = [], actAll = [];
    for (let i = 0; i < D.STUDENTS.length; i++) {
      const row = D.STUDENTS[i];
      const [studentId, name, major, company, position, , , , mentorName, mentorPosition, profile] = row;
      const rand = rng(300 + i);

      const weekly = buildWeekly(row, i);
      weeklyAll.push(...weekly);
      evalAll.push(...buildEvaluations(row, i));
      actAll.push(...buildActivities(row, i));

      const base = (CURRENT_WEEK - 1) * 20 + 8;
      await Student.findOneAndUpdate({ studentId }, {
        $set: {
          studentId, name, email: `${studentId}@student.example.ac.th`,
          phone: `08${Math.floor(1 + rand() * 9)}-${String(Math.floor(rand() * 900) + 100)}-${String(Math.floor(rand() * 9000) + 1000)}`,
          faculty: 'คณะวิทยาศาสตร์และเทคโนโลยี', major: `สาขา${major}`,
          company, position, mentorName, mentorPosition, advisorId: D.ADVISOR.username,
          internshipStart: START, internshipEnd: END,
          status: 'กำลังฝึกงาน',
          progress: clamp(PROGRESS[profile] + Math.round((rand() - 0.5) * 6), 0, 100),
          totalWeeks: TOTAL_WEEKS, currentWeek: CURRENT_WEEK,
          totalHours: Math.round(base * HOURS_FACTOR[profile] + (rand() - 0.5) * 6),
          requiredHours: 320,
        },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    await WeeklyReport.insertMany(weeklyAll);
    await Evaluation.insertMany(evalAll);
    await Activity.insertMany(actAll);

    // ประกาศ
    await Announcement.insertMany(D.ANNOUNCEMENTS.map((a) => {
      const when = at(addDays(TODAY, a.dayOffset), 9, 0);
      return { title: a.title, content: a.content, type: a.type, publishDate: when, isPublished: true, createdBy: D.ADVISOR.name, createdAt: when, updatedAt: when };
    }));

    // แจ้งเตือนนักศึกษาหลัก
    const mainId = D.STUDENTS[0][0];
    const mainEvalScore = evalAll.filter((e) => e.studentId === mainId).sort((a, b) => b.createdAt - a.createdAt)[0].score;
    await Notification.insertMany(mainNotifications(mainId, mainEvalScore, weeklyAll.filter((r) => r.studentId === mainId)));

    // แจ้งเตือนอาจารย์ (อ้างอิงข้อมูลจริงที่เพิ่งสร้าง)
    const nameOf = (profile) => D.STUDENTS.find((s) => s[10] === profile)[1];
    const waiting = weeklyAll.filter((r) => r.status === 'ส่งแล้ว').length;
    const evaluated = new Set(evalAll.map((e) => e.studentId)).size;
    const mk = (title, detail, type, when, isRead = false) => ({ recipientRole: 'advisor', recipientId: D.ADVISOR.username, title, detail, type, isRead, createdAt: notFuture(when), updatedAt: notFuture(when) });
    await Notification.insertMany([
      mk(`มีรายงานรอตรวจ ${waiting} ฉบับ`, 'รายงานประจำสัปดาห์ที่ 6–7 จากนักศึกษาที่ส่งเข้าระบบแล้วยังไม่ได้รับการตรวจ', 'info', at(TODAY, 8, 10)),
      mk(`${nameOf('gap')} ไม่ได้ส่งรายงานมาแล้วกว่า 4 สัปดาห์`, 'ระบบจัดระดับความเสี่ยงเป็น "สูง" แนะนำให้ติดต่อนักศึกษาและพี่เลี้ยงงาน', 'warning', at(addDays(TODAY, -1), 16, 40)),
      mk(`${nameOf('bulk')} ส่งรายงานย้อนหลังหลายฉบับพร้อมกัน`, 'พบการส่งรายงานสัปดาห์ที่ 4–6 ภายในวันเดียว ควรตรวจสอบความสอดคล้องกับบันทึกประจำวัน', 'warning', addDays(TODAY, -7)),
      mk(`${nameOf('late')} ส่งรายงานล่าช้าต่อเนื่อง`, 'รายงานสัปดาห์ที่ 3 ส่งช้ากว่ากำหนดเกิน 14 วัน และสัปดาห์ที่ 5 ต้องแก้ไข', 'warning', addDays(TODAY, -4)),
      mk('มีข้อความใหม่จากนักศึกษา', 'มีนักศึกษาส่งข้อความถึงอาจารย์ในแชทที่ยังไม่ได้อ่าน', 'info', at(addDays(TODAY, -1), 19, 5)),
      mk('ใกล้ถึงกำหนดนิเทศรอบที่ 2', `เริ่มนิเทศที่สถานประกอบการตั้งแต่ ${fmtDay(addDays(TODAY, 5))} ตรวจสอบตารางในปฏิทินกิจกรรม`, 'info', addDays(TODAY, -2), true),
      mk(`บันทึกผลประเมินกลางภาคแล้ว ${evaluated} จาก ${ids.length} คน`, 'ยังไม่มีผลประเมินของนักศึกษา 1 คน เนื่องจากขาดการติดต่อ', 'success', addDays(TODAY, -3), true),
    ]);

    // แชท (อาจารย์มีห้องแชทกับนักศึกษาแต่ละคน)
    const msg = (studentId, sender, senderName, text, when, readS, readA) =>
      ({ studentId, sender, senderName, text, readByStudent: readS, readByAdvisor: readA, createdAt: notFuture(when), updatedAt: notFuture(when) });
    const S = 'student', A = 'advisor', an = D.ADVISOR.name;
    const idOf = (profile, n = 0) => D.STUDENTS.filter((s) => s[10] === profile)[n];
    const messages = [
      msg(mainId, S, D.STUDENTS[0][1], 'สวัสดีครับอาจารย์ ผมอยากสอบถามว่ารายงานสัปดาห์ที่ 4 ต้องแก้ตรงไหนบ้างครับ', at(addDays(TODAY, -12), 10, 20), true, true),
      msg(mainId, A, an, 'สวัสดีธนภัทร ส่วนปัญหาและวิธีแก้ยังสั้นไป ลองอธิบายสาเหตุที่รหัสสาขาไม่ตรงกัน และวิธีที่ใช้ตรวจสอบให้ละเอียดขึ้นนะ', at(addDays(TODAY, -12), 11, 5), true, true),
      msg(mainId, S, D.STUDENTS[0][1], 'รับทราบครับ ผมจะปรับแล้วส่งกลับภายในสองวันครับ', at(addDays(TODAY, -12), 11, 30), true, true),
      msg(mainId, S, D.STUDENTS[0][1], 'อาจารย์ครับ ผมส่งรายงานสัปดาห์ที่ 4 ฉบับแก้ไขแล้วครับ รบกวนตรวจอีกครั้งครับ', at(addDays(TODAY, -9), 18, 45), true, true),
      msg(mainId, A, an, `ได้รับแล้ว เดี๋ยวอาจารย์ตรวจให้ ส่วน${fmtDay(addDays(TODAY, 4))} ขอนัดคุยออนไลน์ตอนบ่ายครึ่งนะ`, at(addDays(TODAY, -2), 9, 40), true, true),
      msg(mainId, S, D.STUDENTS[0][1], 'ได้ครับอาจารย์ ผมจะเตรียมเดโมแดชบอร์ดสั้น ๆ ไปให้ดูด้วยครับ', at(addDays(TODAY, -2), 10, 2), true, true),
      msg(mainId, A, an, 'ดีเลย อย่าลืมแนบภาพหน้าจอแดชบอร์ดเวอร์ชันล่าสุดในรายงานสัปดาห์ที่ 8 ด้วยนะ', at(addDays(TODAY, -1), 17, 30), false, true),

      msg(idOf('gap')[0], S, idOf('gap')[1], 'ขออภัยที่ส่งรายงานล่าช้าค่ะอาจารย์ ช่วงนี้เทศบาลมีงานประชุมสภา หนูไม่ได้เข้าห้องทำงานหลายวัน จะรีบส่งภายในสัปดาห์นี้ค่ะ', at(addDays(TODAY, -1), 19, 5), false, false),
      msg(idOf('late')[0], S, idOf('late')[1], 'อาจารย์คะ หนูส่งหนังสือชี้แจงเรื่องรายงานล่าช้าทางอีเมลแล้วนะคะ รบกวนอาจารย์ตรวจสอบด้วยค่ะ', at(addDays(TODAY, -2), 14, 12), false, false),
      msg(idOf('needfix')[0], S, idOf('needfix')[1], 'ครับอาจารย์ ผมแก้รายงานสัปดาห์ที่ 4 เรียบร้อยแล้ว รบกวนตรวจอีกรอบครับ', at(addDays(TODAY, -1), 12, 40), false, false),
      msg(idOf('bulk')[0], S, idOf('bulk')[1], 'ขอโทษค่ะอาจารย์ ที่ส่งรายงานย้อนหลังพร้อมกัน สัปดาห์ก่อนมีงานด่วนของลูกค้า หนูจะบันทึกรายสัปดาห์ให้ตรงเวลาต่อไปค่ะ', at(addDays(TODAY, -6), 20, 15), false, false),
      msg(idOf('strong')[0], S, idOf('strong')[1], 'อาจารย์คะ หนูอยากปรึกษาเรื่องหัวข้อรายงานฉบับสมบูรณ์ค่ะ ว่าควรเน้นผลงานหรือกระบวนการทำงานมากกว่ากัน', at(addDays(TODAY, -3), 16, 20), true, true),
      msg(idOf('strong')[0], A, an, 'ควรเน้นทั้งสองอย่างแต่ให้สัดส่วนผลงานมากกว่า เอาตัวเลขผลลัพธ์ขึ้นก่อน แล้วค่อยเล่ากระบวนการทำงานตามหลัง', at(addDays(TODAY, -3), 17, 5), true, true),
    ];
    await Message.insertMany(messages);

    console.log(`Seed complete: ${ids.length} students, ${weeklyAll.length} weekly reports, ${evalAll.length} evaluations`);
    console.log(`Internship window: ${fmtTh(START)} – ${fmtTh(END)} (week ${CURRENT_WEEK}/${TOTAL_WEEKS})`);
    console.log('Student login: 640123456 / 123456   (student IDs 640123456 – 640123485 all use 123456)');
    console.log(`Advisor login: ${D.ADVISOR.username} / 123456`);
    console.log(`Admin login:   ${D.ADMIN.username} / 123456   (QA Center)`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
