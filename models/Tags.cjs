const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema({
  tag_id: { type: Number, unique: true },
  tag_name: { type: String, required: true },
  tag_created_datetime: { type: Date, default: Date.now },
  tag_status: { type: String, default: "1" }, // 1=active, 0=inactive
  tag_category_id: { type: String },
});

// autogen tag_id
TagSchema.pre("save", async function (next) {
  if (!this.tag_id) {
    try {
      const lastTag = await mongoose.model("Tag").findOne().sort("-tag_id");
      this.tag_id = lastTag ? lastTag.tag_id + 1 : 1;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Tag", TagSchema, "tags");
