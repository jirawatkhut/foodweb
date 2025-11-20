const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const User = require("../models/User.cjs");
const Recipe = require("../models/Recipe.cjs");


// กำหนด storage สำหรับอัปโหลด
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // โฟลเดอร์ uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // ชื่อไฟล์ไม่ซ้ำ
  },
});
const upload = multer({ storage });

// ✅ REGISTER
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { first_name, last_name, username, password, tel, email, gender, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      first_name,
      last_name,
      username,
      password: hashedPassword,
      tel,
      email,
      gender,
      role,
      image: req.file ? req.file.filename : null, // เก็บชื่อไฟล์รูป
    });

    await newUser.save();
    res.status(201).json({ message: "Register success" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Register failed" });
  }
});

// ✅ LOGIN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.status !== "1") {
      return res.status(403).json({ message: "บัญชีนี้ถูกปิดการใช้งาน" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role , user_id: user.user_id},
      "your_jwt_secret",
      { expiresIn: "1h" }
    );

    // 👇 ส่ง username + image กลับไปด้วย
    res.json({
      token,
      role: user.role,
      user_id: user.user_id,
      username: user.username,
      image: user.image,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Middleware ตรวจสอบ JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, "your_jwt_secret", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// ✅ GET users (admin only)
router.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 ดึงข้อมูลผู้ใช้ตาม user_id
router.get("/users/:id", verifyToken, async (req, res) => {
  try {
    // ให้ user ดูข้อมูลตัวเองเท่านั้น ยกเว้น admin
    if (req.user.role !== "1" && req.user.user_id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: "Forbidden: You can only access your own data" });
    }

    const user = await User.findOne({ user_id: req.params.id }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Get user by user_id error:", err);
    res.status(500).json({ message: "Error fetching user" });
  }
});



// ✅ DELETE user
router.delete("/users/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "1") return res.status(403).json({ message: "Admin only" });
  try {
    console.log("Attempting to delete user with _id:", req.params.id);
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ อัปเดต status และ role เท่านั้น
router.put("/users/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "1") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { status, role } = req.body;

    // validate ค่า
    if (!["0", "1"].includes(String(status))) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    if (!["0", "1"].includes(String(role))) {
      return res.status(400).json({ message: "Invalid role value" });
    }

    const user = await User.findOneAndUpdate(
      { user_id: Number(req.params.id) },
      { status, role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated (status & role)", user });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ อัปเดตสถานะ user (admin เท่านั้น)
router.put("/users/:id/status", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "1") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { status } = req.body;
    if (!["0", "1"].includes(String(status))) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findOneAndUpdate(
      { user_id: Number(req.params.id) },
      { status },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Status updated", user });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Server error" });
  }
});




// 📌 อัปเดต tag ที่ user สนใจ
router.put("/users/:id/tags", verifyToken, async (req, res) => {
  try {
    // user ธรรมดาอัปเดตได้เฉพาะของตัวเอง
    if (req.user.role !== 1 && req.user.user_id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { interested_tags } = req.body;

    if (!Array.isArray(interested_tags) || interested_tags.length > 5) {
      return res.status(400).json({ message: "เลือกได้สูงสุด 5 tag" });
    }

    const user = await User.findOneAndUpdate(
      { user_id: req.params.id },
      { interested_tags },
      { new: true }
    ).select("-password");

    res.json({ message: "อัปเดต tag ที่สนใจเรียบร้อยแล้ว", user });
  } catch (err) {
    console.error("Update tags error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /users/:id/password
router.put("/users/:id/password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findOne({ user_id: req.params.id });

    if (!user) return res.status(404).json({ message: "User not found" });

    // ตรวจสอบรหัสเดิม
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });

    // อัปเดตรหัสใหม่
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ เพิ่ม /users/:id/favorites
router.put("/users/:id/favorites", verifyToken, async (req, res) => {
  try {
    const { recipe_id } = req.body;

    if (!recipe_id) {
      return res.status(400).json({ message: "ต้องระบุ recipe_id" });
    }

    // หา user ตาม user_id
    const user = await User.findOne({ user_id: req.params.id });
    if (!user) return res.status(404).json({ message: "User not found" });

    // toggle favorite
    const index = user.favorites.indexOf(recipe_id);
    if (index === -1) {
      user.favorites.push(recipe_id);
    } else {
      user.favorites.splice(index, 1);
    }

    await user.save();
    res.json({ message: "อัปเดต favorite สำเร็จ", favorites: user.favorites });
  } catch (err) {
    console.error("Favorite update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
