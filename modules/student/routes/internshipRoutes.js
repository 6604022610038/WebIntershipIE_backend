const express = require('express');
const auth = require('../../../middleware/auth');
const internshipController = require('../controllers/internshipController');

const router = express.Router();

router.get('/:studentId', auth, internshipController.getByStudentId);
router.put('/:studentId', auth, internshipController.updateByStudentId);

module.exports = router;
