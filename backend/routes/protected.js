const express = require("express");
const router = express.Router();
const { authenticate, authorizeRole } = require("../middleware/authMiddleware");

// simple protected route
router.get("/protected", authenticate, (req, res) => {
  res.json({ message: "Success - you accessed a protected route", user: req.user });
});

// admin-only example
router.get("/admin-only", authenticate, authorizeRole("admin"), (req, res) => {
  res.json({ message: "Hello Admin", user: req.user });
});

module.exports = router;
