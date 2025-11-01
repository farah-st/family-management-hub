const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  qty:  { type: String, default: '' },
});

const recipeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  ingredients: { type: [ingredientSchema], default: [] },
}, { timestamps: true });

/** Make Mongo’s _id show up as `id` in JSON */
recipeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model('Recipe', recipeSchema);

