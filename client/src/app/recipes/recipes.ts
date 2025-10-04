export interface Recipe {
  title: string;
  ingredients: string[];
  estimatedCost: number;
}

export const RECIPES: Recipe[] = [
  {
    title: "Chicken Alfredo Pasta",
    ingredients: ["Chicken breast", "Fettuccine pasta", "Alfredo sauce"],
    estimatedCost: 12
  },
  {
    title: "Veggie Stir Fry",
    ingredients: ["Broccoli", "Carrots", "Soy sauce"],
    estimatedCost: 8
  }
];
