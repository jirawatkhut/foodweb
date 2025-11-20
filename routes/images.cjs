const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Stream image by GridFS file id
router.get('/file/:id', async (req, res) => {
  try {
    const gfs = req.app.locals.gfsBucket;
    if (!gfs) return res.status(500).json({ message: 'GridFS not initialized' });

    const _id = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = gfs.openDownloadStream(_id);

    downloadStream.on('error', (err) => {
      return res.status(404).json({ message: 'File not found' });
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid id' });
  }
});

// Stream by filename (latest)
router.get('/byname/:filename', async (req, res) => {
  try {
    const gfs = req.app.locals.gfsBucket;
    if (!gfs) return res.status(500).json({ message: 'GridFS not initialized' });

    const cursor = gfs.find({ filename: req.params.filename }).sort({ uploadDate: -1 }).limit(1);
    const files = await cursor.toArray();
    if (!files || files.length === 0) return res.status(404).json({ message: 'File not found' });

    const id = files[0]._id;
    const downloadStream = gfs.openDownloadStream(id);
    downloadStream.on('error', () => res.status(404).json({ message: 'File not found' }));
    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete file by id
router.delete('/:id', async (req, res) => {
  try {
    const gfs = req.app.locals.gfsBucket;
    if (!gfs) return res.status(500).json({ message: 'GridFS not initialized' });

    const _id = new mongoose.Types.ObjectId(req.params.id);
    await gfs.delete(_id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid id or delete failed' });
  }
});

module.exports = router;
