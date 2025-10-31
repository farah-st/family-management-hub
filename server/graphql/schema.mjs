// ESM module
export const typeDefs = `#graphql
  type Ingredient { name: String!, qty: String }
  type Recipe {
    id: ID!
    title: String!
    description: String
    imageUrl: String
    ingredients: [Ingredient!]!
  }

  type GroceryItem {
    id: ID!
    name: String!
    qty: String
  }

  type Query {
    recipes: [Recipe!]!
    recipe(id: ID!): Recipe
    grocery: [GroceryItem!]!
  }

  input IngredientInput { name: String!, qty: String }
  input RecipeInput {
    title: String!
    description: String
    imageUrl: String
    ingredients: [IngredientInput!]!
  }
  input RecipePatch {
    title: String
    description: String
    imageUrl: String
    ingredients: [IngredientInput!]
  }

  input GroceryInput { name: String!, qty: String }

  type Mutation {
    addRecipe(input: RecipeInput!): Recipe!
    updateRecipe(id: ID!, patch: RecipePatch!): Recipe!
    deleteRecipe(id: ID!): Boolean!

    addGrocery(input: GroceryInput!): GroceryItem!
    deleteGrocery(id: ID!): Boolean!
    clearGrocery: Boolean!
  }
`;
export default { typeDefs };
