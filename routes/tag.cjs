const express = require("express");
const router = express.Router();
const Tag = require("../models/Tags.cjs");
const jwt = require("jsonwebtoken");

// middleware ตรวจสอบ token + admin
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

// CREATE
router.post("/", verifyToken, async (req, res) => {
  if (req.user.role !== "1") return res.status(403).json({ message: "Admin only" });
  try {
    const tag = new Tag(req.body);
    await tag.save();
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ message: "Create tag failed" });
  }
});

// READ
router.get("/", async (req, res) => {
  try {
    const tag = await Tag.find({ tag_status: "1" }); 
    res.json(tag);
  } catch (err) {
    console.error("Error fetching active tags:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ดึง tags ทั้งหมด (สำหรับ admin/TagTable)
router.get("/all", verifyToken, async (req, res) => {
  try {
    const tag = await Tag.find(); 
    res.json(tag);
  } catch (err) {
    console.error("Error fetching all tags:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE
router.put("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "1") return res.status(403).json({ message: "Admin only" });
  try {
    await Tag.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: "Tag updated" });
  } catch (err) {
    res.status(500).json({ message: "Update tag failed" });
  }
});

// DELETE
router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "1") return res.status(403).json({ message: "Admin only" });
  try {
    await Tag.findByIdAndDelete(req.params.id);
    res.json({ message: "Tag deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete tag failed" });
  }
});

module.exports = router;
