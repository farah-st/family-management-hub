require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { randomUUID } = require('crypto');

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

// Recipes (REST)
app.get('/api/recipes', (_req, res) => {
  res.json(recipes);
});

app.post('/api/recipes', (req, res) => {
  const body = req.body ?? {};
  const item = {
    id: newId(),
    title: body.title ?? '',
    description: body.description ?? '',
    imageUrl: body.imageUrl ?? '',
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
  };
  recipes.push(item);
  res.status(201).json(item);
});

app.put('/api/recipes/:id', (req, res) => {
  const idx = recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });

  const { id: _ignore, ...rest } = req.body || {};
  recipes[idx] = { ...recipes[idx], ...rest }; // keep original id
  res.json(recipes[idx]);
});

app.delete('/api/recipes/:id', (req, res) => {
  const idx = recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  recipes.splice(idx, 1);
  res.status(204).end();
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
