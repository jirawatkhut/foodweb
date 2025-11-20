const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true }, // ให้ระบบกำหนด
  first_name: String,
  last_name: String,
  username: { type: String, unique: true },
  password: String,
  tel: String,
  email: String,
  gender: String,
  role: { type: String, default: "0" }, // 0 = member, 1 = admin
  image: String,
  profileImage: mongoose.Schema.Types.ObjectId, // GridFS file ID สำหรับรูปโปรไฟล์
  status: { type: String, default: "1" }, // 👈 1 = active, 0 = inactive
  interested_tags: [{ type: Number }], // เก็บ tag_id ที่ user เลือก
  favorites: {
    type: [String], // เก็บ recipe_id (ObjectId.toString)
    default: [],
  },



});



// hook ก่อน save → auto generate user_id
UserSchema.pre("save", async function (next) {
  if (!this.user_id) {
    try {
      const lastUser = await mongoose.model("User").findOne().sort("-user_id");
      this.user_id = lastUser ? lastUser.user_id + 1 : 1;
    } catch (err) {
      return next(err);
    }
  }
  next();
});


module.exports = mongoose.model("User", UserSchema, "users");
