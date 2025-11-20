const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User.cjs");
const Recipe = require("../models/Recipe.cjs");


// กำหนด multer ให้ใช้ memory storage — จะอัปโหลดไปยัง GridFS
const upload = multer({ storage: multer.memoryStorage() });

// helper: upload buffer to GridFS and return stored filename
const uploadToGridFS = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'images' });
      const filename = Date.now() + path.extname(file.originalname);
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: { originalname: file.originalname },
        contentType: file.mimetype,
      });
      uploadStream.end(file.buffer);
      uploadStream.on('finish', (uploadedFile) => resolve(uploadedFile.filename));
      uploadStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

// ✅ REGISTER
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { first_name, last_name, username, password, tel, email, gender, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    let gridFilename = null;
    if (req.file && req.file.buffer) {
      try {
        gridFilename = await uploadToGridFS(req.file);
      } catch (err) {
        console.error('GridFS upload error (register):', err);
        return res.status(500).json({ message: 'File upload failed' });
      }
    }

    const newUser = new User({
      first_name,
      last_name,
      username,
      password: hashedPassword,
      tel,
      email,
      gender,
      role,
      image: gridFilename || (req.file ? req.file.filename : null), // เก็บชื่อไฟล์รูป
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
      process.env.JWT_SECRET || "your_jwt_secret",
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
  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    // normalize numeric user_id to Number to avoid type-mismatch later
    if (decoded && decoded.user_id !== undefined) {
      try {
        decoded.user_id = Number(decoded.user_id);
      } catch (e) {}
    }
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
router.put("/users/:id", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    // allow admin or the owner themselves
    if (req.user.role !== "1" && req.user.user_id !== targetId) {
      return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
    }

    // If admin and status/role present -> update those
    if (req.user.role === "1" && (req.body.status !== undefined || req.body.role !== undefined)) {
      const { status, role } = req.body;
      if (status !== undefined && !["0", "1"].includes(String(status))) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      if (role !== undefined && !["0", "1"].includes(String(role))) {
        return res.status(400).json({ message: "Invalid role value" });
      }
      const user = await User.findOneAndUpdate(
        { user_id: targetId },
        { status, role },
        { new: true }
      ).select("-password");
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ message: "User updated (status & role)", user });
    }

    // Otherwise allow profile update by owner (or admin updating profile fields)
    const updateData = {};
    const allowedFields = ["first_name", "last_name", "username", "tel", "email", "gender"];
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });

    if (req.file && req.file.buffer) {
      try {
        const gridFilename = await uploadToGridFS(req.file);
        updateData.image = gridFilename;
      } catch (err) {
        console.error('GridFS upload error (profile update):', err);
        return res.status(500).json({ message: 'File upload failed' });
      }
    }

    const user = await User.findOneAndUpdate({ user_id: targetId }, updateData, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", user });
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
