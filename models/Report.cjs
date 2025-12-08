const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  report_id: { type: Number, unique: true },
  report_name: { type: String, required: true },
  report_category: { type: String, required: true },           
  report_detail: { type: String, required: true },      // รายละเอียด
  report_status: { type: Number, enum: [0, 1], default: 0 }, // 0=ยังไม่แก้, 1=แก้แล้ว
  report_createdAt: { type: Date, default: Date.now },
  created_by: { type: Number, required: true },       // วันที่สร้าง
});

// autogen report_id
ReportSchema.pre("save", async function (next) {
  if (!this.report_id) {
    try {
      const lastReport = await mongoose.model("Report").findOne().sort("-report_id");
      this.report_id = lastReport ? lastReport.report_id + 1 : 1;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Report", ReportSchema, "reports");
