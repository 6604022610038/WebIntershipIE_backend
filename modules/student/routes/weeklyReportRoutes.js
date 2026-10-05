const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const upload = require('../../../middleware/upload');
const studentCtrl = require('../controllers/student/weeklyReportController');
const advisorCtrl = require('../controllers/advisor/weeklyReportController');

const router = express.Router();

// อ่านรายงาน (own() ตรวจสิทธิ์ภายใน: นักศึกษาเห็นของตัวเอง อาจารย์เห็นทุกคน)
router.get('/student/:studentId', auth, allowRoles('student', 'advisor'), studentCtrl.getByStudent);
router.get('/report/:id', auth, allowRoles('student', 'advisor'), studentCtrl.getById);

// อาจารย์
router.get('/', auth, allowRoles('advisor'), advisorCtrl.getAll);
router.put('/:id/approve', auth, allowRoles('advisor'), advisorCtrl.approve);
router.put('/:id/reject', auth, allowRoles('advisor'), advisorCtrl.reject);

// นักศึกษา
router.post('/', auth, allowRoles('student'), upload.array('attachments', 5), studentCtrl.create);
router.put('/:id', auth, allowRoles('student'), upload.array('attachments', 5), studentCtrl.update);
router.delete('/:id', auth, allowRoles('student'), studentCtrl.remove);

module.exports = router;
