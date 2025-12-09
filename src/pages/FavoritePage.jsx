import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import api from "../context/api.js";
import { API } from "../context/api.js";
import { getSortedTagList } from "../utils/tagUtils";
const FavoritePage = () => {
  const { token, user_id } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [tags, setTags] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (token && user_id) {
      fetchFavorites();
      fetchRecipes();
      fetchTags();
    }
  }, [token, user_id]);

  // ✅ ดึงข้อมูล favorite ของ user
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

  // ✅ ดึงสูตรอาหารทั้งหมด (เฉพาะ Public)
  const fetchRecipes = async () => {
    try {
      const res = await api.get("/api/recipes", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setRecipes(res.data.filter((r) => r.staring_status));
    } catch (err) {
      console.error("Fetch recipes error:", err.message);
    }
  };

  // ✅ ดึง Tag
  const fetchTags = async () => {
    try {
      const res = await api.get("/api/tag", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setTags(res.data.filter((t) => t.status !== "Inactive"));
    } catch (err) {
      console.error("Tag fetch error:", err.message);
    }
  };

  // ✅ toggle favorite (เพิ่ม/เอาออก)
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

  // ✅ กรองเฉพาะสูตรที่อยู่ใน favorites
  // Build a map of favorite timestamps or indices so we can sort by "most recently favorited"
  const favTimeMap = new Map();
  if (Array.isArray(favorites) && favorites.length > 0) {
    if (typeof favorites[0] === "object") {
      // favorites may be objects like { recipe_id, addedAt }
      favorites.forEach((f, idx) => {
        const id = String(f.recipe_id || f.recipeId || f.id || f._id || "");
        const ts = f.addedAt || f.timestamp || f.createdAt || f.added_at || f.created_at || f.ts || f.time || null;
        const time = ts ? new Date(ts).getTime() : idx; // fallback to index
        if (id) favTimeMap.set(id, time);
      });
    } else {
      // favorites is likely an array of ids (strings). Use array index as fallback ordering (assume later indices = newer)
      favorites.forEach((id, idx) => favTimeMap.set(String(id), idx));
    }
  }

  const favoriteRecipes = recipes
    .filter((r) => favTimeMap.has(String(r._id)))
    .sort((a, b) => (favTimeMap.get(String(b._id)) || 0) - (favTimeMap.get(String(a._id)) || 0));

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        รายการโปรดของคุณ ❤️ 
      </h1>

      {favoriteRecipes.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          ยังไม่มีสูตรอาหารที่ถูกใจ 🍽️
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteRecipes.map((r) => (
            <div
              key={r._id}
              className="card bg-base-100 shadow-md hover:shadow-xl cursor-pointer transition-all duration-200 relative"
            >
              {/* รูปภาพ */}
              <figure onClick={() => navigate(`/recipe/${r._id}`)}>
                <img
                  src={r.image ? `${API.endsWith('/') ? API.slice(0,-1) : API}/api/images/${r.image}` : "/no-image.jpg"}
                  alt={r.title}
                  className="w-full h-56 object-cover"
                />
              </figure>

              {/* ❤️ ปุ่ม toggle favorite */}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritePage;
