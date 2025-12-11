import { Router } from "express";
import Chore from "../models/chore.model.js";

const router = Router();

// ---------------------------------------------------------
// ========== CHORES (MongoDB) ==========
// Base path: /api/chores
// ---------------------------------------------------------

// GET /api/chores
router.get("/", async (_req, res, next) => {
  try {
    const items = await Chore.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// POST /api/chores
router.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const title = (body.title ?? "").trim();
    if (!title) return res.status(400).json({ message: "Title is required" });

    const rawAmount = body.rewardAmount;
    let rewardAmount = 0;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
      const n = Number(rawAmount);
      rewardAmount = Number.isFinite(n) && n >= 0 ? n : 0;
    }

    const rewardCurrency =
      typeof body.rewardCurrency === "string" &&
      body.rewardCurrency.trim().length > 0
        ? body.rewardCurrency.trim().toUpperCase()
        : "USD";

    let assignedTo;
    if (body.assignedTo && typeof body.assignedTo === "object") {
      const name = (body.assignedTo.name ?? "").trim();
      const role = (body.assignedTo.role ?? "").trim();
      if (name || role) assignedTo = { name, role };
    }

    const doc = await Chore.create({
      title,
      notes: body.notes ?? "",
      priority: body.priority ?? "med",
      dueDate: body.dueDate ?? null,

      rewardAmount,
      rewardCurrency,
      assignedTo,

      assignments: Array.isArray(body.assignments) ? body.assignments : [],
      completed: Array.isArray(body.completed) ? body.completed : [],
      active: typeof body.active === "boolean" ? body.active : true,
      assignee: body.assignee ?? "",
      categoryId: body.categoryId ?? null,
    });

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

// PUT /api/chores/:id
router.put("/:id", async (req, res, next) => {
  try {
    const { id: _ignore, _id: _ignore2, ...patch } = req.body || {};

    if (patch.title !== undefined && !String(patch.title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (
      patch.rewardAmount !== undefined &&
      patch.rewardAmount !== null &&
      patch.rewardAmount !== ""
    ) {
      const n = Number(patch.rewardAmount);
      patch.rewardAmount = Number.isFinite(n) && n >= 0 ? n : 0;
    }

    if (patch.rewardCurrency !== undefined && patch.rewardCurrency !== null) {
      const cur = String(patch.rewardCurrency).trim();
      patch.rewardCurrency = cur ? cur.toUpperCase() : "USD";
    }

    if (patch.assignedTo && typeof patch.assignedTo === "object") {
      const name = (patch.assignedTo.name ?? "").trim();
      const role = (patch.assignedTo.role ?? "").trim();
      patch.assignedTo = name || role ? { name, role } : undefined;
    }

    const updated = await Chore.findByIdAndUpdate(
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

// DELETE /api/chores/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const removed = await Chore.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// POST /api/chores/:id/complete
router.post("/:id/complete", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body || {};

    const chore = await Chore.findById(id);
    if (!chore) {
      return res.status(404).json({ message: "Chore not found" });
    }

    chore.completed.push({
      on: new Date(),
      memberId: memberId || undefined,
      paid: false, // NEW
    });

    const saved = await chore.save();
    res.json(saved);
  } catch (e) {
    console.error("Complete chore failed", e);
    next(e);
  }
});

// POST /api/chores/:id/pay
router.post("/:id/pay", async (req, res, next) => {
  try {
    const { id } = req.params;

    const chore = await Chore.findById(id);
    if (!chore) {
      return res.status(404).json({ message: "Chore not found" });
    }

    // Mark all unpaid completions as paid
    chore.completed.forEach((entry) => {
      if (!entry.paid) {
        entry.paid = true;
      }
    });

    const saved = await chore.save();
    res.json(saved);
  } catch (e) {
    console.error("Pay chore failed", e);
    next(e);
  }
});

// POST /api/chores/pay-member
router.post("/pay-member", async (req, res, next) => {
  try {
    const { memberId } = req.body || {};
    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }

    // Find all chores that have unpaid completions for this member
    const chores = await Chore.find({
      "completed.memberId": memberId,
      "completed.paid": { $ne: true },
    });

    for (const chore of chores) {
      chore.completed.forEach((entry) => {
        if (entry.memberId === memberId && !entry.paid) {
          entry.paid = true;
        }
      });
      await chore.save();
    }

    // Return the full updated list so the client can refresh BehaviorSubject
    const all = await Chore.find().sort({ createdAt: -1 });
    res.json(all);
  } catch (e) {
    console.error("pay-member failed", e);
    next(e);
  }
});

export default router;
