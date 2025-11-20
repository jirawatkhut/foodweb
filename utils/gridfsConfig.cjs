const mongoose = require("mongoose");
const GridFSBucket = mongoose.mongo.GridFSBucket;

let bucket;

// เตรียม GridFS Bucket เมื่อ MongoDB เชื่อมต่อ
async function initGridFS() {
  if (!bucket) {
    bucket = new GridFSBucket(mongoose.connection.db);
  }
  return bucket;
}

// ดึง GridFS bucket
function getGridFSBucket() {
  if (!bucket) {
    throw new Error("GridFS bucket ยังไม่ได้เตรียมพร้อม");
  }
  return bucket;
}

// สตรีมรูปจาก GridFS โดยใช้ File ID
function downloadFileStream(fileId) {
  const bucket = getGridFSBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

// ลบรูปจาก GridFS โดยใช้ File ID
async function deleteFile(fileId) {
  const bucket = getGridFSBucket();
  await bucket.delete(new mongoose.Types.ObjectId(fileId));
}

module.exports = {
  initGridFS,
  getGridFSBucket,
  downloadFileStream,
  deleteFile,
};
