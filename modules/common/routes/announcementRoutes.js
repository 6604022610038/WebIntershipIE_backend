const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const sharedCtrl = require('../controllers/shared/announcementController');
const advisorCtrl = require('../controllers/advisor/announcementController');

const router = express.Router();

// นักศึกษาและอาจารย์ดูประกาศได้
router.get('/', auth, sharedCtrl.getAll);
router.get('/:id', auth, sharedCtrl.getById);

// อาจารย์สร้าง / แก้ไข / ลบ
router.post('/', auth, allowRoles('advisor'), advisorCtrl.create);
router.put('/:id', auth, allowRoles('advisor'), advisorCtrl.update);
router.delete('/:id', auth, allowRoles('advisor'), advisorCtrl.remove);

module.exports = router;
