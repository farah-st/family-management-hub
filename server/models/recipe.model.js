import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: String,
  qty: String
});

const recipeSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
  ingredients: [ingredientSchema]
});

export const Recipe = mongoose.model('Recipe', recipeSchema);
