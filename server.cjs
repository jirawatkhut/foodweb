const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");


const app = express();
const PORT = process.env.PORT || 3000;

// Load .env in development if available (optional)
try {
  require('dotenv').config();
} catch (e) {}

// CORS: allow FRONTEND_URL or allow Vercel/Render origins automatically.
const allowedOrigins = [];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
if (process.env.VERCEL_URL) allowedOrigins.push(`https://${process.env.VERCEL_URL}`);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow same-origin or no-origin (non-browser requests)
      if (!origin) return callback(null, true);
      // allow explicit whitelist
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // allow any Vercel deployments (your frontend) and Render domains
      try {
        const u = new URL(origin);
        if (u.hostname.endsWith('.vercel.app') || u.hostname.endsWith('.onrender.com')) {
          return callback(null, true);
        }
      } catch (e) {
        // ignore
      }
      // otherwise reject with a friendly error (will not set CORS header)
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Connection (use env var if provided)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://db_user_01:huRWTPn9rtfZFDZy@jib.bjdsdg3.mongodb.net/pos?retryWrites=true&w=majority';
if (!process.env.MONGODB_URI) {
  console.warn('Warning: using hard-coded MongoDB URI. Set MONGODB_URI env var in production.');
}
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// static uploads (legacy) — GridFS will be used for new images
app.use("/uploads", express.static("uploads"));

const authRoutes = require("./routes/auth.cjs");
app.use("/api/auth", authRoutes);

const recipeRoutes = require("./routes/recipes.cjs");
app.use("/api/recipes", recipeRoutes);

const tagsRoute = require("./routes/tag.cjs");
app.use("/api/tag", tagsRoute);

const reportsRoute = require("./routes/reports.cjs");
app.use("/api/reports", reportsRoute);

const commentsRoute = require("./routes/comments.cjs");
app.use("/api/comments", commentsRoute);

mongoose.connection.once("open", async () => {
  console.log("MongoDB connected");


  // ✅ เพิ่มข้อมูลตัวอย่าง 3รายการ (ถ้าต้องการ)
  //await Item.create({ name: "Banana", price: 50 });
  //await Item.create({ name: "Orange", price: 80 });
  //await Item.create({ name: "Apple", price: 100 });
  //console.log("Sample item inserted");

  // ลบข้อมูลทั้งหมด (ถ้าต้องการ)
  //await Item.deleteMany({});
  //console.log("All items deleted");

  // Create GridFS bucket for images and attach to app.locals for reuse
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "images" });
    app.locals.gfsBucket = bucket;
    console.log("GridFSBucket (images) ready");
  } catch (err) {
    console.error("GridFSBucket init error:", err);
  }
});

app.get("/", (req, res) => {
  res.send("Hello from Express backend 🚀");
});

// Download image from GridFS by filename
app.get('/api/images/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const db = mongoose.connection.db;
    const files = await db.collection('images.files').find({ filename }).toArray();
    if (!files || files.length === 0) return res.status(404).json({ message: 'File not found' });
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    const bucket = app.locals.gfsBucket || new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.on('error', (err) => {
      console.error('Download stream error', err);
      res.status(404).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Get image error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Backwards-compatible route used by frontend: /uploads/:filename
app.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const db = mongoose.connection.db;
    const files = await db.collection('images.files').find({ filename }).toArray();
    if (!files || files.length === 0) return res.status(404).json({ message: 'File not found' });
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    const bucket = app.locals.gfsBucket || new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.on('error', (err) => {
      console.error('Download stream error', err);
      res.status(404).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Get image error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Serve frontend
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
