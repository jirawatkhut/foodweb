import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

import api from "../context/api.js";
import { formatThaiDateTime } from "../utils/formatDate";
import { API } from "../context/api.js";
import { getSortedTagList } from "../utils/tagUtils";

// --- Components ย่อยสำหรับดาว ---
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
  const { token, user_id } = useContext(AuthContext);
  const [recipe, setRecipe] = useState(null);
  const [tags, setTags] = useState([]);

  const [favorites, setFavorites] = useState([]);

  const [ratings, setRatings] = useState([]);
  const [average, setAverage] = useState(0);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [editingRating, setEditingRating] = useState(null);
  const [deletingRatingId, setDeletingRatingId] = useState(null);

  // ตรวจสอบว่า user ปัจจุบันเคยให้คะแนนไปแล้วหรือไม่
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
      const res = await api.get("/api/tag", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setTags(res.data);
    } catch (err) {
      console.error("Tag fetch error:", err.message);
    }
  };

  const fetchRatings = async () => {
    try {
      const res = await api.get(`/api/recipes/${id}/ratings`);
      setRatings(res.data.ratings);
      setAverage(res.data.average);
    } catch (err) {
      console.error("Ratings fetch error:", err.message);
    }
  };

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

  const toggleFavorite = async (recipe_id) => {
    if (!token) {
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

  const submitRating = async () => {
    try {
      if (editingRating) {
        // โหมดแก้ไข
        await api.put(
          `/api/recipes/${id}/rate`,
          { score, comment },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditingRating(null);
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
      fetchRatings(); // โหลดข้อมูลใหม่เพื่ออัปเดตรายการด้านล่าง
    } catch (err) {
      console.error("Submit rating error:", err.message);
    }
  };

  const handleEdit = (rating) => {
    setEditingRating(rating);
    setScore(rating.score);
    setComment(rating.comment);
    // เลื่อนหน้าจอขึ้นไปที่กล่องแก้ไข
    window.scrollTo({ top: document.getElementById('rating-input-section').offsetTop - 100, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRating(null);
    setScore(0);
    setComment("");
  };

  const deleteRating = async (ratingId) => {
    if (!window.confirm("ต้องการลบความคิดเห็นนี้ใช่ไหม?")) return;
    if (!token) return;

    try {
      setDeletingRatingId(ratingId);
      // Optimistic update
      setRatings((prev) => prev.filter((r) => String(r._id) !== String(ratingId)));

      await api.delete(
        `/api/recipes/${id}/rate/${ratingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAverage(() => {
        const remaining = ratings.filter((r) => String(r._id) !== String(ratingId));
        if (remaining.length === 0) return 0;
        const avg = (remaining.reduce((s, rr) => s + Number(rr.score), 0) / remaining.length).toFixed(1);
        return Number(avg);
      });
    } catch (err) {
      console.log("Delete rating error:", err.message);
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
        {/* ปุ่มกลับ */}
        <button
          className="btn btn-outline btn-sm mb-4"
          onClick={() => navigate(-1)}
        >
          ← กลับ
        </button>

        {/* --- ชื่อเมนู --- */}
        <div className="card bg-base-100 shadow-xl overflow-hidden p-4 md:p-8 flex justify-center">
          <h1 className="card-title text-3xl md:text-4xl font-bold justify-center">
            {recipe.title}
          </h1>
        </div>

        {/* --- Card แสดงรายละเอียดหลัก (รูป, ผู้เขียน, วันที่) --- */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <figure>
            {recipe.image ? (
              <img
                src={`${API.endsWith('/') ? API.slice(0, -1) : API}/api/images/${recipe.image}`}
                alt={recipe.title}
                className="w-full h-64 md:h-96 object-cover"
              />
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
              {getSortedTagList(tags, recipe.tags).map((tg) => (
                <button
                  key={tg.id}
                  className="badge badge-outline badge-success hover:bg-success hover:text-white"
                  onClick={() => {
                    if (tg.found) navigate(`/showRecipes?tag_id=${tg.id}`);
                  }}
                >
                  {tg.name}
                </button>
              ))}
            </div>

            <div className="flex items-center mt-4 text-sm text-gray-500">
              <span>
                👨‍🍳 โดย: <span className="font-semibold">{recipe.created_by_username || "ไม่ระบุชื่อ"}</span>
              </span>
              <span className="mx-2">|</span>
              <span>📅 วันที่เผยแพร่: {formatThaiDateTime(recipe.createdAt)}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 text-center">
              <div className="p-4 bg-base-200 rounded-lg">
                <div className="text-2xl">⭐</div>
                <div className="font-bold">คะแนนเฉลี่ย</div>
                <div>{Number(average).toFixed(1)} / 5.0</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Card แสดงส่วนผสมและวิธีทำ --- */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 md:p-8">
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-2">
                <h3 className="font-bold text-xl mb-4">🥦 ส่วนผสม</h3>
                {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
                  <ul className="list-disc list-inside space-y-2">
                    {recipe.ingredients.map((i, index) => (
                      <li key={index}>{i.name} - {i.quantity} {i.unit ? ` ${i.unit}` : ""}</li>
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
                    {recipe.instructions.split('\n').filter((line) => line.trim() !== "").map((step, index) => (
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

        {/* =======================================================
            SECTION 1: ส่วนให้คะแนนของผู้ใช้ (User Rating Input)
           ======================================================= */}
        <div id="rating-input-section" className="card bg-base-100 shadow-xl border-t-4 border-yellow-400">
          <div className="card-body p-4 md:p-8">
            <h3 className="font-bold text-xl mb-4">⭐ ให้คะแนนและแสดงความคิดเห็นของคุณ</h3>
            {token ? (
              <div className="mt-4 bg-white rounded-lg shadow-inner p-4 border">
                <label className="block font-medium mb-2 text-lg">
                  {editingRating ? "แก้ไขความคิดเห็นเดิม" : userHasRated ? "คะแนนของคุณ" : "ให้คะแนนสูตรนี้"}
                </label>
                
                {/* ถ้าอยู่ในโหมดแก้ไข หรือ ยังไม่เคยให้คะแนน ให้แสดงฟอร์ม */}
                {editingRating || !userHasRated ? (
                  <>
                    <StarRating rating={score} setRating={setScore} />
                    <textarea
                      className="textarea textarea-bordered w-full mt-3 h-24"
                      placeholder="บอกเราว่าคุณคิดอย่างไรกับสูตรนี้..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength="150"
                    ></textarea>
                    <div className="text-right text-sm text-gray-500">
                      {comment.length} / 150
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-success text-white" onClick={submitRating}>
                        {editingRating ? "บันทึกการแก้ไข" : "ส่งความคิดเห็น"}
                      </button>
                      {editingRating && (
                        <button className="btn btn-ghost" onClick={cancelEdit}>
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* ถ้าเคยให้คะแนนแล้ว ให้แสดงคะแนนที่ให้ไป */
                  <div className="mt-2">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg w-fit">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <ReadOnlyStar key={s} filled={s <= (myRating?.score || 0)} />
                      ))}
                      <span className="ml-2 font-bold text-lg text-gray-700">{(myRating?.score || 0).toFixed(1)}/5.0</span>
                    </div>
                    {myRating?.comment && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg border-l-4 border-yellow-400">
                        <p className="font-semibold text-gray-700">ความคิดเห็นของคุณ:</p>
                        <p className="mt-1 text-gray-600">{myRating.comment}</p>
                      </div>
                    )}
                    <button className="btn btn-link btn-sm p-0 mt-4 text-gray-500 hover:text-yellow-600" onClick={() => handleEdit(myRating)}>
                      ✏️ แก้ไขคะแนนของคุณ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-warning shadow-lg">
                <div>
                  <span>กรุณา <a href="/login" className="link font-bold underline">เข้าสู่ระบบ</a> เพื่อให้คะแนนและแสดงความคิดเห็น</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =======================================================
            SECTION 2: ส่วนแสดงความคิดเห็นทั้งหมด (All Comments List)
           ======================================================= */}
        <div className="card bg-base-100 shadow-xl border-t-4 border-blue-400">
          <div className="card-body p-4 md:p-8">
            <h4 className="font-bold text-xl mb-6 flex items-center gap-2">
              💬 ความคิดเห็นทั้งหมด 
              <span className="badge badge-primary badge-lg">{ratings.length}</span>
            </h4>
            
            {ratings.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border-dashed border-2 border-gray-300">
                <p className="text-gray-500 text-lg">ยังไม่มีความคิดเห็นสำหรับสูตรนี้</p>
                <p className="text-gray-400 text-sm mt-2">เป็นคนแรกที่ให้คะแนนเลย!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ratings.map((r) => (
                  <div
                    key={r._id}
                    className="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow flex justify-between items-start"
                  >
                    <div className="w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <p className="font-bold text-sm">
                            {r.username || `user#${r.user_id.slice(-4)}`}
                          </p>
                          <p className="text-xs text-gray-400">{formatThaiDateTime(r.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex mb-2">
                         {[1, 2, 3, 4, 5].map(s => <ReadOnlyStar key={s} filled={s <= r.score} />)}
                      </div>
                      
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                        {r.comment || "ไม่มีความคิดเห็น"}
                      </p>
                    </div>

                    {/* ปุ่มจัดการสำหรับเจ้าของคอมเมนต์ */}
                    {String(r.user_id) === String(user_id) && (
                      <div className="flex flex-col gap-2 ml-4">
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
                          {String(deletingRatingId) === String(r._id) ? '...' : 'ลบ'}
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
  );
};

export default RecipeDetailPage;