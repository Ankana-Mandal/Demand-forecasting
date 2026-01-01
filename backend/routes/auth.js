const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SALT_ROUNDS = 10;

// ---------------------- REGISTER ----------------------
// Register
router.post("/register", async (req, res) => {
  try {
    console.log("Received body:", req.body);

    const { name, email, password, adminCode } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "User already exists" });

    // ❗ If user typed adminCode but it is WRONG → block registration
    if (adminCode && adminCode !== process.env.ADMIN_SECRET) {
      return res.status(403).json({
        message: "❌ Invalid Admin Code. Permission Denied."
      });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    let role = "user";

    // ✔ If adminCode correct → assign admin
    if (adminCode === process.env.ADMIN_SECRET) {
      role = "admin";
      console.log("Admin account created!");
    }

    const user = new User({
      name,
      email,
      password: hashed,
      role: role,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------------------- LOGIN ----------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
