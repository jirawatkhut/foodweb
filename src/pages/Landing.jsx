import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

import api from "../context/api.js";

const Landing = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext); // ยังคง useContext ไว้ เผื่อใช้ token สำหรับการเรียก API ที่ต้องการ
  const [hotRecipes, setHotRecipes] = useState([]);
  const [latest, setLatest] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    fetchRecipes();
    fetchTags();

  }, []); // กำหนดเป็น [] เพื่อให้เรียกเพียงครั้งเดียวเมื่อ component mount

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
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{item.title}</div>
          {item.created_by_username && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // ป้องกันไม่ให้ card's onClick ทำงาน
                navigate(`/user/${item.created_by}/recipes`);
              }}
              className="btn btn-xs btn-ghost text-blue-500"
            >
              โดย: {item.created_by_username}
            </button>
          )}
        </div>
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

  const fetchRecipes = async () => {
    try {
      // ลบ headers ออก หรือกำหนดให้เป็น {} เพื่อไม่ส่ง Authorization header
      const res = await api.get("/api/recipes", {}); // ไม่ส่ง headers หรือส่ง { headers: {} }
      const data = res.data || [];

      // กรองเฉพาะสูตรที่ Active สำหรับ Hot recipes
      const hot = data.filter((r) => r.staring_status).slice(0, 10);
      setHotRecipes(hot.length ? hot : data.slice(0, 10));

      // กรองเฉพาะสูตรที่ Active และเรียงตามวันที่
      const sortedByDate = [...data]
        .filter((r) => r.staring_status)
        .sort((a, b) => {
          const da = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const db = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return db - da;
        });
      setLatest(sortedByDate.slice(0, 10));

      // กรองเฉพาะสูตรที่ Active และเรียงตามคะแนนเฉลี่ย
      const ranked = [...data]
        .filter((r) => r.staring_status && r.average)
        .sort((a, b) => (parseFloat(b.average) || 0) - (parseFloat(a.average) || 0))
        .slice(0, 10);
      setRanking(ranked.length ? ranked : []);
    } catch (err) {
      console.error("Home fetchRecipes error:", err.message);
    }
  };

  const fetchTags = async () => {
    try {
      // ลบ headers ออก หรือกำหนดให้เป็น {} เพื่อไม่ส่ง Authorization header
      const res = await api.get("api/tag", {}); // ไม่ส่ง headers หรือส่ง { headers: {} }
      setTags(res.data || []);
    } catch (err) {
      console.error("Home fetchTags error:", err.message);
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">An Integrated Tagging System for a Food Community</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Hot recipes */}
        <section className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-2xl">เมนูยอดนิยม</h2>
            <span className="text-xs text-gray-500">เรียกดูล่าสุด</span>
          </div>
          <div className="space-y-3">
            {hotRecipes.map((r) => (
              <Card key={r._id} item={r} onNavigate={(id) => navigate(`/recipe/${id}`)} />
            ))}
          </div>
        </section>

        {/* Center: Ranking */}
        <section className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-2xl">อันดับเมนู</h2>
            <span className="text-xs text-gray-500">จัดอันดับตามคะแนน</span>
          </div>
          <div className="space-y-3">
            {ranking.map((r, idx) => (
              <div
                key={r._id}
                className="flex items-start bg-pink-50 rounded p-3 cursor-pointer hover:bg-pink-100 transition-colors"
                onClick={() => navigate(`/recipe/${r._id}`)}
              >
                <div className="w-8 h-8 rounded bg-pink-200 flex items-center justify-center font-bold mr-3 flex-shrink-0">{idx + 1}</div>
                {r.image ? (
                  <img src={`/uploads/${r.image}`} alt={r.title} className="w-24 h-20 object-cover rounded" />
                ) : (
                  <div className="w-24 h-20 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-sm rounded">
                    ไม่มีรูป
                  </div>
                )}
                <div className="flex-1 ml-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{r.title}</div>
                    {r.created_by_username && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/${r.created_by}/recipes`);
                        }}
                        className="btn btn-xs btn-ghost text-blue-500"
                      >
                        โดย: {r.created_by_username}
                      </button>
                    )}
                  </div>
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
          </div>
        </section>

        {/* Right: Latest recipes */}
        <section className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-2xl">รายการล่าสุด</h2>
            <span className="text-xs text-gray-500">อัพเดตล่าสุด</span>
          </div>
          <div className="space-y-3">
            {latest.map((r) => (
              <Card key={r._id} item={r} onNavigate={(id) => navigate(`/recipe/${id}`)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Landing;
