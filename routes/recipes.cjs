const express = require("express");
const multer = require("multer");
const path = require("path");
const Recipe = require("../models/Recipe.cjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

// setup multer (memory storage) — files will be uploaded to GridFS
const storage = multer.memoryStorage();
const upload = multer({ storage });

// middleware ตรวจสอบ token
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

// ✅ GET all recipes
router.get("/",  async (req, res) => {
  try {
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

    const recipe = new Recipe({
      title,
      ingredients,
      instructions,
      tags: Array.isArray(tags) ? tags.map(String) : [String(tags)],
      image: null,
      staring_status: staring_status === "true" || staring_status === true,
      created_by: req.user.user_id,
    });

    // if an image file is provided, upload it to GridFS
    if (req.file) {
      const bucket = req.app.locals.gfsBucket;
      if (!bucket) return res.status(500).json({ message: "GridFS not initialized" });

      const fileId = await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
          contentType: req.file.mimetype,
        });
        uploadStream.end(req.file.buffer);
        uploadStream.on("finish", (file) => resolve(file._id));
        uploadStream.on("error", (err) => reject(err));
      });

      recipe.image = fileId.toString();
    }

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

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    // if new image uploaded, store to GridFS and delete old file (if any)
    if (req.file) {
      const bucket = req.app.locals.gfsBucket;
      if (!bucket) return res.status(500).json({ message: "GridFS not initialized" });

      // upload new
      const fileId = await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
          contentType: req.file.mimetype,
        });
        uploadStream.end(req.file.buffer);
        uploadStream.on("finish", (file) => resolve(file._id));
        uploadStream.on("error", (err) => reject(err));
      });

      // delete old file if present
      if (recipe.image) {
        try {
          const oldId = new mongoose.Types.ObjectId(recipe.image);
          await bucket.delete(oldId);
        } catch (e) {
          console.warn("Old image delete failed:", e.message);
        }
      }

      updateData.image = fileId.toString();
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
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    // delete image from GridFS if exists
    if (recipe.image) {
      try {
        const bucket = req.app.locals.gfsBucket;
        if (bucket) {
          await bucket.delete(new mongoose.Types.ObjectId(recipe.image));
        }
      } catch (e) {
        console.warn("Delete image from GridFS failed:", e.message);
      }
    }

    await Recipe.findByIdAndDelete(req.params.id);
    res.json({ message: "Recipe deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/rate", verifyToken, async (req, res) => {
  try {
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
