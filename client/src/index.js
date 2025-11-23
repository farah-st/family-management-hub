import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import recipesRouter from "./routes/recipes.js";
import groceryRouter from "./routes/grocery.js";

// -------------------------------------
// Path utilities for ES modules
// -------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------
// App setup
// -------------------------------------
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded images/files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------------------------
// Health check
// -------------------------------------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// -------------------------------------
// API routes
// -------------------------------------
app.use("/api/recipes", recipesRouter);
app.use("/api/grocery", groceryRouter);

// -------------------------------------
// 404 - Not found
// -------------------------------------
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// -------------------------------------
// Error handler
// -------------------------------------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message: "Server error",
    detail: err.message,
  });
});

// -------------------------------------
// Server + Database start
// -------------------------------------
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("Mongo connection error:", e);
    process.exit(1);
  });

