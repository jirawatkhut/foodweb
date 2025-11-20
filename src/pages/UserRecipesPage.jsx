import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import api from "../context/api.js";
import { getImageUrl } from "../context/api.js";
const UserRecipesPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all recipes (public endpoint)
        const recipesRes = await api.get("/api/recipes");

        // Filter recipes by the user and public (staring_status) flag
        // Note: created_by in backend is numeric; ensure numeric comparison
        const userRecipes = recipesRes.data.filter(
          (r) => Number(r.created_by) === Number(userId) && r.staring_status
        );
        setRecipes(userRecipes);

        // Derive user info from recipes if possible (recipes route includes created_by_username)
        if (userRecipes.length > 0) {
          setUser({ username: userRecipes[0].created_by_username });
        } else {
          // No public recipes found for this user - still show a fallback username
          setUser({ username: `user#${userId}` });
        }
      } catch (err) {
        console.error("Error fetching user recipes:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-lg loading-spinner"></span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center mt-10">
        <h1 className="text-2xl font-bold">ไม่พบผู้ใช้งาน</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <button
        className="btn btn-outline btn-sm mb-4"
        onClick={() => navigate(-1)}
      >
        ← กลับ
      </button>
      <h1 className="text-3xl font-bold text-center mb-8">
        สูตรอาหารทั้งหมดของ {user.username}
      </h1>

      {recipes.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          ผู้ใช้คนนี้ยังไม่มีสูตรอาหารที่เป็นสาธารณะ
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((r) => (
            <div
              key={r._id}
              className="card bg-base-100 shadow-md hover:shadow-xl cursor-pointer transition-all duration-200"
              onClick={() => navigate(`/recipe/${r._id}`)}
            >
              <figure>
                {r.image ? (
                  <img
                    src={getImageUrl(r.image)}
                    alt={r.title}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="w-full h-56 bg-gray-200 flex items-center justify-center text-gray-500">
                    ไม่มีรูปภาพ
                  </div>
                )}
              </figure>
              <div className="card-body">
                <h2 className="card-title">{r.title}</h2>
                <p className="text-sm text-yellow-600">
                  ⭐ คะแนนเฉลี่ย: {r.average ? Number(r.average).toFixed(1) : "0.0"} / 5.0
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserRecipesPage;