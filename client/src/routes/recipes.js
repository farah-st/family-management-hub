import { Router } from "express";
import { Recipe } from "../models/Recipe.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const items = await Recipe.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const doc = await Recipe.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const doc = await Recipe.create(req.body);
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const doc = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const doc = await Recipe.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
