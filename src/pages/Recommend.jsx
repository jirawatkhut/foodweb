import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Recommend = () => {
  const { token, user_id } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [tags, setTags] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [interestedTags, setInterestedTags] = useState([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecipes();
    fetchTags();
    if (token && user_id) {
      fetchFavorites();
      fetchInterestedTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user_id]);

  const fetchRecipes = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/recipes", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = res.data.filter((r) => r.staring_status);
      setRecipes(data);
    } catch (err) {
      console.error("Recommend fetchRecipes error:", err.message);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/tag", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setTags(res.data.filter((t) => t.status !== "Inactive"));
    } catch (err) {
      console.error("Recommend fetchTags error:", err.message);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/auth/users/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(res.data.favorites || []);
    } catch (err) {
      console.error("Recommend fetchFavorites error:", err.message);
    }
  };

  const fetchInterestedTags = async () => {
    if (!token || !user_id) return;
    try {
      const res = await axios.get(`http://localhost:3000/api/auth/users/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterestedTags(res.data.interested_tags || []);
      setSelectedTags(res.data.interested_tags || []); // Also set the filter to user's tags
    } catch (err) {
      console.error("Recommend fetchInterestedTags error:", err.message);
    }
  };

  // compute recommendations whenever recipes or favorites change
  useEffect(() => {
    computeRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, favorites, interestedTags]);

  const computeRecommendations = () => {
    if (!recipes || recipes.length === 0) return setRecommended([]);

    // If user has interested tags, recommend by them
    if (interestedTags && interestedTags.length > 0) {
      const recommendedByTags = recipes.filter(r => 
        (r.tags || []).some(t => interestedTags.includes(t))
      );
      return setRecommended(recommendedByTags);
    }

    // fallback: top-rated recipes
    const topRated = [...recipes]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 12);
    setRecommended(topRated);
  };

  const handleSaveTags = async () => {
    if (!token || !user_id) return alert("กรุณาเข้าสู่ระบบ");
    try {
      await axios.put(
        `http://localhost:3000/api/auth/users/${user_id}/tags`,
        { interested_tags: selectedTags },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("บันทึก Tag ที่สนใจเรียบร้อยแล้ว");
      fetchInterestedTags(); // Re-fetch to sync state and recommendations
      setTagDropdownOpen(false); // Close dropdown on save
    } catch (err) {
      alert("ไม่สามารถบันทึก Tag ได้");
    }
  };

  

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <h1 className="text-4xl font-bold text-center mb-4 ">สูตรอาหารเเนะนำสำหรับคุณ</h1>

      {/* Tag selector + sort row */}
      <li>โปรดเลือกแท็กที่คุณสนใจ</li>
      <div className="max-w-screen-xl mx-auto mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <div
            className="input input-bordered w-full flex items-center justify-between cursor-pointer"
            onClick={() => setTagDropdownOpen((s) => !s)}
            role="button"
          >
            <div className="truncate">
              {selectedTags.length === 0
                ? "แท็กที่คุณสนใจ : ทั้งหมด"
                : selectedTags
                    .map((id) => (tags.find((t) => t.tag_id === id) || { tag_name: id }).tag_name)
                    .join(", ")}
            </div>
            <div className="pl-2">+</div>
          </div>

          {tagDropdownOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white rounded shadow p-3">
              <div className="flex flex-col max-h-48 overflow-auto">
                {tags.map((t) => (
                  <label key={t.tag_id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(t.tag_id)}
                      onChange={() => {
                        setSelectedTags((prev) => {
                          if (prev.includes(t.tag_id)) return prev.filter((id) => id !== t.tag_id);
                          if (prev.length >= 5) return prev; // limit 5
                          return [...prev, t.tag_id];
                        });
                      }}
                    />
                    <span className="text-sm">{t.tag_name}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">* แท็กสามารถเลือกได้มากสุด 5 แท็ก *</div>
              <button
                onClick={handleSaveTags}
                className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                บันทึก Tag ที่สนใจ
              </button>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm">เรียงจาก</label>
          <select
            className="select select-sm select-bordered"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="latest">ล่าสุด</option>
            <option value="rating">คะแนน</option>
          </select>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto mb-4">
        <div className="text-sm text-gray-600">ผลลัพธ์ที่ได้จากหา "{selectedTags.map(id => (tags.find(t => t.tag_id === id) || {tag_name: id}).tag_name).join(', ') || 'ทั้งหมด'}"</div>
      </div>

      <div className="max-w-screen-xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommended.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">ไม่พบคำแนะนำในขณะนี้</p>
        ) : (
          (() => {
            // apply tag filter and sort
            let items = [...recommended];
            if (selectedTags.length > 0) {
              items = items.filter((r) => (r.tags || []).some((t) => selectedTags.includes(t)));
            }
            if (sortBy === "latest") {
              items.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
            } else if (sortBy === "rating") {
              items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            }

            // render items and placeholders to keep layout consistent
            
            return (
              <>
                {items.map((r) => (
                  <div
                    key={r._id}
                    className="card bg-base-100 shadow-md hover:shadow-xl cursor-pointer transition-all duration-200 relative"
                  >
          <figure>
            {r.image ? (
              <img
                src={`/uploads/${r.image}`}
                alt={r.title}
                className="w-full h-56 object-cover"
              />
            ) : (
              <div className="w-full h-56 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                ไม่มีรูปภาพ
              </div>
            )}
          </figure>



                    <div className="card-body" onClick={() => navigate(`/recipe/${r._id}`)}>
                      <h2 className="card-title text-lg">{r.title}</h2>
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
                      <p className="text-sm text-yellow-600">
                  ⭐ คะแนนเฉลี่ย: {r.average ? Number(r.average).toFixed(1) : "0.0"} / 5.0
                      </p>
                    </div>
                  </div>

                ))}

                
              </>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default Recommend;