import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

import Recipe from "./models/recipe.model.js";
import Chore from "./models/chore.model.js";

// ---------- ESM __dirname shim ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Env + constants ----------
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 4000;

// Allowed origins for CORS: comma-separated list in env, or default to localhost
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:4200"];

const app = express();

// ---------- File Upload config ----------
const uploadDir = path.join(__dirname, "uploads");

const multerUpload = multer({
  dest: uploadDir, // files go into /server/uploads
});

// Serve uploaded files statically: http://<server>/uploads/<filename>
app.use("/uploads", express.static(uploadDir));

// ---------- Middleware ----------
app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());

// ---------- Health / Root ----------
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "family-hub-api" });
});

// ---------- In-memory stores for fast dev ----------
let grocery = [];
let categories = [
  { id: randomUUID(), name: "House", color: "#94a3b8" },
  { id: randomUUID(), name: "Kitchen", color: "#86efac" },
  { id: randomUUID(), name: "Yard", color: "#60a5fa" },
];

function newId() {
  return randomUUID();
}

// ========== RECIPES (Mongo-backed) ==========
app.get("/api/recipes", async (_req, res, next) => {
  try {
    const items = await Recipe.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

app.get("/api/recipes/:id", async (req, res, next) => {
  try {
    const item = await Recipe.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

app.post("/api/recipes", async (req, res, next) => {
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

app.put("/api/recipes/:id", async (req, res, next) => {
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

app.delete("/api/recipes/:id", async (req, res, next) => {
  try {
    const removed = await Recipe.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Image upload route for recipes
app.post("/api/recipes/upload", multerUpload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// ========== GROCERY (in-memory) ==========
app.get("/api/grocery", (_req, res) => {
  res.json(grocery);
});

app.post("/api/grocery", (req, res) => {
  const body = req.body ?? {};
  const item = { id: newId(), name: body.name ?? "", qty: body.qty ?? "" };
  grocery.push(item);
  res.status(201).json(item);
});

app.delete("/api/grocery/:id", (req, res) => {
  const idx = grocery.findIndex((g) => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });
  grocery.splice(idx, 1);
  res.status(204).end();
});

app.delete("/api/grocery", (_req, res) => {
  grocery = [];
  res.status(204).end();
});

// ========== CHORES (Mongo-backed) ==========
// ========== CHORES (Mongo-backed) ==========
app.get("/api/chores", async (_req, res, next) => {
  try {
    const items = await Chore.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

app.post("/api/chores", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const title = (body.title ?? "").trim();
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // --- Coerce rewardAmount from string/number to a proper Number ---
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

    // assignedTo (optional)
    let assignedTo;
    if (body.assignedTo && typeof body.assignedTo === "object") {
      const name = (body.assignedTo.name ?? "").trim();
      const role = (body.assignedTo.role ?? "").trim();
      if (name || role) {
        assignedTo = { name, role };
      }
    }

    const doc = await Chore.create({
      title,
      notes: body.notes ?? "",
      priority: body.priority ?? "med",
      dueDate: body.dueDate ?? null,

      // Reward + assignee info
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

app.put("/api/chores/:id", async (req, res, next) => {
  try {
    const { id: _ignore, _id: _ignore2, ...patch } = req.body || {};

    if (patch.title !== undefined && !String(patch.title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    // --- Coerce rewardAmount on update as well ---
    if (
      patch.rewardAmount !== undefined &&
      patch.rewardAmount !== null &&
      patch.rewardAmount !== ""
    ) {
      const n = Number(patch.rewardAmount);
      patch.rewardAmount = Number.isFinite(n) && n >= 0 ? n : 0;
    }

    // Normalize rewardCurrency
    if (patch.rewardCurrency !== undefined && patch.rewardCurrency !== null) {
      const cur = String(patch.rewardCurrency).trim();
      patch.rewardCurrency = cur ? cur.toUpperCase() : "USD";
    }

    // Normalize assignedTo
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

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ========== CATEGORIES (in-memory) ==========
app.get("/api/categories", (_req, res) => {
  const items = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  res.json(items);
});

app.post("/api/categories", (req, res) => {
  const body = req.body ?? {};
  const name = (body.name ?? "").trim();
  if (!name) return res.status(400).json({ message: "Name is required" });

  const item = {
    id: newId(),
    name,
    color: body.color ?? "#94a3b8",
  };
  categories.push(item);
  res.status(201).json(item);
});

app.put("/api/categories/:id", (req, res) => {
  const { id } = req.params;
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });

  const body = req.body ?? {};
  if (body.name !== undefined && !String(body.name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }

  categories[idx] = {
    ...categories[idx],
    ...body,
  };
  res.json(categories[idx]);
});

app.delete("/api/categories/:id", (req, res) => {
  const { id } = req.params;
  const before = categories.length;
  categories = categories.filter((c) => c.id !== id);
  if (categories.length === before)
    return res.status(404).json({ message: "Not found" });
  res.status(204).end();
});

// ========== EXTERNAL API PROXY: TravelArrow ==========
app.get("/api/travelarrow/accounts/:accountId", async (req, res) => {
  const { accountId } = req.params;

  try {
    const url = `https://api.travelarrow.io/accounts/${accountId}`;

    // On modern Node (18+), fetch is global.
    const response = await fetch(url);

    if (!response.ok) {
      console.error("TravelArrow responded with status", response.status);
      return res
        .status(response.status)
        .json({ message: "TravelArrow error", status: response.status });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("TravelArrow proxy error:", err);
    res.status(500).json({ message: "Failed to contact TravelArrow" });
  }
});

// ---------- 404 + Error handlers ----------
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

// ---------- Start server (connect Mongo + GraphQL) ----------
(async () => {
  try {
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ MongoDB connected");
    } else {
      console.warn(
        "⚠️  MONGO_URI not set; continuing with in-memory data for non-recipe resources."
      );
    }
  } catch (err) {
    console.error("Mongo connect failed:", err.message);
    console.warn("Continuing to serve in-memory routes…");
  }

  // --- GraphQL setup (optional) ---
  const { ApolloServer } = await import("@apollo/server");
  const { expressMiddleware } = await import("@as-integrations/express5");
  const { default: gqlSchema } = await import("./graphql/schema.mjs").catch(
    () => ({})
  );
  const { default: gqlResolvers } = await import(
    "./graphql/resolvers.mjs"
  ).catch(() => ({}));

  const modSchema = gqlSchema?.typeDefs ? gqlSchema.typeDefs : gqlSchema;
  const { typeDefs: namedTypeDefs } = await import(
    "./graphql/schema.mjs"
  ).catch(() => ({}));
  const typeDefs = modSchema || namedTypeDefs;

  const modResolvers = gqlResolvers?.resolvers
    ? gqlResolvers.resolvers
    : gqlResolvers;
  const { resolvers: namedResolvers } = await import(
    "./graphql/resolvers.js"
  ).catch(() => ({}));
  const resolvers = modResolvers || namedResolvers;

  if (!typeDefs || !resolvers) {
    console.warn("⚠️  GraphQL schema/resolvers not found. Skipping /graphql route.");
  } else {
    let plugins = [];
    if (process.env.NODE_ENV !== "production") {
      const { ApolloServerPluginLandingPageLocalDefault } = await import(
        "@apollo/server/plugin/landingPage/default"
      );
      plugins = [ApolloServerPluginLandingPageLocalDefault()];
    }

    const server = new ApolloServer({ typeDefs, resolvers, plugins });
    await server.start();

    app.use(
      "/graphql",
      cors({ origin: allowedOrigins }),
      bodyParser.json(),
      expressMiddleware(server, {
        context: async ({ req }) => ({
          auth: req.headers.authorization ?? null,
          collections: { recipes: [], grocery },
          newId,
        }),
      })
    );

    console.log("✅ GraphQL ready at /graphql");
  }

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
})();
