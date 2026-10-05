/** ค่าคงที่และฟังก์ชันช่วยที่ใช้ร่วมกันในทุกส่วนของ Intelligence Engine */
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

module.exports = { MS_PER_DAY, MS_PER_WEEK, clamp, daysBetween, toDate };
