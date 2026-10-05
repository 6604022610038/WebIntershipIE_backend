const express = require('express');

const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const formUpload = require('../../../middleware/formUpload');

const sharedCtrl = require('../controllers/shared/formController');
const advisorCtrl = require('../controllers/advisor/formController');

const router = express.Router();

// นักศึกษาและอาจารย์ดูรายการไฟล์ได้
router.get('/', auth, sharedCtrl.getAll);

// อาจารย์อัปโหลด / ลบไฟล์
router.post('/upload', auth, allowRoles('advisor'), formUpload.single('file'), advisorCtrl.upload);
router.delete('/:id', auth, allowRoles('advisor'), advisorCtrl.remove);

module.exports = router;
