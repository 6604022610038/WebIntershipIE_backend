const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const studentCtrl = require('../controllers/student/activityController');
const advisorCtrl = require('../controllers/advisor/activityController');

const { byRole } = allowRoles;
const router = express.Router();

router.get('/student/:studentId', auth, allowRoles('student', 'advisor'), studentCtrl.getByStudent);
router.post('/', auth, byRole({ student: studentCtrl.create, advisor: advisorCtrl.create }));
router.put('/:id', auth, byRole({ student: studentCtrl.update, advisor: advisorCtrl.update }));
router.delete('/:id', auth, byRole({ student: studentCtrl.remove, advisor: advisorCtrl.remove }));

module.exports = router;
