const express = require('express');
const auth = require('../../../middleware/auth');
const allowRoles = require('../../../middleware/role');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/advisor', auth, allowRoles('advisor'), dashboardController.getAdvisorDashboard);

module.exports = router;
