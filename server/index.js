require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { randomUUID } = require('crypto');
const Recipe = require('./models/recipe.model.js');
const Chore = require('./models/chore.model.js');

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 4000;

const app = express();

// ---------- Middleware ----------
app.use(cors({
  origin: ['http://localhost:4200'], // loosen to * only if needed
}));
app.use(express.json());

// ---------- Health / Root ----------
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'family-hub-api' });
});

// ---------- In-memory stores for fast dev (replace with DB later) ----------
let grocery = [];
let categories = [
  // seed a couple of useful defaults
  { id: randomUUID(), name: 'House', color: '#94a3b8' },
  { id: randomUUID(), name: 'Kitchen', color: '#86efac' },
  { id: randomUUID(), name: 'Yard', color: '#60a5fa' },
];

// Utility: new id
function newId() {
  return randomUUID();
}

// ========== RECIPES (Mongo-backed) ==========
app.get('/api/recipes', async (_req, res, next) => {
  try {
    // Keep as Mongoose docs so toJSON gives `id`
    const items = await Recipe.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { next(e); }
});

app.get('/api/recipes/:id', async (req, res, next) => {
  try {
    const item = await Recipe.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (e) { next(e); }
});

app.post('/api/recipes', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const created = await Recipe.create({
      title: body.title ?? '',
      description: body.description ?? '',
      imageUrl: body.imageUrl ?? '',
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

app.put('/api/recipes/:id', async (req, res, next) => {
  try {
    const { id: _ignore, _id: _ignore2, ...patch } = req.body || {};
    const updated = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

app.delete('/api/recipes/:id', async (req, res, next) => {
  try {
    const removed = await Recipe.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ========== GROCERY (in-memory) ==========
app.get('/api/grocery', (_req, res) => {
  res.json(grocery);
});

app.post('/api/grocery', (req, res) => {
  const body = req.body ?? {};
  const item = { id: newId(), name: body.name ?? '', qty: body.qty ?? '' };
  grocery.push(item);
  res.status(201).json(item);
});

app.delete('/api/grocery/:id', (req, res) => {
  const idx = grocery.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  grocery.splice(idx, 1);
  res.status(204).end();
});

app.delete('/api/grocery', (_req, res) => {
  grocery = [];
  res.status(204).end();
});

// ========== CHORES (Mongo-backed) ==========
app.get('/api/chores', async (_req, res, next) => {
  try {
    const items = await Chore.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

app.post('/api/chores', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const title = (body.title ?? '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const doc = await Chore.create({
      title,
      notes: body.notes ?? '',
      priority: body.priority ?? 'med',
      dueDate: body.dueDate ?? null, // string will be cast to Date if present

      assignments: Array.isArray(body.assignments) ? body.assignments : [],
      completed: Array.isArray(body.completed) ? body.completed : [],
      active: typeof body.active === 'boolean' ? body.active : true,

      // optional/legacy
      assignee: body.assignee ?? '',
      categoryId: body.categoryId ?? null,
    });

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

app.put('/api/chores/:id', async (req, res, next) => {
  try {
    const { id: _ignore, _id: _ignore2, ...patch } = req.body || {};

    if (patch.title !== undefined && !String(patch.title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const updated = await Chore.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// matches your service.complete(id)
app.post('/api/chores/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body ?? {};

    const chore = await Chore.findById(id);
    if (!chore) {
      return res.status(404).json({ message: 'Not found' });
    }

    chore.completed.push({
      on: new Date(),
      memberId: memberId || undefined,
    });

    await chore.save();
    res.json(chore);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/chores/:id', async (req, res, next) => {
  try {
    const removed = await Chore.findByIdAndDelete(req.params.id);
    if (!removed) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ========== CATEGORIES (in-memory) ==========
// Shape: { id, name, color }
app.get('/api/categories', (_req, res) => {
  const items = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  res.json(items);
});

app.post('/api/categories', (req, res) => {
  const body = req.body ?? {};
  const name = (body.name ?? '').trim();
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const item = {
    id: newId(),
    name,
    color: body.color ?? '#94a3b8', // slate-ish default
  };
  categories.push(item);
  res.status(201).json(item);
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });

  const body = req.body ?? {};
  if (body.name !== undefined && !String(body.name).trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  categories[idx] = {
    ...categories[idx],
    ...body,
  };
  res.json(categories[idx]);
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const before = categories.length;
  categories = categories.filter(c => c.id !== id);
  if (categories.length === before) return res.status(404).json({ message: 'Not found' });
  res.status(204).end();
});

// ========== EXTERNAL API PROXY: TravelArrow ==========
// Example request from Angular:
//   GET /api/travelarrow/accounts/66e78a25c90855c29fbdf735
//
// This avoids CORS by having the server (not the browser) call api.travelarrow.io.
app.get('/api/travelarrow/accounts/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    const url = `https://api.travelarrow.io/accounts/${accountId}`;

    // Node 18+ has global fetch. If you get "fetch is not defined",
    // run: npm install node-fetch
    // and at the top of the file add:
    //   const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

    const response = await fetch(url, {
      // If the API needs auth, uncomment and configure:
      // headers: { 'Authorization': `Bearer ${process.env.TRAVELARROW_TOKEN}` }
    });

    if (!response.ok) {
      console.error('TravelArrow responded with status', response.status);
      return res
        .status(response.status)
        .json({ message: 'TravelArrow error', status: response.status });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('TravelArrow proxy error:', err);
    res.status(500).json({ message: 'Failed to contact TravelArrow' });
  }
});

// ---------- 404 + Error handlers ----------
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

// ---------- Start server (connect Mongo for recipes) + GraphQL ----------
(async () => {
  try {
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB connected');
    } else {
      console.warn('⚠️  MONGO_URI not set; continuing with in-memory data for non-recipe resources.');
    }
  } catch (err) {
    console.error('Mongo connect failed:', err.message);
    console.warn('Continuing to serve in-memory routes…');
  }

  // --- GraphQL (optional; uses in-memory grocery/recipes data passed to context) ---
  const { ApolloServer } = await import('@apollo/server');
  const { expressMiddleware } = await import('@as-integrations/express5');
  const { default: gqlSchema } = await import('./graphql/schema.mjs').catch(() => ({}));
  const { default: gqlResolvers } = await import('./graphql/resolvers.mjs').catch(() => ({}));

  const modSchema = gqlSchema?.typeDefs ? gqlSchema.typeDefs : gqlSchema;
  const { typeDefs: namedTypeDefs } = await import('./graphql/schema.mjs').catch(() => ({}));
  const typeDefs = modSchema || namedTypeDefs;

  const modResolvers = gqlResolvers?.resolvers ? gqlResolvers.resolvers : gqlResolvers;
  const { resolvers: namedResolvers } = await import('./graphql/resolvers.js').catch(() => ({}));
  const resolvers = modResolvers || namedResolvers;

  if (!typeDefs || !resolvers) {
    console.warn('⚠️  GraphQL schema/resolvers not found. Skipping /graphql route.');
  } else {
    let plugins = [];
    if (process.env.NODE_ENV !== 'production') {
      const { ApolloServerPluginLandingPageLocalDefault } = await import('@apollo/server/plugin/landingPage/default');
      plugins = [ApolloServerPluginLandingPageLocalDefault()];
    }

    const server = new ApolloServer({ typeDefs, resolvers, plugins });
    await server.start();

    app.use(
      '/graphql',
      cors({ origin: ['http://localhost:4200'] }),
      bodyParser.json(),
      expressMiddleware(server, {
        context: async ({ req }) => ({
          auth: req.headers.authorization ?? null,
          collections: { recipes: [], grocery }, // you can wire chores/categories here if your schema uses them
          newId,
        }),
      })
    );

    console.log('✅ GraphQL ready at /graphql');
  }

  app.listen(PORT, () =>
    console.log(`API listening on http://localhost:${PORT}`)
  );
})();
