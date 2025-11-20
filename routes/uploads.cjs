const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// GET image by GridFS id and stream it
router.get("/:id", async (req, res) => {
  try {
    const bucket = req.app.locals.gfsBucket;
    if (!bucket) return res.status(500).json({ message: "GridFS not initialized" });

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) return res.status(404).json({ message: "File not found" });

    const file = files[0];
    res.set("Content-Type", file.contentType || "application/octet-stream");
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on("error", (err) => {
      console.error("GridFS download error:", err);
      res.status(404).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error("GET /api/uploads/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
