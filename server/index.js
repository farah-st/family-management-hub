require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { randomUUID } = require('crypto');
const Recipe = require('./models/recipe.model.js');

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 4000;

const app = express();

// middleware
app.use(cors({
  origin: ['http://localhost:4200'], // loosen to * only if you need to
}));
app.use(express.json());

// health/root
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'family-hub-api' });
});

// ----- Minimal in-memory routes for dev -----
let recipes = [];  // replace with DB later
let grocery = [];  // replace with DB later

// util: simple id
function newId() {
  return randomUUID();
}

// Recipes (REST) — Mongo-backed
app.get('/api/recipes', async (_req, res, next) => {
  try {
    // ⬅️ remove .lean() so Mongoose applies the toJSON id mapping
    const items = await Recipe.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { next(e); }
});

app.get('/api/recipes/:id', async (req, res, next) => {
  try {
    // ⬅️ remove .lean() here too
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
    res.status(201).json(created); // includes { id: "...", ... } via toJSON
  } catch (e) { next(e); }
});

app.put('/api/recipes/:id', async (req, res, next) => {
  try {
    const { id: _ignore, ...patch } = req.body || {};
    // ⬅️ remove .lean() here too
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


// Grocery (REST)
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

// 404 + error handlers
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

// Start server (with optional Mongo) + GraphQL
(async () => {
  try {
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB connected');
    } else {
      console.warn('⚠️  MONGO_URI not set; continuing with in-memory data only.');
    }
  } catch (err) {
    console.error('Mongo connect failed:', err.message);
    console.warn('Continuing to serve in-memory routes…');
  }

  // --- GraphQL (ESM packages) ---
  const { ApolloServer } = await import('@apollo/server');
  const { expressMiddleware } = await import('@as-integrations/express5');
  const { default: gqlSchema } = await import('./graphql/schema.mjs').catch(() => ({}));
  const { default: gqlResolvers } = await import('./graphql/resolvers.mjs').catch(() => ({}));

  // If you export named (typeDefs/resolvers) instead of default, support that too:
  const modSchema = gqlSchema?.typeDefs ? gqlSchema.typeDefs : gqlSchema;
  const { typeDefs: namedTypeDefs } = await import('./graphql/schema.mjs').catch(() => ({}));
  const typeDefs = modSchema || namedTypeDefs;

  const modResolvers = gqlResolvers?.resolvers ? gqlResolvers.resolvers : gqlResolvers;
  const { resolvers: namedResolvers } = await import('./graphql/resolvers.js').catch(() => ({}));
  const resolvers = modResolvers || namedResolvers;

  if (!typeDefs || !resolvers) {
    console.warn('⚠️  GraphQL schema/resolvers not found. Skipping /graphql route.');
  } else {
    // Optional: local landing page (GraphQL Sandbox) in dev
    let plugins = [];
    if (process.env.NODE_ENV !== 'production') {
      const { ApolloServerPluginLandingPageLocalDefault } = await import('@apollo/server/plugin/landingPage/default');
      plugins = [ApolloServerPluginLandingPageLocalDefault()];
    }

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      plugins,
    });
    await server.start();

    // NOTE: Apollo recommends bodyParser.json() here
    app.use(
      '/graphql',
      cors({ origin: ['http://localhost:4200'] }),
      bodyParser.json(),
      expressMiddleware(server, {
        context: async ({ req }) => ({
          auth: req.headers.authorization ?? null,
          collections: { recipes, grocery }, // pass in-memory stores to resolvers
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
