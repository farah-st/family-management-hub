import { Router } from "express";

// We export a factory so we can inject the shared
// grocery array + newId helper from index.js.
export default function createGroceryRouter({ grocery, newId }) {
  const router = Router();

  // -------------------------------------------------------
  // ========== GROCERY (in-memory) ==========
  // Base path: /api/grocery
  // -------------------------------------------------------

  // GET /api/grocery
  router.get("/", (_req, res) => {
    res.json(grocery);
  });

  // POST /api/grocery
  router.post("/", (req, res) => {
    const body = req.body ?? {};
    const item = {
      id: newId(),
      name: body.name ?? "",
      qty: body.qty ?? "",
    };
    grocery.push(item);
    res.status(201).json(item);
  });

  // DELETE /api/grocery/:id
  router.delete("/:id", (req, res) => {
    const idx = grocery.findIndex((g) => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Not found" });
    grocery.splice(idx, 1);
    res.status(204).end();
  });

  // DELETE /api/grocery
  router.delete("/", (_req, res) => {
    grocery.length = 0; // clear in-place so references stay valid
    res.status(204).end();
  });

  return router;
}
