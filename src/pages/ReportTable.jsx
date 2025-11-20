import { useEffect, useState, useContext } from "react";

import { AuthContext } from "../context/AuthContext";
import api from "../context/api.js";
const ReportTable = () => {
  const { token, role } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [editingReport, setEditingReport] = useState(null);
  const [form, setForm] = useState({ report_name: "", report_category: "", report_detail: "", report_status: 0 });
  const [filterCategory, setFilterCategory] = useState("");
  const [modalLogs, setModalLogs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalLimit, setModalLimit] = useState(100);
  const [modalReportId, setModalReportId] = useState(null);

  const [status, setStatus] = useState("idle"); // "idle" | "loading"

  // ✅ หมวดหมู่แบบ fixed
  const categories = [
    { id: "", name: "ทั้งหมด" },
    { id: "การทำงาน (Functionality)", name: "การทำงาน (Functionality)" },
    { id: "ส่วนติดต่อผู้ใช้ (UI/UX)", name: "ส่วนติดต่อผู้ใช้ (UI/UX)" },
    { id: "ประสิทธิภาพ (Performance)", name: "ประสิทธิภาพ (Performance)" },
    { id: "ความปลอดภัย (Security)", name: "ความปลอดภัย (Security)" },
    { id: "เนื้อหา (Content)", name: "เนื้อหา (Content)" },
    { id: "อื่นๆ (Other)", name: "อื่นๆ (Other)" },
  ];
  
  useEffect(() => {
    if (role === "1") fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // refetch modal logs when limit changes while visible
  useEffect(() => {
    if (modalOpen && role === "1" && modalReportId) fetchModalLogs(modalReportId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalLimit]);

  // helper to summarize before/after objects for display
  const summarize = (o) => {
    if (!o) return "-";
    const cat = o.report_category || o.category || "";
    const detail = o.report_detail ? String(o.report_detail).replace(/\s+/g, " ").slice(0, 120) : "";
    const status = typeof o.report_status !== "undefined" ? `status:${o.report_status}` : "";
    return `${cat} ${detail} ${status}`.trim();
  };

  // fetch logs for a specific report (modal)
  const fetchModalLogs = async (report_id) => {
    if (role !== "1") return;
    setModalLoading(true);
    try {
      const res = await api.get(`/api/reports/logs?report_id=${report_id}&limit=${modalLimit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModalLogs(res.data || []);
    } catch (err) {
      console.error("Error fetching logs:", err.response?.data || err.message);
      setModalLogs([]);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchReports = async () => {
    setStatus("loading");
    try {
      const res = await api.get("/api/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data);
      setStatus("idle");
    } catch (err) {
      console.error("Error fetching reports:", err.response?.data || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("คุณต้องการลบ Report นี้หรือไม่?")) {
      try {
        await api.delete(`/api/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchReports();
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const handleEdit = (report) => {
  setEditingReport(report._id);
  setForm({
    report_id: report.report_id,
    report_name: report.report_name,
    report_category: report.report_category,
    report_detail: report.report_detail,
    report_status: report.report_status,
    created_by_username: report.created_by_username,
    report_createdAt: report.report_createdAt,
  });
};


  const handleSave = async () => {
    if (!form.report_category) {
      alert("กรุณาเลือกหมวดหมู่ก่อนบันทึก!");
      return; // ไม่ส่ง request
    }
    try {
      if (editingReport === "new") {
        if (!form.report_name || !form.report_name.trim()) {
          alert("กรุณาระบุชื่อหัวข้อของรายงาน");
          return;
        }
        await api.post("/api/reports", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.put(`/api/reports/${editingReport}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setEditingReport(null);
      fetchReports();
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
    }
  };

  // ✅ Filter reports ตามหมวดหมู่
  const filteredReports = filterCategory
    ? reports.filter((r) => r.report_category === filterCategory)
    : reports;

  return (
    <div className="space-y-6">
      {/* Card 1: Filters */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold">จัดการปัญหา</h2>
          {status === "loading" && (
            <div className="text-center">
              <span className="loading loading-lg loading-spinner"></span>
            </div>
          )}

          {status === "idle" && !reports.length && <div></div>}

          {/* Dropdown filter ด้านบน */}
          <div className="flex justify-between items-center mb-4 mt-2">
            <div className="flex items-center space-x-2">
              <label className="whitespace-nowrap font-bold">
                หมวดหมู่ปัญหา :{" "}
                <select
                  className="select w-48"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {/* (removed global logs control — per-report modal is available in table) */}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="h-96 overflow-x-auto">
            <table className="table table-s w-full table-pin-rows rounded-box bg-base-100">
              <thead>
                <tr className="bg-pink-100 text-primary-content rounded-t-lg ">
                  <th className="first:rounded-tl-lg">หมวดหมู่</th>
                  <th>หัวข้อ</th>
                  <th>รายละเอียด</th>
                  <th>ผู้เเจ้ง</th>
                  <th>วันที่แจ้ง</th>
                  <th>สถานะ</th>
                  <th>Logs</th>
                  <th className="last:rounded-tr-lg">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r) => (
                    <tr key={r._id}>
                      <td>{r.report_category}</td>
                      <td>{r.report_name}</td>
                      <td>{r.report_detail}</td>
                      <td>{r.created_by_username || r.created_by}</td>
                      <td className="whitespace-nowrap">
                        {new Date(r.report_createdAt).toLocaleString(
                          "th-TH",
                          {
                            dateStyle: "medium",
                            timeStyle: "short"
                          }
                        )}
                      </td>
                      <td>
                        {r.report_status === 1 ? (
                          <span className="badge badge-success text-white text-xs">แก้แล้ว</span>
                        ) : (
                          <span className="badge badge-ghost text-xs">รอดำเนินการ</span>
                        )}
                      </td>
                      <td>
                        {role === "1" ? (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              // open modal for this report
                              const rid = r.report_id || r.report_id;
                              setModalReportId(rid);
                              setModalOpen(true);
                              fetchModalLogs(rid);
                            }}
                          >
                            ดู Logs
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => handleEdit(r)} className="btn btn-outline btn-sm btn-info">แก้ไข</button>
                        <> </>
                        <button onClick={() => handleDelete(r._id)} className="btn btn-outline btn-sm btn-error">ลบ</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-sm text-right">
            จำนวนทั้งหมด: {filteredReports.length} รายการ
          </div>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {editingReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-gray-900">
          <div className="bg-gray-100 rounded-lg shadow-lg p-6 w-[450px]">
            <h3 className="text-xl font-bold mb-3">
              {editingReport === "new" ? "เพิ่ม Report" : "รายละเอียด & แก้ไขสถานะ"}
            </h3>

            {/* แสดงข้อมูลเดิม */}
            <div className="space-y-2 text-sm">
              <p><span className="font-bold">Report ID:</span> {form.report_id || "-"}</p>
              <p><span className="font-bold">หัวข้อ:</span> {form.report_name || "-"}</p>
              <p><span className="font-bold">ผู้แจ้ง:</span> {form.created_by_username || "-"}</p>
              <p><span className="font-bold">วันที่แจ้ง:</span> {form.report_createdAt ? new Date(form.report_createdAt).toLocaleString("th-TH") : "-"}</p>
            </div>

            {/* หมวดหมู่ */}
            {/* If creating new -> allow name input */}
            {editingReport === "new" && (
              <>
                <label className="block mt-3 font-bold">หัวข้อ (ชื่อรายงาน):</label>
                <input className="input w-full border border-gray-300 rounded px-2 py-1 mt-1" value={form.report_name} onChange={(e) => setForm({ ...form, report_name: e.target.value })} />
              </>
            )}
            <label className="block mt-3 font-bold">หมวดหมู่:</label>
            <select
              className="select w-full border border-gray-300 rounded px-2 py-1 mt-1"
              value={form.report_category}
              onChange={(e) => setForm({ ...form, report_category: e.target.value })}
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories
                .filter((c) => c.id !== "")
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>

            {/* รายละเอียด */}
            <label className="block mt-3 font-bold">รายละเอียด:</label>
            <textarea
              className="textarea w-full border border-gray-300 rounded px-2 py-1 mt-1"
              placeholder="รายละเอียดปัญหา"
              value={form.report_detail}
              onChange={(e) => setForm({ ...form, report_detail: e.target.value })}
              rows={3}
            />

            {/* สถานะ */}
            <label className="block mt-3 font-bold">สถานะ:</label>
            <select
              className="select w-full border border-gray-300 rounded px-2 py-1 mt-1"
              value={form.report_status}
              onChange={(e) => setForm({ ...form, report_status: Number(e.target.value) })}
            >
              <option value={0}>รอดำเนินการ</option>
              <option value={1}>แก้แล้ว</option>
            </select>

            {/* ปุ่ม */}
            <div className="flex justify-end gap-3 pt-5">
              <button onClick={handleSave} className="btn btn-success">บันทึก</button>
              <button onClick={() => setEditingReport(null)} className="btn btn-error">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal logs (per-report) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[900px] max-w-[95%] max-h-[90%] overflow-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold">Activity Logs for Report {modalReportId}</h3>
              <div className="flex items-center gap-2">
                <select className="select select-sm" value={modalLimit} onChange={(e) => setModalLimit(Number(e.target.value))}>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button className="btn btn-sm" onClick={() => fetchModalLogs(modalReportId)}>Refresh</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setModalOpen(false); setModalLogs([]); }}>Close</button>
              </div>
            </div>

            {modalLoading ? (
              <div className="text-center py-8"><span className="loading loading-spinner loading-lg" /></div>
            ) : (
              <div className="h-[60vh] overflow-auto">
                <table className="table table-compact w-full">
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>Action</th>
                      <th>ผู้ทำ</th>
                      <th>สรุป (before → after)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalLogs.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6">ไม่มี log</td></tr>
                    ) : (
                      modalLogs.map((l) => (
                        <tr key={l._id}>
                          <td style={{ whiteSpace: "nowrap" }}>{new Date(l.timestamp).toLocaleString("th-TH")}</td>
                          <td>{l.action}</td>
                          <td>{l.performed_by_username || l.performed_by}</td>
                          <td style={{ maxWidth: 500 }}>
                            <div className="text-xs text-gray-700">
                              <div><strong>Before:</strong> {l.before ? summarize(l.before) : '-'}</div>
                              <div className="mt-1"><strong>After:</strong> {l.after ? summarize(l.after) : '-'}</div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportTable;
