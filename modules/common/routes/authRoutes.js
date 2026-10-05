const express = require("express");
const auth = require("../../../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/login", authController.login);
router.get("/me", auth, authController.getMe);
router.put("/me", auth, authController.updateMe);
router.put("/password", auth, authController.changePassword);

module.exports = router;
