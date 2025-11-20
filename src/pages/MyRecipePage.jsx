import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { set } from "mongoose";

const MyRecipePage = () => {
  const { token, user_id, logout } = useContext(AuthContext);
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
  const [steps, setSteps] = useState([""]); // instructions as steps
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const [suggestedTags, setSuggestedTags] = useState([]);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);


  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const fetchAllData = async () => {
    try {
      // 1. Fetch all public recipes to calculate tag popularity
      const allRecipesRes = await axios.get("http://localhost:3000/api/recipes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const publicRecipes = allRecipesRes.data.filter(r => r.staring_status);

      // 2. Fetch user's recipes
      fetchRecipes();

      // 3. Fetch tags and sort them by popularity
      fetchTags(publicRecipes);
    } catch (err) {
      console.error("Error fetching initial data:", err);
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        try { logout(); } catch {}
        navigate("/login");
      }
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/recipes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipes(res.data.filter((r) => r.created_by === user_id));
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        try { logout(); } catch {}
        navigate("/login");
      }
    }
  };

  const fetchTags = async (allRecipes) => {
    try {
      const res = await axios.get("http://localhost:3000/api/tag", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedTags = res.data;

      // Calculate tag usage counts from all public recipes
      const tagCounts = allRecipes.reduce((acc, recipe) => {
        if (recipe.tags) {
          recipe.tags.forEach(tagId => {
            acc[tagId] = (acc[tagId] || 0) + 1;
          });
        }
        return acc;
      }, {});

      // Sort tags by popularity
      const sortedTags = [...fetchedTags].sort((a, b) => (tagCounts[b.tag_id] || 0) - (tagCounts[a.tag_id] || 0));

      setTags(sortedTags);
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

  // 🧂 ส่วนผสม dynamic
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

  // 📋 จัดการช่องทั่วไป
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFile = (e) => setImage(e.target.files[0]);

  const handleCancel = () => {
    setForm({
      title: "",
      instructions: "",
      tags: [],
      staring_status: false,
    });
    setIngredients([{ name: "", quantity: "", unit: "" }]);
    setImage(null);
    setEditId(null);
    setSteps([""]);
    setShowForm(false);
  };
  // 💾 บันทึกสูตร
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Basic client-side validation
      if (!form.title || !form.title.trim()) {
        alert("โปรดระบุชื่อสูตร");
        return;
      }
      // filter out empty steps
      const validSteps = steps.map((s) => (s || "").trim()).filter(Boolean);
      if (validSteps.length === 0) {
        alert("โปรดเพิ่มอย่างน้อย 1 ขั้นตอนในวิธีทำ");
        return;
      }
      // filter out incomplete ingredients
      const validIngredients = ingredients
        .map((it) => ({ name: (it.name || "").trim(), quantity: (it.quantity || "").toString(), unit: (it.unit || "").trim() }))
        .filter((it) => it.name && (it.quantity || it.unit === "เล็กน้อย"));

      const data = new FormData();
      // append non-instructions fields
      Object.keys(form).forEach((key) => {
        if (key === "tags") {
          // append as strings
          form.tags.forEach((t) => data.append("tags", String(t)));
        } else if (key !== "instructions") {
          data.append(key, form[key]);
        }
      });
      // build instructions string from validSteps
      const instructionsString = validSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      data.append("instructions", instructionsString);
      data.append("ingredients", JSON.stringify(validIngredients));
      if (image) data.append("image", image);

      // Ensure user is authenticated before submitting
      if (!token) {
        alert("กรุณาเข้าสู่ระบบก่อนทำการบันทึกสูตร");
        navigate("/login");
        return;
      }

      if (editId) {
        await axios.put(`http://localhost:3000/api/recipes/${editId}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
            // Let axios set Content-Type with proper boundary for multipart
          },
        });
      } else {
        await axios.post("http://localhost:3000/api/recipes", data, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      setForm({
        title: "",
        instructions: "",
        tags: [],
        staring_status: false,
      });
      setIngredients([{ name: "", quantity: "", unit: "" }]);
      setImage(null);
      setEditId(null);
      setSteps([""]);
      setShowForm(false);
      fetchRecipes();
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.response?.data || err.message;
      // If token invalid or expired, force logout and redirect to login
      if (status === 401 || status === 403) {
        alert("เซสชันหมดอายุหรือไม่ถูกต้อง โปรดเข้าสู่ระบบใหม่");
        try { logout(); } catch {}
        navigate("/login");
        return;
      }
      alert(`Save error: ${JSON.stringify(msg)}`);
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
    // parse instructions into steps
    try {
      const lines = (r.instructions || "").split(/\r?\n/).map((ln) => ln.trim());
      const parsed = lines.filter(Boolean).map((ln) => ln.replace(/^\s*\d+\.\s*/, ""));
      setSteps(parsed.length ? parsed : [""]);
    } catch {
      setSteps([r.instructions || ""]);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("ลบสูตรนี้จริงหรือไม่?")) {
      try {
        await axios.delete(`http://localhost:3000/api/recipes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchRecipes();
      } catch (err) {
        console.error("Delete error:", err.response?.data || err.message);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          try { logout(); } catch {}
          navigate("/login");
          return;
        }
        alert("ลบสูตรไม่สำเร็จ");
      }
    }
  };

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen ">
      <h2 className="text-3xl font-bold mb-6 text-center">คลังสูตรอาหารของฉัน 🍳</h2>

      {/* ค้นหา + ปุ่มเพิ่มสูตร */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label>ค้นหา :</label>
          <input
            type="text"
            placeholder="ค้นหาสูตรอาหาร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full sm:w-64 border border-gray-300 rounded px-2 py-1 "
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-neutral btn-outline"
        >
          + เพิ่มสูตร
        </button>
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

      {/* แสดงสูตรเป็น Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {filteredRecipes.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">
            ไม่พบสูตรอาหาร
          </p>
        ) : (
          filteredRecipes.map((r) => (
            <div
              key={r._id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200"
            >
              <div className="relative">
                {r.image ? (
                  <img
                    src={`/uploads/${r.image}`}
                    alt={r.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                    ไม่มีรูป
                  </div>
                )}
                <span
                  className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full shadow ${
                    r.staring_status
                      ? "bg-green-500 text-white"
                      : "bg-gray-500 text-white"
                  }`}
                >
                  {r.staring_status ? "สาธารณะ" : "ส่วนตัว"}
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {r.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {r.tags && r.tags.length > 0 ? (
                    r.tags.map((id) => {
                      const tag = tags.find((t) => t.tag_id === id);
                      return (
                        <span
                          key={id}
                          className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full"
                        >
                          {tag ? tag.tag_name : id}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-gray-400 text-sm">ไม่มีแท็ก</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>ส่วนผสม:</strong>{" "}
                  {Array.isArray(r.ingredients)
                    ? r.ingredients
                        .map(
                          (i) =>
                            `${i.name} ${i.quantity}${i.unit ? " " + i.unit : ""}`
                        )
                        .join(", ")
                    : r.ingredients}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  <strong>วิธีทำ:</strong> {r.instructions}
                </p>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(r)}
                    className="btn btn-info btn-outline"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="btn btn-error btn-outline"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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
    </div>
  );
};

export default MyRecipePage;
