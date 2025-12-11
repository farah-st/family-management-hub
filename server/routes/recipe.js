import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

import Recipe from "../models/recipe.model.js";

const router = Router();

// ---------- Upload config (uses ../uploads) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");

const multerUpload = multer({
  dest: uploadDir,
});

// ---------------------------------------------------------
// ========== RECIPES (MongoDB) ==========
// Base path: /api/recipes
// ---------------------------------------------------------

// Image upload – must be before `/:id`
router.post("/upload", multerUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// GET /api/recipes
router.get("/", async (_req, res, next) => {
  try {
    const items = await Recipe.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// GET /api/recipes/:id
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Recipe.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// POST /api/recipes
router.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const created = await Recipe.create({
      title: body.title ?? "",
      description: body.description ?? "",
      imageUrl: body.imageUrl ?? "",
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// PUT /api/recipes/:id
router.put("/:id", async (req, res, next) => {
  try {
    const { id: _ignore, _id: _ignore2, ...patch } = req.body || {};
    const updated = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/recipes/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const removed = await Recipe.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
