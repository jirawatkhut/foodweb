import { useContext, useEffect, useState } from "react";
import { formatThaiDateTime } from "../utils/formatDate";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import api from "../context/api.js";

const RecipeTable = () => {
  const { token, role } = useContext(AuthContext);
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [tags, setTags] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    tags: [],
    staring_status: false,
  });
  const [ingredients, setIngredients] = useState([
    { name: "", quantity: "", unit: "" },
  ]);
  const [steps, setSteps] = useState([""]); // instructions stored as array of steps
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [tagSearch, setTagSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); 

  const [suggestedTags, setSuggestedTags] = useState([]);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
   const [status, setStatus] = useState("idle"); // "idle" | "loading"

  useEffect(() => {
    if (!token || role !== "1") {
      navigate("/");
    } else {
      fetchRecipes();
      fetchTags();
    }
  }, [token, role, navigate]);

  const fetchRecipes = async () => {
    setStatus("loading");
    try {
      const res = await api.get("/api/recipes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipes(res.data);
      setStatus("idle");
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get("/api/tag", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTags(res.data);
    } catch (err) {
      console.error("Tag fetch error:", err.response?.data || err.message);
    }
  };

  const handleTagSuggestion = () => {
  if (!form.title) {
    alert("กรุณากรอกชื่อสูตรก่อน");
    return;
  }

  const normalizedTitle = form.title.toLowerCase();
  const matchedTags = tags.filter((t) =>
    normalizedTitle.includes(t.tag_name.toLowerCase())
  );

  if (matchedTags.length > 0) {
    setSuggestedTags(matchedTags);
    setShowSuggestionModal(true);
  } else {
    alert("ไม่พบแท็กที่เกี่ยวข้องกับชื่อสูตรนี้");
  }
};

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: "", unit: "" }]);
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });;
  }
    

  const handleFile = (e) => setImage(e.target.files[0]);

  const handleCancel = () => {
    setForm({ title: "", instructions: "", tags: [] , staring_status: false });
    setIngredients([{ name: "", quantity: "", unit: "" }]);
    setImage(null);
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.title || !form.title.trim()) {
        alert("โปรดระบุชื่อสูตร");
        return;
      }
      const validSteps = steps.map((s) => (s || "").trim()).filter(Boolean);
      if (validSteps.length === 0) {
        alert("โปรดเพิ่มอย่างน้อย 1 ขั้นตอนในวิธีทำ");
        return;
      }
      const validIngredients = ingredients
        .map((it) => ({ name: (it.name || "").trim(), quantity: (it.quantity || "").toString(), unit: (it.unit || "").trim() }))
        .filter((it) => it.name && it.quantity);

      const data = new FormData();
      Object.keys(form).forEach((key) => {
        if (key === "tags") {
          form.tags.forEach((t) => data.append("tags", String(t)));
        } else if (key !== "instructions") {
          data.append(key, form[key]);
        }
      });
      const instructionsString = validSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      data.append("instructions", instructionsString);
      data.append("ingredients", JSON.stringify(validIngredients));
      if (image) data.append("image", image);

      if (editId) {
        await api.put(`/api/recipes/${editId}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await api.post("/api/recipes", data, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }
      
      setForm({ title: "", instructions: "", tags: [] , staring_status: false });
      setIngredients([{ name: "", quantity: "", unit: "" }]);
      setImage(null);
      setEditId(null);
      setShowForm(false);
      fetchRecipes();
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
    }
  };

  const handleEdit = (r) => {
    setForm({
      title: r.title,
      instructions: r.instructions,
      tags: r.tags || [],
      staring_status: r.staring_status || false,
    });
    try {
      setIngredients(
        Array.isArray(r.ingredients)
          ? r.ingredients
          : JSON.parse(r.ingredients || "[]")
      );
    } catch {
      setIngredients([{ name: "", quantity: "", unit: "" }]);
    }
    setEditId(r._id);
    setShowForm(true);
    // parse existing instructions into steps (split lines and strip numbering like '1. ')
    try {
      const lines = (r.instructions || "").split(/\r?\n/).map((ln) => ln.trim());
      const parsed = lines
        .filter(Boolean)
        .map((ln) => ln.replace(/^\s*\d+\.\s*/, ""));
      setSteps(parsed.length ? parsed : [""]);
    } catch (err) {
      console.error("Instruction parse error:", err);
      setSteps([r.instructions || ""]);
    }
  };


  const handleDelete = async (id) => {
    if (window.confirm("ลบสูตรนี้จริงหรือไม่?")) {
      await api.delete(`/api/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecipes();
    }
  };
  const filteredRecipes = recipes.filter((u) =>
    u.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="space-y-6">
      {/* Card 1: Header, Search, and Add Button */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold">จัดการสูตรอาหาร</h2>
          {status === "loading" && (
            <div className="text-center">
              <span className="loading loading-lg loading-spinner"></span>
            </div>
          )}

          {status === "idle" && !recipes.length && <div></div>}

          {/* ✅ ช่องค้นหา */}
          <div className="flex justify-between items-center mb-4 mt-2">
            <label className="mr-10 whitespace-nowrap font-bold">ค้นหา:</label>
            <input
              className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
              type="text"
              placeholder="ค้นหาชื่อสูตร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "5px", flex: 1 }}
            />
            <button onClick={() => setShowForm(true)} className="btn btn-outline mb-2">
              + เพิ่มสูตร
            </button>
          </div>
        </div>
      </div>

      {/* Popup ฟอร์มเพิ่ม/แก้ไข */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-gray-900">
          <div className="bg-gray-100 rounded-lg shadow-lg p-6 w-1/2 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">
              {editId ? "แก้ไขสูตรอาหาร" : "เพิ่มสูตรใหม่"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <legend className="text-gray-800">
                <span className="text-base font-bold">* ชื่อสูตร </span>

              </legend>
              <input
                type="text"
                name="title"
                placeholder="ชื่อสูตร"
                value={form.title}
                onChange={handleChange}
                required
                className="input w-full border border-gray-300 rounded px-2 py-1 "
              />

              <legend className="text-gray-800 text-base font-bold">* ส่วนผสม</legend>
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="ชื่อวัตถุดิบ"
                    value={ing.name}
                    onChange={(e) =>
                      handleIngredientChange(index, "name", e.target.value)
                    }
                    className="input input-bordered w-1/2"
                    required
                  />
                  <input
                      type="number"
                      placeholder="จำนวน"
                      value={ing.unit === "เล็กน้อย" ? "" : ing.quantity}
                      onChange={(e) =>
                        handleIngredientChange(index, "quantity", e.target.value)
                      }
                      className="input input-bordered w-1/4"
                      disabled={ing.unit === "เล็กน้อย"} // ❗ ปิดการใช้งานเมื่อเลือกเล็กน้อย
                      required={ing.unit !== "เล็กน้อย"} // ❗ ไม่บังคับกรอก
                    />

                    <select
                      value={ing.unit}
                      onChange={(e) => {
                        handleIngredientChange(index, "unit", e.target.value);
                        // ถ้าเลือก "เล็กน้อย" ให้ล้างค่า quantity
                        if (e.target.value === "เล็กน้อย") {
                          handleIngredientChange(index, "quantity", "");
                        }
                      }}
                      className="select select-bordered w-1/4"
                      required
                    >
                      <option value="">-- หน่วย --</option>
                      <option value="กรัม">กรัม</option>
                      <option value="ขีด">ขีด</option>
                      <option value="ช้อนโต๊ะ">ช้อนโต๊ะ</option>
                      <option value="ช้อนชา">ช้อนชา</option>
                      <option value="มิลลิลิตร">มิลลิลิตร</option>
                      <option value="ตัว">ตัว</option>
                      <option value="ถ้วย">ถ้วย</option>
                      <option value="ลูก">ลูก</option>
                      <option value="ชิ้น">ชิ้น</option>
                      <option value="แพ็ค">แพ็ค</option>
                      <option value="ขวด">ขวด</option>
                      <option value="เม็ด">เม็ด</option>
                      <option value="เล็กน้อย">เล็กน้อย</option> {/* ✅ เพิ่มอันนี้ */}
                    </select>

                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-error btn-sm"
                      onClick={() => removeIngredient(index)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredient}
                className="btn btn-outline btn-sm"
              >
                + เพิ่มส่วนผสม
              </button>

              <legend className="text-gray-800 text-base font-bold">* วิธีทำ</legend>
              <div className="space-y-3 mt-2">
                {steps.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white border">
                      {idx + 1}.
                    </div>
                    <input
                      type="text"
                      placeholder={`ขั้นตอนที่ ${idx + 1}`}
                      value={s}
                      onChange={(e) => {
                        const newSteps = [...steps];
                        newSteps[idx] = e.target.value;
                        setSteps(newSteps);
                      }}
                      required
                      className="input input-bordered rounded-full w-full"
                    />
                    {steps.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSteps([...steps, ""]) }
                >
                  + เพิ่มขั้นตอน
                </button>
              </div>

              <label className="block text-xl font-bold mb-2">
                <input
                  type="checkbox"
                  name="staring_status"
                  checked={form.staring_status}
                  onChange={handleChange}
                  className="mr-2 accent-green-500 text-xl font-bold"
                />
                ต้องการให้สูตรนี้สาธารณะ
              </label>

              {/* Tag select */}
              <div>
                <legend className="text-gray-800 text-base font-bold">
                  <span>เลือกแท็ก (สูงสุด 5 อัน)    </span>
                  <button
                type="button"
                onClick={handleTagSuggestion}
                className="btn btn-outline btn-sm btn-info"
              >
                🔍 แนะนำแท็ก
              </button>
                </legend>
                
                <input
                  type="text"
                  placeholder="ค้นหาแท็ก..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="input w-full border border-gray-300 rounded px-2 py-1 mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  {tags
                    .filter((t) =>
                      t.tag_name.toLowerCase().includes(tagSearch.toLowerCase())
                    )
                    .map((t) => (
                      <div
                        key={t.tag_id}
                        onClick={() => {
                          if (form.tags.includes(t.tag_id)) {
                            setForm({
                              ...form,
                              tags: form.tags.filter((id) => id !== t.tag_id),
                            });
                          } else if (form.tags.length < 5) {
                            setForm({
                              ...form,
                              tags: [...form.tags, t.tag_id],
                            });
                          } else {
                            alert("เลือกแท็กได้สูงสุด 5 อัน");
                          }
                        }}
                        className={`px-3 py-1 border rounded-full cursor-pointer ${
                          form.tags.includes(t.tag_id)
                            ? "bg-green-200 border-green-500"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {t.tag_name}
                      </div>
                    ))}
                </div>
              </div>

              <legend className="text-gray-800 text-base font-bold">รูปภาพประกอบ</legend>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="input w-full border border-gray-300 rounded px-2 py-1"
              />

              <div className="flex justify-end gap-3 pt-3">
                <button type="submit" className="btn btn-success">
                  {editId ? "อัปเดตสูตร" : "บันทึกสูตร"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-error ml-2"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showSuggestionModal && (
  <dialog open className="modal modal-open">
    <div className="modal-box">
      <h3 className="font-bold text-lg mb-3">🎯 แท็กที่ระบบแนะนำ</h3>
      <p className="mb-2">ระบบตรวจพบแท็กที่เกี่ยวข้องกับชื่อสูตร:</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestedTags.map((t) => (
          <span
            key={t.tag_id}
            className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full"
          >
            {t.tag_name}
          </span>
        ))}
      </div>
      <div className="modal-action">
        <button
          className="btn btn-success"
          onClick={() => {
            const newIds = suggestedTags
              .map((t) => t.tag_id)
              .filter((id) => !form.tags.includes(id));
            setForm((prev) => ({
              ...prev,
              tags: [...prev.tags, ...newIds].slice(0, 5),
            }));
            setShowSuggestionModal(false);
            setSuggestedTags([]);
          }}
        >
          ✅ ใช้แท็กเหล่านี้
        </button>
        <button
          className="btn"
          onClick={() => {
            setShowSuggestionModal(false);
            setSuggestedTags([]);
          }}
        >
          ❌ ยกเลิก
        </button>
      </div>
    </div>
  </dialog>
)}
      {/* Card 2: Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* ตารางสูตรอาหาร */}
          <div className="h-96 overflow-x-auto">
            <table className="table table-s w-full table-pin-rows rounded-box bg-base-100">
              <thead>
                <tr className="bg-blue-300 text-primary-content rounded-t-lg ">
                  <th className="first:rounded-tl-lg">ชื่อสูตร</th>
                  <th>แท็ก</th>
                  <th>ผู้สร้าง</th>
                  <th>วันที่สร้าง</th>
                  <th>สถานะ</th>
                  <th className="last:rounded-tr-lg">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center" }}>
                      ยังไม่มีสูตรอาหาร
                    </td>
                  </tr>
                ) : (
                  filteredRecipes.map((r) => (
                    <tr key={r._id}>
                      
                      <td>{r.title}</td>
                      <td>
                        {r.tags && r.tags.length > 0
                          ? r.tags
                              .map((id) => {
                                const tag = tags.find((t) => t.tag_id === id);
                                return tag ? tag.tag_name : id;
                              })
                              .join(", ")
                          : "-"}
                      </td>
                      <td>{r.created_by_username || r.created_by}</td>
                      <td>{formatThaiDateTime(r.createdAt)}</td>
                      <td>
                        {r.staring_status ? (
                          <span className="badge badge-success text-white">สาธารณะ</span>
                        ) : (
                          <span className="badge badge-ghost">ส่วนตัว</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => handleEdit(r)} className="btn btn-outline btn-sm btn-info">แก้ไข</button>
                        <button onClick={() => handleDelete(r._id)} className="btn btn-outline btn-sm btn-error ml-2">ลบ</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="mt-2 text-sm text-right">
              จำนวนทั้งหมด: {filteredRecipes.length} รายการ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeTable;
