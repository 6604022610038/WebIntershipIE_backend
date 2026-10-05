const express = require("express");
const auth = require("../../../middleware/auth");
const allowRoles = require("../../../middleware/role");
const qaController = require("../controllers/qaController");

const router = express.Router();

// 🤖 Robot Framework QA Center (เฉพาะผู้ดูแลระบบ)
router.get("/results", auth, allowRoles("admin"), qaController.getResults);
router.post("/run", auth, allowRoles("admin"), qaController.runTests);

module.exports = router;
