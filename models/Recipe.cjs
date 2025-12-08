const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema({
  recipe_id: { type: Number, unique: true }, // auto-generate
  title: { type: String, required: true },
  ingredients: [
      {
        name: { type: String, required: true },
        quantity: { type: String},
        unit: { type: String },
      },
    ],
  instructions: { type: String, required: true },
  tags: [{ type: Number }], // array ของ tag_id
  image: { type: String },
  created_by: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  staring_status: { type: Boolean, default: false },
  ratings: [
    {
      user_id: Number,
      username: String,
      score: Number, // 1–5
      comment: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

// hook auto-generate recipe_id
RecipeSchema.pre("save", async function (next) {
  if (!this.recipe_id) {
    try {
      const last = await mongoose.model("Recipe").findOne().sort("-recipe_id");
      this.recipe_id = last ? last.recipe_id + 1 : 1;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Recipe", RecipeSchema, "recipes");
