export interface Recipe {
  id: string;
  title: string;
  description?: string;
  estimatedCost?: number;
  ingredients: string[];
}

export const RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Spaghetti',
    description: 'Classic tomato pasta',
    estimatedCost: 8.5,
    ingredients: ['Spaghetti', 'Tomato sauce', 'Garlic']
  },
  {
    id: '2',
    title: 'Chicken Tacos',
    description: 'Weeknight favorite',
    estimatedCost: 12,
    ingredients: ['Tortillas', 'Chicken', 'Onion', 'Cilantro']
  }
];

