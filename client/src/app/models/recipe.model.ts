import { Ingredient } from './ingredient.model';

export interface Recipe {
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    ingredients: Ingredient[];
    tag?: string[];
}

