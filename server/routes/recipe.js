import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

import Recipe from "../models/recipe.model.js";

const router = Router();

/* ============================================================
   RECIPE ROUTER (MongoDB + Image Uploads)

   This router manages the Recipe feature of the app:
   - Create, read, update, delete recipes
   - Upload images using Multer
   - Store image references in MongoDB

   Angular communicates with these routes using RecipeService.
============================================================ */

// ------------------------------------------------------------
// File upload configuration
// Multer stores uploaded images in /server/uploads
// ------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");

const multerUpload = multer({
  dest: uploadDir, // where uploaded files are temporarily stored
});

/* ------------------------------------------------------------
   POST /api/recipes/upload
   Uploads a single recipe image using Multer.

   - The client sends FormData with a field named "image".
   - Multer writes the file to /uploads.
   - We return the file URL so Angular can store it in MongoDB.

   IMPORTANT:
   This route must come BEFORE any "/:id" route.
------------------------------------------------------------ */
router.post("/upload", multerUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  // This URL is what the Angular app will store in imageUrl
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

/* ------------------------------------------------------------
   GET /api/recipes
   Returns all recipes in newest-first order.

   Used by:
   - Recipe list screen
------------------------------------------------------------ */
router.get("/", async (_req, res, next) => {
  try {
    const items = await Recipe.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

/* ------------------------------------------------------------
   GET /api/recipes/:id
   Returns a single recipe by ID.

   Used by:
   - Recipe detail page
   - Recipe edit form (loads existing values)
------------------------------------------------------------ */
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Recipe.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

/* ------------------------------------------------------------
   POST /api/recipes
   Creates a new recipe in MongoDB.

   Request body may include:
     - title
     - description
     - imageUrl (from upload route)
     - ingredients: array of { name, amount }

   Used by:
   - Create Recipe form
------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   PUT /api/recipes/:id
   Updates an existing recipe.

   Highlights:
   - Uses $set to only update fields provided in the patch
   - runValidators ensures schema rules apply
   - Returns the updated document

   Used by:
   - Edit Recipe form
------------------------------------------------------------ */
router.put("/:id", async (req, res, next) => {
  try {
    // Prevent clients from modifying the Mongo _id fields
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

/* ------------------------------------------------------------
   DELETE /api/recipes/:id
   Deletes a recipe by ID.

   Used by:
   - Delete button in recipe detail or list view
------------------------------------------------------------ */
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
