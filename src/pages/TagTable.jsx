import { useEffect, useState, useContext } from "react";

import { AuthContext } from "../context/AuthContext";
import api from "../context/api.js";
import { formatThaiDateTime } from "../utils/formatDate";
const TagTable = () => {
  const { token, role } = useContext(AuthContext);
  const [tags, setTags] = useState([]);
  const [editingTag, setEditingTag] = useState(null);
  const [form, setForm] = useState({ tag_name: "", tag_description: "", tag_status: 1 });
  const [searchName, setSearchName] = useState("");      // ✅ search ชื่อ
  const [searchCategory, setSearchCategory] = useState(""); // ✅ search หมวดหมู่

  const [status, setStatus] = useState("idle"); // "idle" | "loading"
  const [sortField, setSortField] = useState("tag_created_datetime");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'

  const categories = [
    { _id: "material", name: "วัตถุดิบ" },
    { _id: "howto", name: "วิธีปรุง" },
    { _id: "types", name: "ประเภท" },
    { _id: "healthy", name: "อาหารเพื่อสุขภาพ" },
    { _id: "snack", name: "ของว่าง" },
    { _id: "drink", name: "เครื่องดื่ม" },
  ];

  useEffect(() => {
    if (role === "1") {
      fetchTags();
    }
  }, [role]);

  const fetchTags = async () => {
    setStatus("loading");
    try {
      const res = await api.get("/api/tag/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTags(res.data);
      setStatus("idle");
    } catch (err) {
      console.error("Error fetching tags:", err.response?.data || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("คุณต้องการลบ Tag นี้หรือไม่?")) {
      try {
        await api.delete(`/api/tag/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchTags();
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const handleEdit = (tag) => {
    setEditingTag(tag._id);
    setForm({
      tag_name: tag.tag_name,
      tag_description: tag.tag_description,
      tag_status: tag.tag_status,
      tag_category_id: tag.tag_category_id,
    });
  };

  const handleAdd = () => {
    setEditingTag("new");
    setForm({ tag_name: "", tag_description: "", tag_status: 1, tag_category_id: "" });
  };

  const handleSave = async () => {
    try {
      if (editingTag === "new") {
        await api.post("/api/tag", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.put(`/api/tag/${editingTag}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setEditingTag(null);
      fetchTags();
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
    }
  };

  // ✅ กรองข้อมูลตาม searchName + searchCategory
  const filteredTags = tags.filter((t) => {
    const matchName = t.tag_name.toLowerCase().includes(searchName.toLowerCase());
    const matchCategory = searchCategory ? t.tag_category_id === searchCategory : true;
    return matchName && matchCategory;
  });

  // apply sorting
  const sortedTags = [...filteredTags];
  const compareTags = (a, b) => {
    if (sortField === "tag_created_datetime") {
      const da = a.tag_created_datetime ? new Date(a.tag_created_datetime).getTime() : 0;
      const db = b.tag_created_datetime ? new Date(b.tag_created_datetime).getTime() : 0;
      return da - db;
    }
    if (sortField === "tag_name") {
      return String(a.tag_name || "").localeCompare(String(b.tag_name || ""), "th");
    }
    if (sortField === "tag_category_id") {
      return String(a.tag_category_id || "").localeCompare(String(b.tag_category_id || ""), "th");
    }
    if (sortField === "tag_status") {
      return String(a.tag_status || "").localeCompare(String(b.tag_status || ""));
    }
    return 0;
  };
  sortedTags.sort((a, b) => (sortDir === "asc" ? compareTags(a, b) : -compareTags(a, b)));

  return (
    <div className="space-y-6">
      {/* Card 1: Filters */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold">จัดการป้ายกำกับ (Tags)</h2>
          {status === "loading" && (
          <div className="text-center">
            <span className="loading loading-lg loading-spinner"></span>
          </div>
        )}

        {status === "idle" && !tags.length && <div></div>}

          {/* ✅ ช่องค้นหา */}
          <div className="flex justify-between items-center mb-4 mt-2">
          <label className="mr-10 whitespace-nowrap font-bold">ค้นหา:</label>
          <input
            className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
            type="text"
            placeholder="ค้นหาชื่อแท็ก..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ padding: "5px", flex: 1 }}
          />
          <label className="whitespace-nowrap font-bold">
            หมวดหมู่ของแท็ก :{" "}
            <select
              className="select w-48 border border-gray-300 rounded px-2 py-1 ml-2"
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
            >
              <option value="">-- ทั้งหมด --</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          </div>
        </div>
      </div>

      {/* Card 2: Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <button onClick={handleAdd} className="btn btn-outline mb-2 w-fit">
          + เพิ่มแท็ก
        </button>
        <div className="h-96 overflow-x-auto">
          <table className="table table-s w-full table-pin-rows rounded-box bg-base-100 ">
            <thead>
              <tr className="bg-gray-200 text-primary-content rounded-t-lg ">
                <th className="first:rounded-tl-lg">
                  <button className="w-full text-left" onClick={() => { if (sortField === 'tag_category_id') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField('tag_category_id'); setSortDir('asc'); } }}>
                    หมวดหมู่ {sortField === 'tag_category_id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th>
                  <button className="w-full text-left" onClick={() => { if (sortField === 'tag_name') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField('tag_name'); setSortDir('asc'); } }}>
                    ชื่อแท็ก {sortField === 'tag_name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th>
                  <button className="w-full text-left" onClick={() => { if (sortField === 'tag_created_datetime') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField('tag_created_datetime'); setSortDir('desc'); } }}>
                    วันที่สร้าง {sortField === 'tag_created_datetime' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th>
                  <button className="w-full text-left" onClick={() => { if (sortField === 'tag_status') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField('tag_status'); setSortDir('asc'); } }}>
                    สถานะ {sortField === 'tag_status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th className="last:rounded-tr-lg">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {sortedTags.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    ไม่พบ Tag
                  </td>
                </tr>
              ) : (
                sortedTags.map((t) => (
                  <tr key={t._id}>
                    <td>
                      {categories.find((c) => c._id === t.tag_category_id)
                        ?.name || "-"}
                    </td>
                    <td>{t.tag_name}</td>
                    <td>{formatThaiDateTime(t.tag_created_datetime)}</td>
                    <td>
                      {t.tag_status === "1" ? (
                        <span className="badge badge-success text-white">Active</span>
                      ) : (
                        <span className="badge badge-ghost">Inactive</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleEdit(t)}
                        className="btn btn-outline btn-sm btn-info"
                      >แก้ไข</button>
                      <> </>
                      <button onClick={() => handleDelete(t._id)} className="btn btn-error btn-sm ml-2">ลบ</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
          <div className="mt-2 text-sm text-right">
          จำนวนทั้งหมด: {sortedTags.length} รายการ
        </div>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {editingTag && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-gray-900"
        >
          <div className="bg-gray-100 rounded-lg shadow-lg p-6 w-[400px]">
            <h3 className="text-xl font-bold">{editingTag === "new" ? "เพิ่มแท็ก" : "แก้ไขแท็ก"}</h3>
            <h3>ชื่อแท็ก</h3>
            <input
              className="input w-full border border-gray-300 rounded px-2 py-1 mb-2"
              type="text"
              placeholder="ชื่อแท็ก"
              value={form.tag_name}
              onChange={(e) => setForm({ ...form, tag_name: e.target.value })}
            />
            <h3>สถานะของแท็ก :</h3>
            <select
              className="select w-full border border-gray-300 rounded px-2 py-1 mb-2"
              value={form.tag_status}
              onChange={(e) => setForm({ ...form, tag_status: Number(e.target.value) })}
            >
              <option value={"1"}>Active</option>
              <option value={"0"}>Inactive</option>
            </select>
            <h3>หมวดหมู่ของแท็ก :</h3>
            <select
              className="select w-full border border-gray-300 rounded px-2 py-1 mb-2"
              value={form.tag_category_id}
              onChange={(e) => setForm({ ...form, tag_category_id: e.target.value })}
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select><br />
            <div className="flex justify-end gap-3 pt-3">
            <button onClick={handleSave}
            className="btn btn-success">
              บันทึก</button>
            <button onClick={() => setEditingTag(null)}
              className="btn btn-error mr-2">
              ยกเลิก
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagTable;
