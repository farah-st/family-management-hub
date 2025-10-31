import mongoose from 'mongoose';

const grocerySchema = new mongoose.Schema({
  name: String,
  qty: String
});

export const Grocery = mongoose.model('Grocery', grocerySchema);
