import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/register
 * Body: { username, password, name?, email? }
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password, name, email } = req.body || {};

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(409).json({ message: "Username is already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: username.trim(),
      passwordHash,
      name,
      email,
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({
      message: "Failed to register user",
      detail: err.message,
    });
  }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      message: "Failed to log in",
      detail: err.message,
    });
  }
});

export default router;
