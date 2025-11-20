const multer = require("multer");
const { getGridFSBucket } = require("../utils/gridfsConfig.cjs");

// ใช้ memory storage เพื่อเก็บไฟล์ในหน่วยความจำชั่วคราว
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // จำกัด 10MB
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("กรุณาอัพโหลดไฟล์รูปเท่านั้น"));
    }
    cb(null, true);
  },
});

// Middleware สำหรับอัพโหลดไฟล์ไป GridFS แบบ stream
async function uploadToGridFS(req, res, next) {
  try {
    if (!req.file) {
      return next();
    }

    const bucket = getGridFSBucket();
    
    // สร้าง upload stream
    const uploadStream = bucket.openUploadStream(
      `${Date.now()}_${req.file.originalname}`,
      {
        metadata: {
          contentType: req.file.mimetype,
          originalName: req.file.originalname,
          uploadedBy: req.user ? req.user.id : "anonymous",
          uploadedAt: new Date(),
        },
      }
    );

    // จัดการ error จาก stream
    uploadStream.on("error", (err) => {
      console.error("GridFS upload stream error:", err);
      req.uploadError = err;
      next();
    });

    // เมื่อ upload เสร็จ
    uploadStream.on("finish", () => {
      req.fileId = uploadStream.id;
      req.fileName = uploadStream.filename;
      console.log(`✅ File uploaded to GridFS: ${uploadStream.filename} (ID: ${uploadStream.id})`);
      next();
    });

    // ส่งข้อมูลไฟล์ไปยัง GridFS โดยตรง (stream)
    uploadStream.end(req.file.buffer);

  } catch (err) {
    console.error("Error in uploadToGridFS middleware:", err);
    return res.status(500).json({ message: "Server error during upload" });
  }
}

module.exports = {
  upload,
  uploadToGridFS,
};module.exports = {
  upload,
  uploadToGridFS,
};
