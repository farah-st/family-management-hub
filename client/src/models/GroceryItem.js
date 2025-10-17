import mongoose from "mongoose";

const GroceryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: String, default: "" },
    checked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const GroceryItem = mongoose.model("GroceryItem", GroceryItemSchema);
