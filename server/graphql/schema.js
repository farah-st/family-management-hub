export const typeDefs = `#graphql
  """Basic ingredient used in recipes"""
  type Ingredient {
    name: String!
    qty: String
  }

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

  # =========================
  # CHORE TYPES
  # =========================

  type ChoreRecurrence {
    freq: String
    byDay: [Int!]
    interval: Int
  }

  type ChoreAssignment {
    memberId: String!
    dueDate: String
    recurrence: ChoreRecurrence
    points: Int
  }

  type ChoreCompletion {
    on: String!
    memberId: String
    paid: Boolean!
  }

  type ChoreAssignedTo {
    name: String
    role: String
  }

  type Chore {
    id: ID!
    title: String!
    notes: String
    priority: String
    dueDate: String

    rewardAmount: Float!
    rewardCurrency: String!

    assignments: [ChoreAssignment!]!
    completed: [ChoreCompletion!]!
    active: Boolean!

    assignedTo: ChoreAssignedTo
    assignee: String
    categoryId: String

    createdAt: String
    updatedAt: String
  }

  # =========================
  # ROOT QUERY
  # =========================

  type Query {
    recipes: [Recipe!]!
    recipe(id: ID!): Recipe
    grocery: [GroceryItem!]!

    chores: [Chore!]!
    chore(id: ID!): Chore
  }

  # =========================
  # INPUT TYPES
  # =========================

  input IngredientInput {
    name: String!
    qty: String
  }

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

  input GroceryInput {
    name: String!
    qty: String
  }

  input ChoreRecurrenceInput {
    freq: String
    byDay: [Int!]
    interval: Int
  }

  input ChoreAssignmentInput {
    memberId: String!
    dueDate: String
    recurrence: ChoreRecurrenceInput
    points: Int
  }

  input ChoreAssignedToInput {
    name: String
    role: String
  }

  input ChoreInput {
    title: String!
    notes: String
    priority: String
    dueDate: String

    rewardAmount: Float
    rewardCurrency: String

    assignments: [ChoreAssignmentInput!]
    completed: [ChoreCompletionInput!]
    active: Boolean

    assignedTo: ChoreAssignedToInput
    assignee: String
    categoryId: String
  }

  input ChorePatch {
    title: String
    notes: String
    priority: String
    dueDate: String

    rewardAmount: Float
    rewardCurrency: String

    assignments: [ChoreAssignmentInput!]
    completed: [ChoreCompletionInput!]
    active: Boolean

    assignedTo: ChoreAssignedToInput
    assignee: String
    categoryId: String
  }

  input ChoreCompletionInput {
    on: String!
    memberId: String
    paid: Boolean
  }

  # =========================
  # ROOT MUTATION
  # =========================

  type Mutation {
    # Recipes
    addRecipe(input: RecipeInput!): Recipe!
    updateRecipe(id: ID!, patch: RecipePatch!): Recipe!
    deleteRecipe(id: ID!): Boolean!

    # Grocery
    addGrocery(input: GroceryInput!): GroceryItem!
    deleteGrocery(id: ID!): Boolean!
    clearGrocery: Boolean!

    # Chores
    addChore(input: ChoreInput!): Chore!
    updateChore(id: ID!, patch: ChorePatch!): Chore!
    deleteChore(id: ID!): Boolean!

    completeChore(id: ID!, memberId: String): Chore!
    payChore(id: ID!): Chore!
    payMember(memberId: String!): [Chore!]!
  }
`;

