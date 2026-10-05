const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const studentCtrl = require('../controllers/student/messageController');
const advisorCtrl = require('../controllers/advisor/messageController');

const { byRole } = allowRoles;
const router = express.Router();

router.get('/conversations', auth, allowRoles('advisor'), advisorCtrl.getConversations);
router.get('/unread-count', auth, byRole({ student: studentCtrl.getUnreadCount, advisor: advisorCtrl.getUnreadCount }));
router.get('/:studentId', auth, byRole({ student: studentCtrl.getThread, advisor: advisorCtrl.getThread }));
router.post('/', auth, byRole({ student: studentCtrl.send, advisor: advisorCtrl.send }));

module.exports = router;
