const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const studentCtrl = require('../controllers/student/studentController');
const advisorCtrl = require('../controllers/advisor/studentController');

const router = express.Router();

// นักศึกษา (อาจารย์เข้าถึงข้อมูลนักศึกษาได้ผ่านเงื่อนไข own())
router.get('/student-id/:studentId', auth, allowRoles('student', 'advisor'), studentCtrl.getByStudentId);
router.put('/student-id/:studentId', auth, allowRoles('student', 'advisor'), studentCtrl.updateByStudentId);

// อาจารย์
router.get('/', auth, allowRoles('advisor'), advisorCtrl.getAll);
router.post('/', auth, allowRoles('advisor'), advisorCtrl.create);
router.put('/:id', auth, allowRoles('advisor'), advisorCtrl.updateById);
router.delete('/:id', auth, allowRoles('advisor'), advisorCtrl.deleteById);

// ดูรายตัวด้วย _id (own() ตรวจสิทธิ์ภายใน)
router.get('/:id', auth, allowRoles('student', 'advisor'), studentCtrl.getById);

module.exports = router;
