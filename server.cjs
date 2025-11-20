const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://db_user_01:huRWTPn9rtfZFDZy@jib.bjdsdg3.mongodb.net/pos?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use('/uploads', express.static('uploads'));

// mount API routes
const authRoutes = require('./routes/auth.cjs');
app.use('/api/auth', authRoutes);

const recipeRoutes = require('./routes/recipes.cjs');
app.use('/api/recipes', recipeRoutes);

const tagsRoute = require('./routes/tag.cjs');
app.use('/api/tag', tagsRoute);

const reportsRoute = require('./routes/reports.cjs');
app.use('/api/reports', reportsRoute);

const commentsRoute = require('./routes/comments.cjs');
app.use('/api/comments', commentsRoute);

// Create GridFS bucket after connection open and mount images route
mongoose.connection.once('open', () => {
  console.log('MongoDB connected');
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'images' });
    app.locals.gfsBucket = bucket;
    console.log('GridFS bucket "images" created');

    // mount images route (serves /api/images)
    const imagesRoute = require('./routes/images.cjs');
    app.use('/api/images', imagesRoute);
  } catch (err) {
    console.error('Failed to create GridFS bucket', err);
  }
});

app.get('/', (req, res) => res.send('Hello from Express backend 🚀'));

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
