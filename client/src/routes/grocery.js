import { Router } from "express";
import { GroceryItem } from "../models/GroceryItem.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const items = await GroceryItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const doc = await GroceryItem.create(req.body);
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const doc = await GroceryItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const doc = await GroceryItem.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.delete("/", async (_req, res, next) => {
  try {
    await GroceryItem.deleteMany({});
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
