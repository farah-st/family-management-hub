import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

// Routers
import authRouter from "./routes/auth.js";
import recipeRouter from "./routes/recipe.js";
import choreRouter from "./routes/chore.js";
import createGroceryRouter from "./routes/grocery.js";

// ---------- GraphQL imports ----------
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
// use your existing ESM schema + resolvers
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";

// ---------- ESM __dirname shim ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Env + constants ----------
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 4000;

// Allowed CORS origins
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:4200"];

const app = express();

// ---------- File Upload (static serving) ----------
const uploadDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadDir));

// ---------- Middleware ----------
app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());

// ---------- Health Check ----------
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "family-hub-api" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "family-hub-api" });
});

// ---------- In-memory Stores ----------
let grocery = [];
let categories = [
  { id: randomUUID(), name: "House", color: "#94a3b8" },
  { id: randomUUID(), name: "Kitchen", color: "#86efac" },
  { id: randomUUID(), name: "Yard", color: "#60a5fa" },
];

// In-memory recipes collection for GraphQL (separate from Mongo recipes)
let recipes = [];

function newId() {
  return randomUUID();
}

// ---------------------------------------------------------
// ========== ROUTERS (Recipes, Chores, Grocery, Auth) =====
// ---------------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/recipes", recipeRouter);
app.use("/api/chores", choreRouter);
// Grocery router gets the shared in-memory array + id helper
app.use("/api/grocery", createGroceryRouter({ grocery, newId }));

// ---------------------------------------------------------
// ========== CATEGORIES (in-memory) ==========
// ---------------------------------------------------------
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

  categories[idx] = { ...categories[idx], ...body };
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

// ---------------------------------------------------------
// ========== TRAVEL ARROW EXTERNAL API PROXY ==========
// ---------------------------------------------------------
app.get("/api/travelarrow/accounts/:accountId", async (req, res) => {
  const { accountId } = req.params;

  try {
    const url = `https://api.travelarrow.io/accounts/${accountId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("TravelArrow responded with status", response.status);
      return res
        .status(response.status)
        .json({ message: "TravelArrow error", status: response.status });
    }

    res.json(await response.json());
  } catch (err) {
    console.error("TravelArrow proxy error:", err);
    res.status(500).json({ message: "Failed to contact TravelArrow" });
  }
});

// ---------------------------------------------------------
// ========== MONGO + GRAPHQL (TOP-LEVEL AWAIT) ==========
// ---------------------------------------------------------

// 1) Connect to Mongo (if URI present)
try {
  if (MONGO_URI) {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } else {
    console.warn("⚠️  MONGO_URI not set; running with in-memory data.");
  }
} catch (err) {
  console.error("Mongo connection failed:", err.message);
}

// 2) Set up Apollo GraphQL server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

// 3) Mount /graphql BEFORE error handlers
app.use(
  "/graphql",
  cors({ origin: allowedOrigins }),
  bodyParser.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({
      auth: req.headers.authorization ?? null,
      collections: {
        recipes,
        grocery,
      },
      newId,
    }),
  })
);

console.log("✅ GraphQL ready at /graphql");

// ---------------------------------------------------------
// ========== ERROR HANDLERS (MUST BE LAST) ==========
// ---------------------------------------------------------
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Server error" });
});

// ---------------------------------------------------------
// ========== START SERVER ==========
// ---------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 API listening on http://localhost:${PORT}`);
});