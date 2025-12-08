import { useEffect, useState, useContext } from "react";

import { AuthContext } from "../context/AuthContext";
import api from "../context/api.js";
import { formatThaiDate } from "../utils/dateUtils";
const Report = () => {
  const { token, role, user_id } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [editingReport, setEditingReport] = useState(null);
  const [form, setForm] = useState({ report_name: "", report_category: "", report_detail: "", report_status: 0 });
  const [filterCategory, setFilterCategory] = useState("");

  const [status, setStatus] = useState("idle"); // "idle" | "loading"
  const [sortConfig, setSortConfig] = useState({ key: "report_createdAt", direction: "desc" });

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
    if (token){
      fetchReports();
    }
    }, [role]);

  const fetchReports = async () => {
    setStatus("loading");
    try {
      const res = await api.get("/api/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const my = (res.data || []).filter((r) => r.created_by === user_id).slice().sort((a,b) => new Date(b.report_createdAt) - new Date(a.report_createdAt));
      setReports(my);
      setStatus("idle");
    } catch (err) {
      console.error("Error fetching reports:", err.response?.data || err.message);
    }
  };
  
  const handleAdd = () => {
    setEditingReport("new");
    setForm({ report_name: "", report_category: "", report_detail: "", report_status: 0 });
  };

  const handleSave = async () => {
    if (!form.report_category) {
      alert("กรุณาเลือกหมวดหมู่ก่อนบันทึก!");
      return; // ไม่ส่ง request
    }
    try {
      if (editingReport === "new") {
        // require a report name
        if (!form.report_name || !form.report_name.trim()) {
          alert("กรุณาระบุหัวข้อรายงาน (Report name)");
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

  const displayedReports = filteredReports.slice().sort((a,b) => {
    const key = sortConfig.key;
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    if (key === "report_createdAt") return dir * (new Date(b.report_createdAt) - new Date(a.report_createdAt));
    if (key === "report_name") return dir * String(a.report_name).localeCompare(String(b.report_name), "th");
    return 0;
  });

  const handleSort = (key) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));

  return (
    
    <div className="rounded">
      <h2 className="text-2xl font-bold mb-4">รายงานปัญหา</h2>
      <p className="text-sm text-gray-600 mb-3">รายการนี้แสดงรายงานที่คุณส่ง — สามารถเพิ่มหรือแก้ไข และติดตามสถานะได้ที่นี่</p>
      {status === "loading" && (
        <div className="text-center">
          <span className="loading loading-lg loading-spinner"></span>
        </div>
      )}
      

      {status === "idle" && !reports.length && (
        <div></div>
      )}

      {/* Dropdown filter ด้านบน */}
      <div className="flex justify-between items-center mb-4">
        <button className="btn btn-outline" onClick={handleAdd}>➕ รายงานปัญหา</button>
        <div className="flex items-center space-x-2"> 
        <label className="whitespace-nowrap font-bold">
            หมวดหมู่ปัญหา :
        </label>
        
        <select value={filterCategory} onChange={((e) => setFilterCategory(e.target.value))} className="select w-48">
            {categories.map(((c) => (
                <option key={c.id} value={c.id}>
                    {c.name}
                </option>
            )))}
        </select>
    </div>
      </div>
      

      {/* ตาราง */}
      <table className="table table-s w-full rounded-box bg-base-100" >
        <thead >
          <tr>
            <th onClick={() => handleSort('report_category')} style={{ cursor: 'pointer' }}>หมวดหมู่</th>
            <th onClick={() => handleSort('report_name')} style={{ cursor: 'pointer' }}>หัวข้อ</th>
            <th>ผู้เแจ้ง</th>
            <th onClick={() => handleSort('report_createdAt')} style={{ cursor: 'pointer' }}>วันที่แจ้ง</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600">
          {displayedReports.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-4">
                ไม่พบข้อมูล
              </td>
            </tr>
          ) : (
            displayedReports.map((r) => (
              <tr key={r._id}>
                <td>{r.report_category}</td>
                <td className="font-medium">{r.report_name}</td>
                <td>{r.created_by_username || r.created_by}</td>
                <td>{formatThaiDate(r.report_createdAt, true)}</td>
                <td>{r.report_status === 1 ? "แก้แล้ว" : "รอดำเนินการ"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-2 text-sm text-right">
       จำนวนทั้งหมด: {filteredReports.length} รายการ
      </div>

      {/* Modal Add/Edit */}
      {editingReport && (
        
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-gray-900"
        >
          <div className="bg-gray-100 rounded-lg shadow-lg p-6 w-[400px]">
            <label className="text-xl font-bold">{editingReport === "new" ? "รายงานปัญหา" : "แก้ไข Report"}</label>
            <br />
            <legend class="fieldset-legend text-gray-800">* ชื่อหัวข้อ (ชื่อรายงาน)</legend>
            <input className="input w-full bg-white mb-2" placeholder="ชื่อหัวข้อรายงาน"
              value={form.report_name}
              onChange={(e) => setForm({ ...form, report_name: e.target.value })}
            />

            <legend class="fieldset-legend text-gray-800">* เลือกหัวข้อที่ต้องการแจ้ง</legend>
            <select className="select w-48 bg-white"
              value={form.report_category}
              onChange={(e) => setForm({ ...form, report_category: e.target.value })}
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories
                .filter((c) => c.id !== "") // ตัด option "ทั้งหมด"
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select><br />
            <legend className="fieldset-legend text-gray-800">* กรอกข้อมูลที่ต้องการแจ้ง</legend>
            <textarea className="textarea h-24 bg-white"
              placeholder="รายละเอียด"
              value={form.report_detail}
              onChange={(e) => setForm({ ...form, report_detail: e.target.value })}
              rows={3}
            /><br />
            <div className="label text-xs">Optional</div>
            
            <br />
            <button onClick={handleSave} className="btn btn-success">บันทึก</button>
            <button onClick={() => setEditingReport(null)} className="btn btn-error m-2">
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
