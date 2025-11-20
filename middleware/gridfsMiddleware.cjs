const multer = require("multer");
const { getGridFSBucket } = require("../utils/gridfsConfig.cjs");

// ใช้ memory storage เพื่อเก็บไฟล์ในหน่วยความจำชั่วคราว
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("กรุณาอัพโหลดไฟล์รูปเท่านั้น"));
    }
    cb(null, true);
  },
});

// Middleware สำหรับอัพโหลดไฟล์ไป GridFS
async function uploadToGridFS(req, res, next) {
  try {
    if (!req.file) {
      return next();
    }

    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: {
        contentType: req.file.mimetype,
        uploadedBy: req.user ? req.user.id : "anonymous",
      },
    });

    uploadStream.on("error", (err) => {
      console.error("GridFS upload error:", err);
      return res.status(500).json({ message: "ไม่สามารถอัพโหลดไฟล์ได้" });
    });

    uploadStream.on("finish", () => {
      // เก็บ file ID ไว้ใน req.fileId เพื่อใช้ต่อไป
      req.fileId = uploadStream.id;
      next();
    });

    // ส่งเนื้อหาไฟล์ไปยัง GridFS
    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error("Error in uploadToGridFS:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  upload,
  uploadToGridFS,
};
