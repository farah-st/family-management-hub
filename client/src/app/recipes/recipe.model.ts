export interface Ingredient {
  name: string;
  amount?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  ingredients: Ingredient[];
  steps: string[];
  createdAt: string; 
  updatedAt?: string;
}
