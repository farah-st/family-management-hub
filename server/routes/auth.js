import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

// ------------------------------------------------------------
// Authentication Router
// This file handles:
//  - User registration
//  - User login
//  - Validating existing sessions ("/me")
// It issues JWT tokens that Angular stores and uses for API access.
// ------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/* ------------------------------------------------------------
   Helper: createToken(user)
   Creates a signed JWT that identifies the user.
   The token includes:
     - sub: user ID
     - email, name, role
   Angular sends this token in Authorization headers.
------------------------------------------------------------ */
function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/* ============================================================
   POST /api/auth/register
   Creates a new user account.

   Steps:
     1. Validate email + password exist
     2. Check if the email is already registered
     3. Hash the password using bcrypt
     4. Save the new user in MongoDB
     5. Return a JWT token so the user can stay logged in

   Angular calls this from RegisterComponent (AuthService).
============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Prevent duplicate accounts
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Securely hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      name: name?.trim() || "",
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    // Issue JWT token
    const token = createToken(user);

    res.status(201).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   POST /api/auth/login
   Validates user credentials and returns a JWT.

   Steps:
     1. Confirm email + password were sent
     2. Look up the user by email
     3. Compare password with bcrypt hash
     4. Return user info + token on success

   Angular saves the token and keeps the user logged in.
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
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare plaintext vs hashed password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Issue token
    const token = createToken(user);

    res.json({
      user: {
        id: user._id.toString(),
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

/* ============================================================
   GET /api/auth/me
   Returns the currently authenticated user's data.

   - This route uses authRequired middleware.
   - Middleware verifies the JWT from the Authorization header.
   - If valid, it loads the user from MongoDB and attaches req.user.

   Angular uses this method on app startup to restore the session.
============================================================ */
router.get("/me", authRequired, async (req, res) => {
  // authRequired already validated the token and fetched the user
  res.json({ user: req.user });
});

export default router;