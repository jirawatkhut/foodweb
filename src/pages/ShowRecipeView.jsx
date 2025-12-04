import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

import api from "../context/api.js";
import { API } from "../context/api.js";
import { getSortedTagList } from "../utils/tagUtils";
const ShowRecipeView = () => {
  const { token, user_id } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [tags, setTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tagIdFromUrl = params.get("tag_id");
    if (tagIdFromUrl) {
      setSelectedTag(tagIdFromUrl);
    }

    fetchRecipes();
    fetchTags();
    if (token && user_id) fetchFavorites();
  }, [token, user_id, location.search]);

  // ✅ ดึงสูตรอาหารทั้งหมด (เฉพาะ Public)
  const fetchRecipes = async () => {
    try {
      const res = await api.get("/api/recipes", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setRecipes(res.data.filter((r) => r.staring_status));
    } catch (err) {
      console.error("Fetch error:", err.message);
    }
  };

  // ✅ ดึง Tag
  const fetchTags = async () => {
    try {
      const res = await api.get("/api/tag", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // API returns active tags (tag_status === "1"). Use the response directly.
      setTags(res.data);
    } catch (err) {
      console.error("Tag fetch error:", err.message);
    }
  };

  // ✅ ดึง favorite ของ user
  const fetchFavorites = async () => {
    try {
      const res = await api.get(`/api/auth/users/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(res.data.favorites || []);
    } catch (err) {
      console.error("Fetch favorites error:", err.message);
    }
  };

  // ✅ toggle favorite
  const toggleFavorite = async (recipe_id) => {
    try {
      await api.put(
        `/api/auth/users/${user_id}/favorites`,
        { recipe_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFavorites((prev) =>
        prev.includes(recipe_id)
          ? prev.filter((id) => id !== recipe_id)
          : [...prev, recipe_id]
      );
    } catch (err) {
      console.error("Toggle favorite error:", err.message);
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
    // r.tags may contain numbers; selectedTag comes from <select> as string.
    const matchTag = selectedTag
      ? Array.isArray(r.tags) && r.tags.map((x) => String(x)).includes(String(selectedTag))
      : true;
    return matchSearch && matchTag;
  });

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        🍽️ สูตรอาหารทั้งหมด
      </h1>

      {/* 🔍 Search */}
      <div className="flex justify-center mb-6">
        <input
          type="text"
          placeholder="ค้นหาสูตรอาหาร..."
          className="input input-bordered w-full max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 🏷️ Tag Filters grouped by category (dropdown  category) */}
      <div className="mb-6">

        {/* group tags by tag_category_id */}
        {(() => {
          const grouped = tags.reduce((acc, t) => {
            const key = t.tag_category_id || "other";
            if (!acc[key]) acc[key] = [];
            acc[key].push(t);
            return acc;
          }, {});

          // human-readable mapping for common category ids (fallback to id)
          const categoryLabels = {
            material: "วัตถุดิบ",
            howto: "วิธีการปรุง",
            types: "ประเภท",
            healthy: "อาหารเพื่อสุขภาพ",
            snack: "ของว่าง",
            drink: "เครื่องดื่ม",
            other: "อื่นๆ",
          };

          return (
            <div className="flex flex-wrap justify-center gap-4">
              {Object.keys(grouped).map((cat) => (
                <div key={cat} className="flex flex-col items-start">
                      <label className="text-sm mb-1">{categoryLabels[cat] || cat}</label>
                      <div className="flex items-center gap-2">
                        <select
                          className="select select-bordered select-sm w-35"
                          value={grouped[cat].some((t) => String(t.tag_id) === String(selectedTag)) ? String(selectedTag) : ""}
                          onChange={(e) => setSelectedTag(e.target.value)}
                        >
                          <option value="">-- ทั้งหมด --</option>
                          {grouped[cat].map((t) => (
                            <option key={t.tag_id} value={String(t.tag_id)}>
                              {t.tag_name}
                            </option>
                          ))}
                        </select>

                        {cat === 'types' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setSelectedTag("")}
                            title="รีเซ็ตตัวกรองเป็นทั้งหมด"
                          >
                            รีเซ็ตตัวกรอง
                          </button>
                        )}
                      </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 🧁 Recipe Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">ไม่พบสูตรอาหาร</p>
        ) : (
          filteredRecipes.map((r) => (
            <div
              key={r._id}
              className="card bg-base-100 shadow-md hover:shadow-xl cursor-pointer transition-all duration-200 relative"
            >
              {/* รูปภาพ */}
              <figure
                  onClick={() => navigate(`/recipe/${r._id}`)}
                  className="cursor-pointer"
                >
                  {r.image ? (
                    <img
                      src={`${API.endsWith('/') ? API.slice(0,-1) : API}/api/images/${r.image}`}
                      alt={r.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                      ไม่มีรูป
                    </div>
                  )}
                </figure>

              {/* ❤️ ปุ่ม Favorite */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(r._id);
                }}
                className="absolute top-3 right-3 btn btn-circle btn-sm bg-white hover:bg-pink-100"
              >
                <span
                  className={`text-xl ${
                    favorites.includes(r._id) ? "text-pink-500" : "text-gray-400"
                  }`}
                >
                  {favorites.includes(r._id) ? "❤️" : "🤍"}
                </span>
              </button>

              {/* เนื้อหา */}
              <div className="card-body" onClick={() => navigate(`/recipe/${r._id}`)}>
                <h2 className="card-title text-lg">{r.title}</h2>
                {/* ผู้สร้าง (clickable) */}
                <div className="text-sm text-gray-500">
                  {r.created_by_username ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/${r.created_by}/recipes`);
                      }}
                      className="btn btn-ghost btn-xs text-blue-500 p-0"
                    >
                      โดย: {r.created_by_username}
                    </button>
                  ) : (
                    <span>โดย: user#{r.created_by}</span>
                  )}
                </div>
                <p className="text-sm text-yellow-600">
                  ⭐ คะแนนเฉลี่ย: {r.average ? Number(r.average).toFixed(1) : "0.0"} / 5.0
                </p>
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
                <div className="flex flex-wrap gap-1 mt-2">
                  {getSortedTagList(tags, r.tags).map((tg) => (
                    <button
                      key={tg.id}
                      className="badge badge-success badge-outline text-xs hover:bg-success hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tg.found) {
                          navigate(`/showRecipes?tag_id=${tg.id}`);
                        }
                      }}
                    >
                      {tg.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShowRecipeView;
