const express = require("express");
const router = express.Router();
const Report = require("../models/Report.cjs");
const ReportLog = require("../models/ReportLog.cjs");
const User = require("../models/User.cjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// ตรวจสอบ token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// CREATE (Admin add report)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { report_name, report_category, report_detail, report_status } = req.body;

    const report = new Report({
      report_name,
      report_category,
      report_detail,
      report_status: report_status === "1" || report_status === 1,
      created_by: req.user.user_id, // เอา user_id จาก token
    });

    await report.save();
    // create a log entry (received)
    try {
      const creator = await User.findOne({ user_id: req.user.user_id }).lean();
      const log = new ReportLog({
        report_id: report.report_id,
        report_ref: report._id,
        action: "received",
        performed_by: req.user.user_id,
        performed_by_username: creator ? creator.username : null,
        after: report.toObject(),
      });
      await log.save();
    } catch (e) {
      console.error("Failed to save report log (received):", e);
    }

    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Create report failed" });
  }
});

// READ all
router.get("/", verifyToken, async (req, res) => {
  try {
    const reports = await Report.find();

    const users = await mongoose
          .model("User")
          .find({}, "user_id username")
          .lean();
    
        // map user_id → username
        const reportsWithUser = reports.map((r) => {
          const user = users.find((u) => u.user_id === r.created_by);
          return {
            ...r.toObject(),
            created_by_username: user ? user.username : `user#${r.created_by}`,
          };
        });
    
    res.json(reportsWithUser);  
  } catch (err) {
    res.status(500).json({ message: "Fetch reports failed" });
  }
});

// GET logs (admin only) - can accept ?limit=100
router.get("/logs", verifyToken, async (req, res) => {
  if (req.user.role !== "1") return res.status(403).json({ message: "Admin only" });
  try {
    const limit = parseInt(req.query.limit) || 200;
    const q = {};
    if (req.query.report_id) {
      q.report_id = Number(req.query.report_id);
    }
    const logs = await ReportLog.find(q).sort({ timestamp: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (err) {
    console.error("Fetch logs failed:", err);
    res.status(500).json({ message: "Fetch logs failed" });
  }
});

// UPDATE
router.put("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "1") return res.status(403).json({ message: "Admin only" });
  try {
    const before = await Report.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: "Report not found" });
    // Prevent changing report_name once created
    const updateData = { ...req.body };
    if (updateData.hasOwnProperty("report_name")) delete updateData.report_name;

    await Report.findByIdAndUpdate(req.params.id, updateData);
    const after = await Report.findById(req.params.id).lean();

    // determine action
    let action = "update";
    if (req.body.hasOwnProperty("report_status") && String(before.report_status) !== String(req.body.report_status)) {
      action = "status_change";
    }

    // save log
    try {
      const admin = await User.findOne({ user_id: req.user.user_id }).lean();
      const log = new ReportLog({
        report_id: before.report_id,
        report_ref: before._id,
        action,
        performed_by: req.user.user_id,
        performed_by_username: admin ? admin.username : null,
        before,
        after,
      });
      await log.save();
    } catch (e) {
      console.error("Failed to save report log (update):", e);
    }

    res.json({ message: "Report updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update report failed" });
  }
});

// DELETE
router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "1") return res.status(403).json({ message: "Admin only" });
  try {
    const before = await Report.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: "Report not found" });

    await Report.findByIdAndDelete(req.params.id);

    // save deletion log
    try {
      const admin = await User.findOne({ user_id: req.user.user_id }).lean();
      const log = new ReportLog({
        report_id: before.report_id,
        report_ref: before._id,
        action: "delete",
        performed_by: req.user.user_id,
        performed_by_username: admin ? admin.username : null,
        before,
      });
      await log.save();
    } catch (e) {
      console.error("Failed to save report log (delete):", e);
    }

    res.json({ message: "Report deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete report failed" });
  }
});

module.exports = router;
