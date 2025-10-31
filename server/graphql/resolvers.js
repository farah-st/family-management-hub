// ESM module
export const resolvers = {
  Query: {
    recipes: (_p, _a, { collections }) => collections.recipes,
    recipe: (_p, { id }, { collections }) =>
      collections.recipes.find(r => r.id === id) || null,
    grocery: (_p, _a, { collections }) => collections.grocery,
  },
  Mutation: {
    addRecipe: (_p, { input }, { collections, newId }) => {
    // Basic validation before creating the recipe
    if (!input.title?.trim()) {
      throw new Error("Title is required");
    }

    const item = {
      id: newId(),
      title: input.title.trim(),
      description: input.description ?? '',
      imageUrl: input.imageUrl ?? '',
      ingredients: Array.isArray(input.ingredients) ? input.ingredients : [],
    };
    collections.recipes.push(item);
    return item;
  },

    updateRecipe: (_p, { id, patch }, { collections }) => {
      const i = collections.recipes.findIndex(r => r.id === id);
      if (i === -1) throw new Error('Not found');
      collections.recipes[i] = { ...collections.recipes[i], ...patch };
      return collections.recipes[i];
    },
    deleteRecipe: (_p, { id }, { collections }) => {
      const i = collections.recipes.findIndex(r => r.id === id);
      if (i === -1) return false;
      collections.recipes.splice(i, 1);
      return true;
    },

    addGrocery: (_p, { input }, { collections, newId }) => {
      const item = { id: newId(), name: input.name, qty: input.qty ?? '' };
      collections.grocery.push(item);
      return item;
    },
    deleteGrocery: (_p, { id }, { collections }) => {
      const i = collections.grocery.findIndex(g => g.id === id);
      if (i === -1) return false;
      collections.grocery.splice(i, 1);
      return true;
    },
    clearGrocery: (_p, _a, { collections }) => {
      collections.grocery.length = 0;
      return true;
    },
  },
};
export default { resolvers };
