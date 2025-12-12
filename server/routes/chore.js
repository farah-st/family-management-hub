import { Router } from "express";
import Chore from "../models/chore.model.js";

const router = Router();

/* ============================================================
   CHORE ROUTER (MongoDB / Express)
   Base URL: /api/chores

   This router powers the entire "Chores" section of my app:
   - List chores
   - Create, update, delete chores
   - Mark chores as completed
   - Mark completions as paid
   - Pay all unpaid completions for a specific family member

   Angular talks to these endpoints through ChoreService.
============================================================ */

/* ------------------------------------------------------------
   GET /api/chores
   Returns a list of all chores, newest first.

   Used by:
   - Chore list page (to display all chores)
------------------------------------------------------------ */
router.get("/", async (_req, res, next) => {
  try {
    const items = await Chore.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

/* ------------------------------------------------------------
   POST /api/chores
   Creates a new chore document in MongoDB.

   Main ideas:
   - Validate that we at least have a title
   - Normalize rewardAmount into a safe number
   - Normalize rewardCurrency (default to "USD")
   - Optional "assignedTo" object with name + role
   - Allow assignments and completed arrays to come from the client

   Used by:
   - The "New Chore" form in Angular
------------------------------------------------------------ */
router.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};

    // Title is required for every chore
    const title = (body.title ?? "").trim();
    if (!title) return res.status(400).json({ message: "Title is required" });

    // Safely parse the reward amount (make sure it's a non-negative number)
    const rawAmount = body.rewardAmount;
    let rewardAmount = 0;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
      const n = Number(rawAmount);
      rewardAmount = Number.isFinite(n) && n >= 0 ? n : 0;
    }

    // Normalize currency: uppercase string, default to USD
    const rewardCurrency =
      typeof body.rewardCurrency === "string" &&
      body.rewardCurrency.trim().length > 0
        ? body.rewardCurrency.trim().toUpperCase()
        : "USD";

    // Optional "assignedTo" (used when a chore is assigned to a person/role)
    let assignedTo;
    if (body.assignedTo && typeof body.assignedTo === "object") {
      const name = (body.assignedTo.name ?? "").trim();
      const role = (body.assignedTo.role ?? "").trim();
      if (name || role) assignedTo = { name, role };
    }

    // Create the actual document in MongoDB
    const doc = await Chore.create({
      title,
      notes: body.notes ?? "",
      priority: body.priority ?? "med",
      dueDate: body.dueDate ?? null,

      rewardAmount,
      rewardCurrency,
      assignedTo,

      // Assignments = planned assignments (who/when)
      assignments: Array.isArray(body.assignments) ? body.assignments : [],
      // Completed = actual completions over time
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

/* ------------------------------------------------------------
   PUT /api/chores/:id
   Partially updates an existing chore.

   Highlights:
   - Prevent changing _id / id fields
   - If title is sent, make sure it's not blank
   - Normalize rewardAmount and rewardCurrency again
   - Clean up assignedTo object

   Used by:
   - "Edit Chore" form in Angular
------------------------------------------------------------ */
router.put("/:id", async (req, res, next) => {
  try {
    // Prevent client from overwriting the Mongo _id fields
    const { id: _ignore, _id: _ignore2, ...patch } = req.body || {};

    // If title is provided in patch, it cannot be empty
    if (patch.title !== undefined && !String(patch.title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Normalize rewardAmount if present
    if (
      patch.rewardAmount !== undefined &&
      patch.rewardAmount !== null &&
      patch.rewardAmount !== ""
    ) {
      const n = Number(patch.rewardAmount);
      patch.rewardAmount = Number.isFinite(n) && n >= 0 ? n : 0;
    }

    // Normalize rewardCurrency if present
    if (patch.rewardCurrency !== undefined && patch.rewardCurrency !== null) {
      const cur = String(patch.rewardCurrency).trim();
      patch.rewardCurrency = cur ? cur.toUpperCase() : "USD";
    }

    // Clean up assignedTo if provided
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

/* ------------------------------------------------------------
   DELETE /api/chores/:id
   Deletes a chore by its ID.

   Used by:
   - "Delete" button in the chore list or detail view
------------------------------------------------------------ */
router.delete("/:id", async (req, res, next) => {
  try {
    const removed = await Chore.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/* ------------------------------------------------------------
   POST /api/chores/:id/complete
   Records a completion entry for a specific chore.

   Each completion entry:
   - on: Date when it was completed
   - memberId: who completed it (optional)
   - paid: whether the reward has been paid yet (starts as false)

   Used by:
   - "Complete" button in the UI for a single chore
------------------------------------------------------------ */
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
      paid: false, // new completion starts unpaid
    });

    const saved = await chore.save();
    res.json(saved);
  } catch (e) {
    console.error("Complete chore failed", e);
    next(e);
  }
});

/* ------------------------------------------------------------
   POST /api/chores/:id/pay
   Marks ALL completion entries for this chore as paid.

   This is a chore-level "mark as paid":
   - Any completed entry with paid === false becomes true.

   Used by:
   - "Mark this chore as paid" action, if you have that in the UI
------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   POST /api/chores/pay-member
   Marks ALL unpaid completion entries for a specific member
   (across ALL chores) as paid.

   This is like "pay out all the chores for Sofia":
   - Find all chores with completed.memberId = memberId && paid != true
   - Flip paid to true for those entries
   - Return the full updated chore list

   Used by:
   - "Pay this member" button in the UI
   - Helps calculate how much each child has earned over time
------------------------------------------------------------ */
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