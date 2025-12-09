// server/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token and get payload
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.sub;

    // Optional but nice: load fresh user from DB
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Shape matches what you return from /login and /register
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}