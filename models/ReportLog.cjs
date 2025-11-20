const mongoose = require("mongoose");

const ReportLogSchema = new mongoose.Schema({
  report_id: { type: Number },
  report_ref: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
  action: { type: String, required: true }, // received | update | status_change | delete
  performed_by: { type: Number }, // user_id
  performed_by_username: { type: String },
  timestamp: { type: Date, default: Date.now },
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  meta: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model("ReportLog", ReportLogSchema, "report_logs");
