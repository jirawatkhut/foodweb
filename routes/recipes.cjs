const connectToDb = require("../utils/db.cjs");
const express = require("express");
const multer = require("multer");
const path = require("path");
const Recipe = require("../models/Recipe.cjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

// setup multer (memory storage) — we'll stream buffers into GridFS
const upload = multer({ storage: multer.memoryStorage() });

// helper: upload buffer to GridFS and return the stored filename
const uploadToGridFS = (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      await connectToDb();
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
      const filename = Date.now() + path.extname(file.originalname);
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: { originalname: file.originalname },
        contentType: file.mimetype,
      });
      uploadStream.end(file.buffer);
      // 'finish' does not provide uploadedFile; resolve with filename we generated
      uploadStream.on('finish', () => resolve(filename));
      uploadStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

// middleware ตรวจสอบ token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// ✅ GET all recipes
router.get("/",  async (req, res) => {
  try {
    await connectToDb();
    const recipes = await Recipe.find();

    const users = await mongoose.model("User").find({}, "user_id username").lean();

    const recipesWithUser = recipes.map((r) => {
      const user = users.find((u) => u.user_id === r.created_by);
      const ratings = r.ratings || [];
      const average =
        ratings.length > 0
          ? (ratings.reduce((sum, rr) => sum + rr.score, 0) / ratings.length).toFixed(1)
          : 0;

      return {
        ...r.toObject(),
        created_by_username: user ? user.username : `user#${r.created_by}`,
        average: Number(average),
      };
    });

    res.json(recipesWithUser);
  } catch (err) {
    console.error("Fetch recipes error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET recipe by ID
router.get("/:id", async (req, res) => {
  try {
    await connectToDb();
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    const User = mongoose.model("User");
    const user = await User.findOne({ user_id: recipe.created_by }, "username").lean();

    res.json({
      ...recipe.toObject(),
      created_by_username: user ? user.username : `user#${recipe.created_by}`,
    });
  } catch (err) {
    console.error("Get recipe by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ POST add recipe (รองรับ ingredients array)
router.post("/", verifyToken, upload.single("image"), async (req, res) => {
  try {
    await connectToDb();
    const { title, instructions, tags, staring_status } = req.body;
    let ingredients = [];

    // 🧂 แปลง JSON string → array
    if (req.body.ingredients) {
      try {
        ingredients = JSON.parse(req.body.ingredients);
      } catch (e) {
        return res.status(400).json({ message: "Invalid ingredients format" });
      }
    }

    const imageFilename = req.file ? req.file.filename : null;
    // if a file buffer was provided, upload to GridFS
    let gridFilename = null;
    if (req.file && req.file.buffer) {
      try {
        gridFilename = await uploadToGridFS(req.file);
      } catch (err) {
        console.error('GridFS upload error:', err);
        return res.status(500).json({ message: 'File upload failed' });
      }
    }

    const recipe = new Recipe({
      title,
      ingredients,
      instructions,
      tags: Array.isArray(tags) ? tags.map(String) : [String(tags)],
      image: gridFilename || (req.file ? req.file.filename : null),
      staring_status: staring_status === "true" || staring_status === true,
      created_by: req.user.user_id,
    });

    await recipe.save();
    res.json({ message: "Recipe created", recipe });
  } catch (err) {
    console.error("Create recipe error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ PUT update recipe (รองรับ ingredients array)
router.put("/:id", verifyToken, upload.single("image"), async (req, res) => {
  try {
    await connectToDb();
    const { title, instructions, tags, staring_status } = req.body;
    let ingredients = [];

    if (req.body.ingredients) {
      try {
        ingredients = JSON.parse(req.body.ingredients);
      } catch (e) {
        return res.status(400).json({ message: "Invalid ingredients format" });
      }
    }

    const updateData = {
      title,
      ingredients,
      instructions,
      tags: Array.isArray(tags) ? tags.map(String) : [String(tags)],
      staring_status: staring_status === "true" || staring_status === true,
    };

    if (req.file && req.file.buffer) {
      try {
        const gridFilename = await uploadToGridFS(req.file);
        updateData.image = gridFilename;
      } catch (err) {
        console.error('GridFS upload error (update):', err);
        return res.status(500).json({ message: 'File upload failed' });
      }
    }

    await Recipe.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: "Recipe updated" });
  } catch (err) {
    console.error("Update recipe error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE recipe
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await connectToDb();
    await Recipe.findByIdAndDelete(req.params.id);
    res.json({ message: "Recipe deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/rate", verifyToken, async (req, res) => {
  try {
    await connectToDb();
    const { score, comment } = req.body;
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    // 🧠 ดึง username จากฐานข้อมูลตาม user_id จาก token
    const User = mongoose.model("User");
    const user = await User.findOne({
      $or: [
        { user_id: req.user.user_id },
        
      ],
    }).lean();

    const username = user ? user.username : `user#${req.user.user_id}`;

    // ✅ ถ้ามีการให้คะแนนเดิม ให้แก้ไขแทน
    const existing = recipe.ratings.find((r) => r.user_id === req.user.user_id);
    
      recipe.ratings.push({
        user_id: req.user.user_id,
        username, // ⭐ เพิ่มชื่อที่ดึงมาจริง
        score,
        comment,
      });
    

    await recipe.save();
    res.json({ message: "Rating saved", recipe });
  } catch (err) {
    console.error("Rate error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ PUT update rating (comment)
router.put("/:id/rate", verifyToken, async (req, res) => {
  try {
    await connectToDb();
    const { score, comment } = req.body;
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    const rating = recipe.ratings.find((r) => r.user_id === req.user.user_id);
    if (!rating) return res.status(404).json({ message: "Rating not found for this user" });

    // Update score and comment
    rating.score = score;
    rating.comment = comment;

    await recipe.save();
    res.json({ message: "Rating updated", recipe });
  } catch (err) {
    console.error("Update rating error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE rating (comment)
router.delete("/:id/rate/:ratingId", verifyToken, async (req, res) => {
  try {
    await connectToDb();
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    // Find the rating and ensure the user is the owner
    const ratingIndex = recipe.ratings.findIndex(
      (r) => r._id.toString() === req.params.ratingId && r.user_id === req.user.user_id
    );

    if (ratingIndex === -1) {
      return res.status(404).json({ message: "Rating not found or user not authorized" });
    }

    // Remove the rating from the array
    recipe.ratings.splice(ratingIndex, 1);

    await recipe.save();
    res.json({ message: "Rating deleted" });
  } catch (err) {
    console.error("Delete rating error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET: ดึงความคิดเห็นทั้งหมด + คำนวณคะแนนเฉลี่ย
router.get("/:id/ratings", async (req, res) => {
  try {
    await connectToDb();
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    const ratings = recipe.ratings || [];
    const avgScore =
      ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
        : 0;

    res.json({ average: avgScore, ratings });
    
  } catch (err) {
    console.error("Get ratings error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
