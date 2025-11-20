import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

import api from "../context/api.js";
import Image from "../components/Image";

const Star = ({ filled, onClick }) => (
  <svg
    onClick={onClick}
    className={`w-8 h-8 cursor-pointer ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
  </svg>
);

const ReadOnlyStar = ({ filled }) => (
  <svg
    className={`w-6 h-6 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
  </svg>
);

const StarRating = ({ rating, setRating }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center">
      <span className="mr-2">น้อย</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => setRating(star)}
        >
          <Star filled={star <= (hoverRating || rating)} />
        </div>
      ))}
      <span className="ml-2">มาก</span>
    </div>
  );
};

const RecipeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token ,user_id} = useContext(AuthContext);
  const [recipe, setRecipe] = useState(null);
  const [tags, setTags] = useState([]);

  const [favorites, setFavorites] = useState([]);

  const [ratings, setRatings] = useState([]);
  const [average, setAverage] = useState(0);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [editingRating, setEditingRating] = useState(null); // เพิ่ม state สำหรับการแก้ไข
  const [deletingRatingId, setDeletingRatingId] = useState(null);

  // derived: whether current user already rated this recipe
  const myRating = ratings.find((r) => String(r.user_id) === String(user_id));
  const userHasRated = !!myRating;

  useEffect(() => {
    fetchRecipe();
    fetchTags();
    fetchRatings();
    if (token && user_id) fetchFavorites();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const res = await api.get(`/api/recipes/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setRecipe(res.data);

    } catch (err) {
      console.error("Fetch error:", err.message);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get("/api/tag",{
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
      setTags(res.data);
    } catch (err) {
      console.error("Tag fetch error:", err.message);
    }
  };

  // ดึงคะแนนทั้งหมด
const fetchRatings = async () => {
  try {
    const res = await api.get(`/api/recipes/${id}/ratings`);
    setRatings(res.data.ratings);
    setAverage(res.data.average);
    console.log("Fetched ratings:", res.data);
  } catch (err) {
    console.error("Ratings fetch error:", err.message);
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
  if (!token) {
    // redirect to login if not authenticated
    navigate('/login');
    return;
  }
  try {
    await api.put(
      `/api/auth/users/${user_id}/favorites`,
      { recipe_id },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setFavorites((prev) =>
      prev.includes(recipe_id) ? prev.filter((id) => id !== recipe_id) : [...prev, recipe_id]
    );
  } catch (err) {
    console.error("Toggle favorite error:", err.message);
  }
};

// ส่งความคิดเห็น
const submitRating = async () => {
  try {
    if (editingRating) {
      // โหมดแก้ไข
      await api.put(
        `/api/recipes/${id}/rate`,
        { score, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingRating(null); // ออกจากโหมดแก้ไข
    } else {
      // โหมดสร้างใหม่
      await api.post(
        `/api/recipes/${id}/rate`,
        { score, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
    setComment("");
    setScore(0);
    fetchRatings();
  } catch (err) {
    console.error("Submit rating error:", err.message);
  }
};

const handleEdit = (rating) => {
  setEditingRating(rating);
  setScore(rating.score);
  setComment(rating.comment);
};

const cancelEdit = () => {
  setEditingRating(null);
  setScore(0);
  setComment("");
};

const deleteRating = async (ratingId) => {
  if (!window.confirm("ต้องการลบความคิดเห็นนี้ใช่ไหม?")) return;
  if (!token) {
    alert("ต้องล็อกอินเพื่อดำเนินการ");
    return;
  }

  try {
    setDeletingRatingId(ratingId);
    // Optimistic removal: remove from UI immediately
    setRatings((prev) => prev.filter((r) => String(r._id) !== String(ratingId)));

    await api.delete(
      `/api/recipes/${id}/rate/${ratingId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Recalculate average locally from remaining ratings
    setAverage(() => {
      const remaining = ratings.filter((r) => String(r._id) !== String(ratingId));
      if (remaining.length === 0) return 0;
      const avg = (remaining.reduce((s, rr) => s + Number(rr.score), 0) / remaining.length).toFixed(1);
      return Number(avg);
    });
  } catch (err) {
    console.log("Delete rating error:", err.message);
    // If deletion failed, refetch to restore state
    fetchRatings();
    alert("ลบความคิดเห็นไม่สำเร็จ โปรดลองอีกครั้ง");
  } finally {
    setDeletingRatingId(null);
  }
};


  if (!recipe)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        กำลังโหลดข้อมูล...
      </div>
    );

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          className="btn btn-outline btn-sm mb-4"
          onClick={() => navigate(-1)}
        >
          ← กลับ
        </button>
        <div className="card bg-base-100 shadow-xl overflow-hidden p-4 md:p-8 flex justify-center">
        <h1 className="card-title text-3xl md:text-4xl font-bold justify-center">
              {recipe.title}
        </h1>
        </div>
        {/* --- Main Recipe Card --- */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <figure>
            {recipe.image ? (
              <Image image={recipe.image} alt={recipe.title} className="w-full h-64 md:h-96 object-cover" />
            ) : (
              <div className="w-full h-64 md:h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                ไม่มีรูปภาพ
              </div>
            )}
          </figure>

          <div className="card-body p-4 md:p-8">
            <div className="flex items-start justify-between w-full">
              <h1 className="card-title text-3xl md:text-4xl font-bold">
                {recipe.title}
              </h1>

              <div className="ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(recipe._id);
                  }}
                  className="btn btn-ghost btn-sm"
                  title={favorites.includes(recipe._id) ? "เอาออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
                >
                  <span className={`text-2xl ${favorites.includes(recipe._id) ? 'text-pink-500' : 'text-gray-400'}`}>
                    {favorites.includes(recipe._id) ? '❤️' : '🤍'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {recipe.tags.map((id) => {
                const tag = tags.find((t) => t.tag_id === id);
                return (
                  <button
                    key={id}
                    className="badge badge-outline badge-success hover:bg-success hover:text-white"
                    onClick={() => {
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

            <div className="flex items-center mt-4 text-sm text-gray-500">
              <span>
                👨‍🍳 โดย:{" "}
                <span className="font-semibold">
                  {recipe.created_by_username || "ไม่ระบุชื่อ"}
                </span>
              </span>
              <span className="mx-2">|</span>
              <span>
                📅 วันที่เผยแพร่:{" "}
                {new Date(recipe.createdAt).toLocaleDateString("th-TH")}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 text-center">
              <div className="p-4 bg-base-200 rounded-lg">
                <div className="text-2xl">⭐</div>
                <div className="font-bold">คะแนน</div>
                <div>{Number(average).toFixed(1)} / 5.0</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Ingredients & Instructions Card --- */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 md:p-8">
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-2">
                <h3 className="font-bold text-xl mb-4">🥦 ส่วนผสม</h3>
                {Array.isArray(recipe.ingredients) &&
                recipe.ingredients.length > 0 ? (
                  <ul className="list-disc list-inside space-y-2">
                    {recipe.ingredients.map((i, index) => (
                      <li key={index}>
                        {i.name} - {i.quantity}
                        {i.unit ? ` ${i.unit}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>ไม่มีข้อมูลส่วนผสม</p>
                )}
              </div>
              <div className="md:col-span-3">
                <h3 className="font-bold text-xl mb-4">🍳 วิธีทำ</h3>
                {recipe.instructions ? (
                  <ol className="space-y-4">
                    {recipe.instructions
                      .split('\n')
                      .filter((line) => line.trim() !== "")
                      .map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                  </ol>
                ) : (
                  <p>ไม่มีข้อมูลวิธีทำ</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- Ratings & Comments Card --- */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 md:p-8">
            <h3 className="font-bold text-xl mb-4">⭐ ให้คะแนนและแสดงความคิดเห็น</h3>
            {token ? (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <label className="block font-medium mb-2">
                  {editingRating ? "แก้ไขความคิดเห็น" : userHasRated ? "คะแนนของคุณ" : "ให้คะแนนสูตรนี้"}
                </label>
                {editingRating || !userHasRated ? (
                  <>
                    <StarRating rating={score} setRating={setScore} />
                    <textarea
                      className="textarea textarea-bordered w-full mt-3"
                      placeholder="บอกเราว่าคุณคิดอย่างไร..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength="150"
                    ></textarea>
                    <div className="text-right text-sm text-gray-500">
                      {comment.length} / 150
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-success" onClick={submitRating}>
                        {editingRating ? "อัปเดต" : "ส่งความคิดเห็น"}
                      </button>
                      {editingRating && (
                        <button className="btn btn-ghost" onClick={cancelEdit}>
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <ReadOnlyStar key={s} filled={s <= (myRating?.score || 0)} />
                      ))}
                      <span className="ml-2 font-semibold">{(myRating?.score || 0).toFixed(1)}/5.0</span>
                    </div>
                    {myRating?.comment && (
                      <p className="mt-2 p-3 bg-base-100 rounded-md">ความคิดเห็นของคุณ: {myRating.comment}</p>
                    )}
                    <button className="btn btn-link btn-sm p-0 mt-2" onClick={() => handleEdit(myRating)}>แก้ไขคะแนนของคุณ</button>
                  </div>
                )}
              </div>
            ) : (
              <p>กรุณา <a href="/login" className="link">เข้าสู่ระบบ</a> เพื่อให้คะแนนและแสดงความคิดเห็น</p>
            )}

            <div className="mt-8">
              <h4 className="font-bold text-lg mb-4">💬 ความคิดเห็นทั้งหมด ({ratings.length})</h4>
              {ratings.length === 0 ? (
                <p className="text-gray-500">ยังไม่มีความคิดเห็นสำหรับสูตรนี้</p>
              ) : (
                <div className="space-y-4">
                  {ratings.map((r) => (
                    <div
                      key={r._id}
                      className="p-4 rounded-lg bg-base-200 flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {r.username || `user#${r.user_id.slice(-4)}`}
                          </p>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(s => <ReadOnlyStar key={s} filled={s <= r.score} />)}
                          </div>
                        </div>
                        <p className="mt-1">{r.comment}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleString("th-TH")}</p>
                      </div>

                      {String(r.user_id) === String(user_id) && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            className="btn btn-xs btn-outline btn-warning"
                            onClick={() => handleEdit(r)}
                          >
                            แก้ไข
                          </button>
                          <button
                            className="btn btn-xs btn-error text-white"
                            onClick={() => deleteRating(r._id)}
                            disabled={String(deletingRatingId) === String(r._id)}
                          >
                            {String(deletingRatingId) === String(r._id) ? 'กำลังลบ...' : 'ลบ'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RecipeDetailPage;
