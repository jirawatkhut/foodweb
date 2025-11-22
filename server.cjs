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

const connectToDb = require("./utils/db.cjs");

// ... (keep existing requires and app setup) ...

app.use(express.json());

// --- API Routes ---
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

// --- Image Serving Routes ---
const imageRouteHandler = async (req, res) => {
  try {
    await connectToDb();
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

    downloadStream.on('file', (file) => {
      // Check for file existence and size
      if (file && file.length > 0) {
        res.set('Content-Type', file.contentType);
        downloadStream.pipe(res);
      } else {
        console.error(`File ${req.params.filename} found but has zero length.`);
        res.status(404).send('File not found or is empty');
      }
    });

    downloadStream.on('error', (err) => {
      console.error(`Download stream error for ${req.params.filename}:`, err);
      return res.status(404).send('File not found');
    });

  } catch (err) {
    console.error(`General error for ${req.params.filename}:`, err);
    res.status(500).send('Server error');
  }
};

app.get('/api/images/:filename', imageRouteHandler);


// --- Frontend Serving ---

// This route for /uploads is now obsolete and potentially harmful, 
// as GridFS is handling image serving. It should be removed.
// app.use("/uploads", express.static("uploads"));

// Serve frontend static files from the 'dist' folder
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback: For any request that doesn't match a static file or an API route,
// send the React app's index.html file. This MUST be the last route.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// --- Server Listener ---
// Vercel ignores this, but it's crucial for local development
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);

// Export the app for Vercel
module.exports = app;

