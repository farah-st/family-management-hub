import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true }, qty: { type: String, default: "" } },
  { _id: false }
);

const RecipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    ingredients: { type: [IngredientSchema], default: [] }
  },
  { timestamps: true }
);

export const Recipe = mongoose.model("Recipe", RecipeSchema);
