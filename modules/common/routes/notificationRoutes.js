const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const studentCtrl = require('../controllers/student/notificationController');
const advisorCtrl = require('../controllers/advisor/notificationController');
const sharedCtrl = require('../controllers/shared/notificationController');

const router = express.Router();

router.get('/student/:studentId', auth, allowRoles('student', 'advisor'), studentCtrl.getByStudent);
router.put('/student/:studentId/read-all', auth, allowRoles('student', 'advisor'), studentCtrl.markAllReadForStudent);
router.put('/advisor/read-all', auth, allowRoles('advisor'), advisorCtrl.markAllReadForAdvisor);
router.put('/:id/read', auth, allowRoles('student', 'advisor'), sharedCtrl.markRead);

module.exports = router;
