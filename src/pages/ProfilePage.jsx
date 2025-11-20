import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import api from "../context/api.js";
import { AuthContext } from "../context/AuthContext";

const ProfilePage = () => {
  const { token, user_id } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({});
  const [userRecipes, setUserRecipes] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    tel: "",
    image: null,
  });
  const [resetForm, setResetForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [preview, setPreview] = useState(null);

  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagEdit, setShowTagEdit] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  // ดึงข้อมูลผู้ใช้ + แท็กจากฐานข้อมูล
  useEffect(() => {
    const fetchProfileAndTags = async () => {
      try {
        if (!user_id) return;

        const [profileRes, tagRes, recipesRes] = await Promise.all([
          api.get(`/api/auth/users/${user_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/tag", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/recipes"),
        ]);

        setProfile(profileRes.data);
        setTags(tagRes.data);

        // Filter user's recipes
        const filteredRecipes = recipesRes.data.filter(
          (recipe) => recipe.created_by === user_id
        );
        setUserRecipes(filteredRecipes);

        if (profileRes.data.interested_tags?.length > 0) {
          const mapped = profileRes.data.interested_tags
            .map((id) => tagRes.data.find((t) => t.tag_id === id))
            .filter(Boolean);
          setSelectedTags(mapped);
        }
      } catch (err) {
        console.error("Error fetching profile/tags/recipes:", err);
      }
    };
    fetchProfileAndTags();
  }, [user_id, token]);

  // เปิด popup แก้ไขข้อมูล
  const handleOpenEdit = () => {
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      email: profile.email || "",
      tel: profile.tel || "",
      image: null,
    });
    setPreview(profile.image ? `/uploads/${profile.image}` : null);
    setShowEdit(true);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setForm({ ...form, image: file });
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(form).forEach((k) => form[k] && formData.append(k, form[k]));
      await api.put(
        `/api/auth/users/${user_id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert("อัปเดตข้อมูลเรียบร้อยแล้ว");
      setShowEdit(false);
      window.location.reload();
    } catch {
      alert("ไม่สามารถอัปเดตข้อมูลได้");
    }
  };

  // ✅ ระบบรีเซ็ตรหัสผ่าน
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (resetForm.newPassword !== resetForm.confirmPassword)
      return alert("รหัสผ่านใหม่ไม่ตรงกัน");

    try {
      await api.put(
        `/api/auth/users/${user_id}/password`,
        resetForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("รีเซ็ตรหัสผ่านเรียบร้อยแล้ว");
      setShowReset(false);
      setResetForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      alert(err.response?.data?.message || "ไม่สามารถรีเซ็ตรหัสผ่านได้");
    }
  };

  // ✅ ระบบ Tag
  const handleSelectTag = (tag) => {
    if (selectedTags.find((t) => t.tag_id === tag.tag_id)) return;
    if (selectedTags.length >= 5) {
      alert("เลือกได้สูงสุด 5 tag เท่านั้น");
      return;
    }
    setSelectedTags([...selectedTags, tag]);
  };

  const handleRemoveTag = (id) =>
    setSelectedTags(selectedTags.filter((t) => t.tag_id !== id));

  const handleSaveTags = async () => {
    try {
      await api.put(
        `/api/auth/users/${user_id}/tags`,
        { interested_tags: selectedTags.map((t) => t.tag_id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("บันทึก Tag ที่สนใจเรียบร้อยแล้ว");
      window.location.reload();
    } catch {
      alert("ไม่สามารถบันทึก Tag ได้");
    }
  };

  // ✅ ส่วนแสดงผล
  const Card = ({ item, onNavigate }) => (
    <div
      className="flex bg-pink-50 rounded shadow-sm p-2 items-start cursor-pointer hover:bg-pink-100 transition-colors"
      onClick={() => onNavigate(item._id)}
    >
      {item.image ? (
        <img src={`/uploads/${item.image}`} alt={item.title} className="w-24 h-20 object-cover rounded" />
      ) : (
        <div className="w-24 h-20 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-sm rounded">
          ไม่มีรูป
        </div>
      )}
   
      <div className="ml-3 flex-1">
      <h1 className="font-bold text-lg">{item.title}</h1>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map((id) => {
            const tag = tags.find((t) => t.tag_id === id);
            return (
              <button
                key={id}
                className="badge badge-success badge-outline text-xs hover:bg-success hover:text-white"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card's onClick from firing
                  if (tag) {
                    navigate(`/showRecipes?tag_id=${tag.tag_id}`);
                  }
                }}
              >
                {tag ? tag.tag_name : id}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-yellow-600">
                    ⭐ คะแนนเฉลี่ย: {item.average ? Number(item.average).toFixed(1) : "0.0"} / 5.0
        </p>
      </div>
    </div>
  );
  return (
    <div className="text-black flex flex-col items-center py-10 gap-8">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-2xl">
        <div className="flex items-center gap-6 mb-6">
          {profile.image ? (
            <img
              src={`/uploads/${profile.image}`}
              alt="profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
              ไม่มีรูป
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{profile.username}</h2>
            <p className="text-gray-600">{profile.email}</p>
            <p className="text-gray-600">{profile.tel}</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleOpenEdit}
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
              >
                แก้ไขข้อมูลส่วนตัว
              </button>
              <button
                onClick={() => setShowReset(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                รีเซ็ตรหัสผ่าน
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Tag section */}
        <div className="border-t pt-5">
          <h3 className="text-lg font-semibold mb-2">
            Tag ที่คุณสนใจ
            <button
              onClick={() => setShowTagEdit(!showTagEdit)}
              className="ml-3 text-sm text-indigo-600 hover:underline"
            >
              {showTagEdit ? "ปิด" : "แก้ไข"}
            </button>
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <span
                  key={tag.tag_id}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center"
                >
                  {tag.tag_name}
                  {showTagEdit && (
                    <button
                      onClick={() => handleRemoveTag(tag.tag_id)}
                      className="ml-2 text-red-500 font-bold"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-gray-500">ยังไม่ได้เลือก</span>
            )}
          </div>

          {showTagEdit && (
            <div>
              <input
                list="tag-suggestions"
                placeholder="พิมพ์เพื่อค้นหา หรือเลือก Tag..."
                onInput={(e) => {
                  const value = e.target.value;
                  setTagSearch(value);

                  const matchedTag = tags.find(
                    (tag) => tag.tag_name.toLowerCase() === value.toLowerCase()
                  );

                  if (matchedTag) {
                    handleSelectTag(matchedTag);
                    setTagSearch("");
                    e.target.value = "";
                  }
                }}
                className="border rounded-md p-2 w-full"
                disabled={selectedTags.length >= 5}
              />
              <datalist id="tag-suggestions">
                {tags
                  .filter(
                    (tag) =>
                      !selectedTags.find(
                        (selected) => selected.tag_id === tag.tag_id
                      ) && tag.tag_name.toLowerCase().includes(tagSearch.toLowerCase())
                  )
                  .map((tag) => (
                    <option key={tag.tag_id} value={tag.tag_name} />
                  ))}
              </datalist>
              {selectedTags.length >= 5 && (
                <p className="text-red-500 text-sm mt-1">
                  คุณเลือกได้สูงสุด 5 tag เท่านั้น
                </p>
              )}
              <button
                onClick={handleSaveTags}
                className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                บันทึก Tag ที่สนใจ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User's Recipes */}
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">เมนูของฉัน</h3>
        <div className="space-y-3">
          {userRecipes.length > 0 ? (
            userRecipes.map((recipe) => (
              <Card key={recipe._id} item={recipe} onNavigate={(id) => navigate(`/recipe/${id}`)} />
            ))
          ) : (
            <p className="text-gray-500">คุณยังไม่มีเมนูที่สร้าง</p>
          )}
        </div>
      </div>

      {/* ✅ Popup แก้ไขข้อมูล */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-10 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">แก้ไขข้อมูลส่วนตัว</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label>ชื่อ :</label>
              <input
                type="text"
                name="first_name"
                placeholder="ชื่อ"
                value={form.first_name}
                onChange={handleChange}
                className="border p-2 w-full rounded-md"
              />
              <label>นามสกุล :</label>
              <input
                type="text"
                name="last_name"
                placeholder="นามสกุล"
                value={form.last_name}
                onChange={handleChange}
                className="border p-2 w-full rounded-md"
              />
              <label>อีเมล :</label>
              <input
                type="email"
                name="email"
                placeholder="อีเมล"
                value={form.email}
                onChange={handleChange}
                className="border p-2 w-full rounded-md"
              />
              <label>เบอร์โทร :</label>
              <input
                type="tel"
                name="tel"
                placeholder="เบอร์โทร"
                value={form.tel}
                onChange={handleChange}
                className="border p-2 w-full rounded-md"
              />
              <label>รูปโปรไฟล์ :</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full"
              />
              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  className="mt-2 w-24 h-24 rounded-full object-cover border"
                />
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Popup รีเซ็ตรหัสผ่าน */}
      {showReset && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-10 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">รีเซ็ตรหัสผ่าน</h3>
            <form onSubmit={handleResetSubmit} className="space-y-3">
            <legend>กรอกรหัสผ่านเดิม</legend>
              <input
                type="password"
                placeholder="รหัสผ่านเดิม"
                value={resetForm.oldPassword}
                onChange={(e) =>
                  setResetForm({ ...resetForm, oldPassword: e.target.value })
                }
                className="border p-2 w-full rounded-md"
                required
              />
              <legend>กรอกรหัสผ่านใหม่</legend>
              <input
                type="password"
                placeholder="รหัสผ่านใหม่"
                value={resetForm.newPassword}
                onChange={(e) =>
                  setResetForm({ ...resetForm, newPassword: e.target.value })
                }
                className="border p-2 w-full rounded-md"
                required
              />
              <legend>ยืนยันรหัสผ่านใหม่</legend>
              <input
                type="password"
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={resetForm.confirmPassword}
                onChange={(e) =>
                  setResetForm({
                    ...resetForm,
                    confirmPassword: e.target.value,
                  })
                }
                className="border p-2 w-full rounded-md"
                required
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
