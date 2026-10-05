function forbidden(res) {
  return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้' });
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return forbidden(res);
    next();
  };
}

/**
 * เลือก handler ตามบทบาทของผู้ใช้ เช่น
 *   byRole({ student: student.create, advisor: advisor.create })
 * บทบาทที่ไม่ได้ระบุไว้ (เช่น admin) จะได้ 403 อัตโนมัติ
 */
allowRoles.byRole = (handlers) => (req, res, next) => {
  const handler = req.user && handlers[req.user.role];
  if (!handler) return forbidden(res);
  return handler(req, res, next);
};

module.exports = allowRoles;
