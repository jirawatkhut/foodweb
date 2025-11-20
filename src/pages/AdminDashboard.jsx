import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, FileText, Tag, AlertCircle } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const StatCard = ({ title, value, subtitle, icon, iconBg = "bg-gray-200 text-gray-700" }) => (
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full">
    <div className="flex items-center justify-between h-full">
      <div className="flex-1">
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2">{value?.toLocaleString?.() ?? value}</p>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-4 rounded-full ${iconBg} flex items-center justify-center ml-4`}>
        {icon}
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { token, role } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRecipes: 0,
    totalTags: 0,
    pendingReports: 0,
  });

  const [popularRecipes, setPopularRecipes] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [topTags, setTopTags] = useState([]);

  useEffect(() => {
    if (role !== "1") return setLoading(false);
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Users (admin endpoint)
      const usersRes = await axios.get("http://localhost:3000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = usersRes.data || [];

      // Recipes
      const recipesRes = await axios.get("http://localhost:3000/api/recipes");
      const recipes = recipesRes.data || [];

      // Tags (admin - all tags)
      const tagsRes = await axios.get("http://localhost:3000/api/tag/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tags = tagsRes.data || [];

      // Reports
      const reportsRes = await axios.get("http://localhost:3000/api/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reports = reportsRes.data || [];

      // derive reports by category
      const reportsByCategoryMap = {};
      reports.forEach((r) => {
        const cat = r.report_category || "อื่นๆ";
        reportsByCategoryMap[cat] = (reportsByCategoryMap[cat] || 0) + 1;
      });
      const reportsByCategory = Object.entries(reportsByCategoryMap).map(([category, count]) => ({ category, count }));


      // Compute stats
      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.status === "1").length;
      const totalRecipes = recipes.length;
      const totalTags = tags.length;
      const pendingReports = reports.filter((r) => Number(r.report_status) === 0).length;

      setStats({ totalUsers, activeUsers, totalRecipes, totalTags, pendingReports });

      // Popular recipes: use number of ratings (descending)
      const popular = recipes
        .map((r) => ({ id: r._id || r.recipe_id, name: r.title || r.name || "Untitled", ratings: r.ratings || [] }))
        .sort((a, b) => (b.ratings?.length || 0) - (a.ratings?.length || 0))
        .slice(0, 8);
      setPopularRecipes(popular);

      // Top contributors: count recipes per user_id
      const counts = {};
      recipes.forEach((r) => {
        const uid = r.created_by;
        counts[uid] = (counts[uid] || 0) + 1;
      });
      const contributors = Object.entries(counts)
        .map(([user_id, recipes_count]) => {
          const u = users.find((x) => Number(x.user_id) === Number(user_id));
          return { user_id, name: u ? u.username : `user#${user_id}`, recipes: recipes_count };
        })
        .sort((a, b) => b.recipes - a.recipes)
        .slice(0, 8);
      setTopContributors(contributors);

      // Top tags: count usage across recipes
      const tagCounts = {};
      recipes.forEach((r) => {
        (r.tags || []).forEach((t) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      });
      const tagsByCount = Object.entries(tagCounts)
        .map(([tag_id, count]) => {
          const t = tags.find((x) => Number(x.tag_id) === Number(tag_id));
          return { tag_id, name: t ? t.tag_name : `tag#${tag_id}`, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setTopTags(tagsByCount);
      // attach derived charts data to state
      setReportsByCategory(reportsByCategory);
      setRecipesOverTime(computeRecipesOverTime(recipes));
    } catch (err) {
      console.error("Admin dashboard fetch error:", err.response?.data || err.message || err);
      // don't crash the UI; show partial data
    } finally {
      setLoading(false);
    }
  };

  // helper: compute recipes per month (YYYY-MM)
  const computeRecipesOverTime = (recipes) => {
    const map = {};
    (recipes || []).forEach((r) => {
      const d = r.createdAt ? new Date(r.createdAt) : r.createdAt;
      if (!d || isNaN(new Date(d).getTime())) return;
      const dt = new Date(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([k, v]) => ({ period: k, count: v }))
      .sort((a, b) => (a.period > b.period ? 1 : -1));
  };

  // charts state
  const [reportsByCategory, setReportsByCategory] = useState([]);
  const [recipesOverTime, setRecipesOverTime] = useState([]);

  // derived for quick summary
  const lastMonthCount = recipesOverTime.length ? Number(recipesOverTime[recipesOverTime.length - 1].count || 0) : 0;
  const prevMonthCount = recipesOverTime.length > 1 ? Number(recipesOverTime[recipesOverTime.length - 2].count || 0) : 0;
  const recipeDelta = lastMonthCount - prevMonthCount;
  const recipeDeltaPct = prevMonthCount ? Math.round((recipeDelta / prevMonthCount) * 100) : null;
  const topTagName = topTags && topTags.length ? topTags[0].name : "-";
  const topTagCount = topTags && topTags.length ? topTags[0].count : 0;
  const topContributorName = topContributors && topContributors.length ? topContributors[0].name : "-";
  const topContributorCount = topContributors && topContributors.length ? topContributors[0].recipes : 0;

  // total reports (for caption percentages)
  const reportsTotal = (reportsByCategory || []).reduce((s, e) => s + (Number(e.count) || 0), 0);

  if (role !== "1") {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto bg-white rounded p-6">
          <h2 className="text-xl font-bold">หน้าแดชบอร์ด (สำหรับผู้ดูแลระบบ)</h2>
          <p className="mt-4">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 rounded">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">หน้าแดชบอร์ด (สำหรับผู้ดูแลระบบ)</h1>
          <p className="text-gray-600 mt-2">ภาพรวมสถิติของระบบ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-stretch">
          <StatCard
            title="ผู้ใช้ทั้งหมด"
            value={stats.totalUsers}
            subtitle={`Active: ${stats.activeUsers}`}
            icon={<Users className="w-6 h-6" />}
            iconBg="bg-blue-500 text-white"
          />
          <StatCard
            title="สูตรอาหารทั้งหมด"
            value={stats.totalRecipes}
            icon={<FileText className="w-6 h-6" />}
            iconBg="bg-yellow-500 text-white"
          />
          <StatCard
            title="แท็กทั้งหมด"
            value={stats.totalTags}
            icon={<Tag className="w-6 h-6" />}
            iconBg="bg-green-500 text-white"
          />
          <StatCard
            title="รายงานที่รอตรวจสอบ"
            value={stats.pendingReports}
            icon={<AlertCircle className="w-6 h-6" />}
            iconBg="bg-red-500 text-white"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">สูตรอาหารยอดนิยม (จากจำนวนการให้คะแนน)</h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center"><span className="loading loading-spinner loading-md" /></div>
              ) : popularRecipes.length ? (
                popularRecipes.map((r, idx) => (
                  <div key={r.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold text-sm mr-3">{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-800">{r.name}</p>
                        <p className="text-sm text-gray-500">คะแนน: {(r.ratings || []).length}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">ไม่มีข้อมูล</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">ผู้ใช้ดีเด่น (จำนวนสูตร)</h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center"><span className="loading loading-spinner loading-md" /></div>
              ) : topContributors.length ? (
                topContributors.map((u, idx) => (
                  <div key={u.user_id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-full font-bold text-sm mr-3">{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-800">{u.name}</p>
                        <p className="text-sm text-gray-500">{u.recipes} สูตร</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">ไม่มีข้อมูล</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">แท็กยอดนิยม</h2>
            <div style={{ width: "100%", height: 250 }}>
              {loading ? (
                <div className="text-center"><span className="loading loading-spinner loading-md" /></div>
              ) : topTags.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topTags} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                      <YAxis label={{ value: 'จำนวน', angle: -90, position: 'insideLeft', offset: 8 }} />
                    <Tooltip formatter={(value) => [value, 'จำนวนสูตร']} />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center">ไม่มีข้อมูล</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">รายงานตามหมวดหมู่</h2>
            <div style={{ width: "100%", minHeight: 320 }} className="flex flex-col items-center justify-start">
              {loading ? (
                <div className="text-center"><span className="loading loading-spinner loading-md" /></div>
              ) : reportsByCategory.length ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={reportsByCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} label>
                        {reportsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="mt-4 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {reportsByCategory.map((entry, index) => {
                        const pct = reportsTotal ? Math.round((Number(entry.count) / reportsTotal) * 100) : 0;
                        return (
                          <div key={entry.category} className="flex items-center gap-2 px-2 py-1">
                            <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[index % COLORS.length] }} />
                            <span className="text-sm text-gray-700">{entry.category}</span>
                            <span className="ml-auto text-sm text-gray-500">{entry.count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center">ไม่มีข้อมูล</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">จำนวนสูตรที่เพิ่มมาในเเต่ละเดือน</h2>
            <div style={{ width: "100%", minHeight: 320 }} className="flex flex-col items-center">
              {loading ? (
                <div className="text-center"><span className="loading loading-spinner loading-md" /></div>
              ) : recipesOverTime.length ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={recipesOverTime} margin={{ top: 20, right: 20, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                    <XAxis dataKey="period" interval={0} tick={{ fontSize: 12 }} label={{ value: 'เวลา (เดือน)', position: 'bottom', offset: 12 }} />
                    <YAxis label={{ value: 'จำนวนสูตร', angle: -90, position: 'insideLeft', offset: 8 }} allowDecimals={false} />
                    <Tooltip formatter={(value) => [value, 'จำนวนสูตร']} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center">ไม่มีข้อมูล</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">สรุปด่วน</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">ผู้ใช้ทั้งหมด</div>
                  <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString?.() ?? stats.totalUsers}</div>
                  <div className="text-xs text-gray-400">Active: {stats.activeUsers}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">สูตรทั้งหมด</div>
                  <div className="text-2xl font-bold">{stats.totalRecipes.toLocaleString?.() ?? stats.totalRecipes}</div>
                  <div className={`text-xs ${recipeDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {recipeDelta >= 0 ? `+${recipeDelta}` : recipeDelta} {recipeDeltaPct !== null ? `(${recipeDeltaPct}%)` : ''} จากเดือนล่าสุด
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">แท็กทั้งหมด</div>
                  <div className="text-2xl font-bold">{stats.totalTags.toLocaleString?.() ?? stats.totalTags}</div>
                  <div className="text-xs text-gray-600">Top: {topTagName} ({topTagCount})</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">รายงานรอตรวจสอบ</div>
                  <div className="text-2xl font-bold">{stats.pendingReports.toLocaleString?.() ?? stats.pendingReports}</div>
                  <div className="text-xs text-gray-600">Top contributor: {topContributorName} ({topContributorCount})</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
