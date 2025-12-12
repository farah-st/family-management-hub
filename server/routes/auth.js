// server/routes/auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username, 
      email: user.email ?? null,
      name: user.name ?? null,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/* ============================================================
   POST /api/auth/register
============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { username, name, email, password } = req.body || {};

    // ✅ username + password are required for option A
    const u = String(username ?? "").trim().toLowerCase();
    if (!u || u.length < 3) {
      return res.status(400).json({
        message: "Username is required and must be at least 3 characters",
      });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // ✅ Prevent duplicate usernames
    const existingUser = await User.findOne({ username: u });
    if (existingUser) {
      return res.status(409).json({ message: "Username already in use" });
    }

    // Optional: prevent duplicate emails (only if you still collect email)
    const e = email ? String(email).trim().toLowerCase() : null;
    if (e) {
      const existingEmail = await User.findOne({ email: e });
      if (existingEmail) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      username: u, // ✅ save username
      passwordHash,
      name: name ? String(name).trim() : undefined,
      email: e ?? undefined,
    });

    const token = createToken(user);

    res.status(201).json({
      user: {
        id: user._id.toString(),
        username: user.username, // ✅ return username
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    // ✅ Better error message for duplicate key (just in case)
    if (err && err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(409).json({ message: `${field} already in use` });
    }

    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   POST /api/auth/login
   (Keeping email login as-is; we’ll adjust on the Angular side next)
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken(user);

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username, // ✅ return username
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
