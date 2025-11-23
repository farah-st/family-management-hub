import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { Recipe } from "../models/Recipe.js";

const router = Router();

/* ========================================
   Path utilities & upload directory
   ======================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");

/* ========================================
   Multer configuration (image uploads)
   ======================================== */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Only accept images
const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image uploads are allowed"));
  }
};

const upload = multer({ storage, fileFilter });

/* ========================================
   CRUD routes for /api/recipes
   ======================================== */

// GET /api/recipes - list all recipes
router.get("/", async (_req, res, next) => {
  try {
    const items = await Recipe.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// GET /api/recipes/:id - get single recipe
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await Recipe.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// POST /api/recipes - create recipe
router.post("/", async (req, res, next) => {
  try {
    const doc = await Recipe.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

// PUT /api/recipes/:id - update recipe
router.put("/:id", async (req, res, next) => {
  try {
    const doc = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/recipes/:id - delete recipe
router.delete("/:id", async (req, res, next) => {
  try {
    const doc = await Recipe.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/* ========================================
   Image upload route
   ======================================== */
// POST /api/recipes/upload - upload a recipe image, returns { url }
router.post("/upload", upload.single("image"), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // This matches the static path we set in index.js: app.use("/uploads", ...)
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  } catch (e) {
    next(e);
  }
});

export default router;
