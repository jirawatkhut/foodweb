import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import api from "../context/api.js";
import { getImageUrl } from "../context/api.js";
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
  const favoriteRecipes = recipes.filter((r) => favorites.includes(r._id));

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
                  src={r.image ? getImageUrl(r.image) : "/no-image.jpg"}
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
                  {r.tags.map((id) => {
                      const tag = tags.find((t) => t.tag_id === id);
                      return (
                        <button
                          key={id}
                          className="badge badge-success badge-outline text-xs hover:bg-success hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritePage;
