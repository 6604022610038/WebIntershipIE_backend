const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const evaluationController = require('../controllers/evaluationController');

const router = express.Router();

router.get('/student/:studentId', auth, evaluationController.getByStudent);
router.get('/', auth, allowRoles('advisor'), evaluationController.getAll);
router.post('/', auth, allowRoles('advisor'), evaluationController.create);

module.exports = router;
