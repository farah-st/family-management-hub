import Recipe from "../models/recipe.model.js";
import Chore from "../models/chore.model.js";

// NOTE:
// - Recipes use the Mongo-backed Recipe model.
// - Chores use the Mongo-backed Chore model.
// - Grocery still uses the in-memory `collections.grocery` from context.

export const resolvers = {
  Query: {
    // ---------- RECIPE QUERIES ----------
    recipes: async () => {
      const docs = await Recipe.find().sort({ createdAt: -1 });
      return docs;
    },

    recipe: async (_parent, { id }) => {
      const doc = await Recipe.findById(id);
      return doc;
    },

    // ---------- GROCERY QUERIES (in-memory) ----------
    grocery: (_parent, _args, { collections }) => collections.grocery,

    // ---------- CHORE QUERIES ----------
    chores: async () => {
      const docs = await Chore.find().sort({ createdAt: -1 });
      return docs;
    },

    chore: async (_parent, { id }) => {
      const doc = await Chore.findById(id);
      return doc;
    },
  },

  Mutation: {
    // ---------- RECIPE MUTATIONS (Mongo) ----------

    addRecipe: async (_parent, { input }) => {
      if (!input.title?.trim()) {
        throw new Error("Title is required");
      }

      const doc = await Recipe.create({
        title: input.title.trim(),
        description: input.description ?? "",
        imageUrl: input.imageUrl ?? "",
        ingredients: Array.isArray(input.ingredients)
          ? input.ingredients
          : [],
      });

      return doc;
    },

    updateRecipe: async (_parent, { id, patch }) => {
      const doc = await Recipe.findById(id);
      if (!doc) {
        throw new Error("Not found");
      }

      if (patch.title !== undefined) {
        doc.title = patch.title;
      }
      if (patch.description !== undefined) {
        doc.description = patch.description;
      }
      if (patch.imageUrl !== undefined) {
        doc.imageUrl = patch.imageUrl;
      }
      if (patch.ingredients !== undefined) {
        doc.ingredients = Array.isArray(patch.ingredients)
          ? patch.ingredients
          : [];
      }

      await doc.save();
      return doc;
    },

    deleteRecipe: async (_parent, { id }) => {
      const deleted = await Recipe.findByIdAndDelete(id);
      return !!deleted;
    },

    // ---------- GROCERY MUTATIONS (in-memory) ----------

    addGrocery: (_parent, { input }, { collections, newId }) => {
      const item = {
        id: newId(),
        name: input.name,
        qty: input.qty ?? "",
      };
      collections.grocery.push(item);
      return item;
    },

    deleteGrocery: (_parent, { id }, { collections }) => {
      const i = collections.grocery.findIndex((g) => g.id === id);
      if (i === -1) return false;
      collections.grocery.splice(i, 1);
      return true;
    },

    clearGrocery: (_parent, _args, { collections }) => {
      collections.grocery.length = 0;
      return true;
    },

    // ---------- CHORE MUTATIONS (Mongo) ----------

    addChore: async (_parent, { input }) => {
      const title = (input.title ?? "").trim();
      if (!title) {
        throw new Error("Title is required");
      }

      // Reward amount coercion (like REST)
      let rewardAmount = 0;
      const rawAmount = input.rewardAmount;
      if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
        const n = Number(rawAmount);
        rewardAmount = Number.isFinite(n) && n >= 0 ? n : 0;
      }

      // Reward currency normalization
      const rewardCurrency =
        typeof input.rewardCurrency === "string" &&
        input.rewardCurrency.trim().length > 0
          ? input.rewardCurrency.trim().toUpperCase()
          : "USD";

      // assignedTo normalization
      let assignedTo;
      if (input.assignedTo) {
        const name = (input.assignedTo.name ?? "").trim();
        const role = (input.assignedTo.role ?? "").trim();
        if (name || role) {
          assignedTo = { name, role };
        }
      }

      const doc = await Chore.create({
        title,
        notes: input.notes ?? "",
        priority: input.priority ?? "med",
        dueDate: input.dueDate ?? null,

        rewardAmount,
        rewardCurrency,
        assignedTo,

        assignments: Array.isArray(input.assignments) ? input.assignments : [],
        completed: Array.isArray(input.completed) ? input.completed : [],
        active:
          typeof input.active === "boolean" ? input.active : true,
        assignee: input.assignee ?? "",
        categoryId: input.categoryId ?? null,
      });

      return doc;
    },

    updateChore: async (_parent, { id, patch }) => {
      const body = { ...patch };

      // Match REST validation:
      if (body.title !== undefined && !String(body.title).trim()) {
        throw new Error("Title is required");
      }

      // Reward amount coercion (like REST)
      if (
        body.rewardAmount !== undefined &&
        body.rewardAmount !== null &&
        body.rewardAmount !== ""
      ) {
        const n = Number(body.rewardAmount);
        body.rewardAmount = Number.isFinite(n) && n >= 0 ? n : 0;
      }

      // Reward currency normalization
      if (body.rewardCurrency !== undefined && body.rewardCurrency !== null) {
        const cur = String(body.rewardCurrency).trim();
        body.rewardCurrency = cur ? cur.toUpperCase() : "USD";
      }

      // assignedTo normalization
      if (body.assignedTo && typeof body.assignedTo === "object") {
        const name = (body.assignedTo.name ?? "").trim();
        const role = (body.assignedTo.role ?? "").trim();
        body.assignedTo = name || role ? { name, role } : undefined;
      }

      const updated = await Chore.findByIdAndUpdate(
        id,
        { $set: body },
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new Error("Not found");
      }

      return updated;
    },

    deleteChore: async (_parent, { id }) => {
      const removed = await Chore.findByIdAndDelete(id);
      return !!removed;
    },

    completeChore: async (_parent, { id, memberId }) => {
      const chore = await Chore.findById(id);
      if (!chore) {
        throw new Error("Chore not found");
      }

      chore.completed.push({
        on: new Date(),
        memberId: memberId || undefined,
        paid: false,
      });

      const saved = await chore.save();
      return saved;
    },

    payChore: async (_parent, { id }) => {
      const chore = await Chore.findById(id);
      if (!chore) {
        throw new Error("Chore not found");
      }

      chore.completed.forEach((entry) => {
        if (!entry.paid) {
          entry.paid = true;
        }
      });

      const saved = await chore.save();
      return saved;
    },

    payMember: async (_parent, { memberId }) => {
      if (!memberId) {
        throw new Error("memberId is required");
      }

      // Find chores with unpaid completions for this member
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

      // Return the full updated list (like REST)
      const all = await Chore.find().sort({ createdAt: -1 });
      return all;
    },
  },
};
