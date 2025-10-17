const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Root route
app.get("/", (_req, res) => {
  res.send("Family Management Hub API is running. Try /api/health");
});

// Health check route
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// put before app.listen
app.get('/favicon.ico', (_req, res) => res.status(204).end());

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));