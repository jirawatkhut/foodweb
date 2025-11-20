import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";


const UserTable = () => {
  const { token, role } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({});
  const [searchTerm, setSearchTerm] = useState(""); // ✅ state สำหรับค้นหา

  const [status, setStatus] = useState("idle"); // "idle" | "loading"

  useEffect(() => {
    if (role === "1") {
      fetchUsers();
    }
  }, [role]);

  const fetchUsers = async () => {
    setStatus("loading");
    try {
      const res = await axios.get("http://localhost:3000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setStatus("idle");
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm("คุณต้องการลบผู้ใช้นี้หรือไม่ (จะเปลี่ยนสถานะเป็น Inactive และไม่สามารถใช้งานได้)?")) return;

    // require admin token
    if (!token) {
      alert("ต้องเป็นผู้ดูแลระบบเพื่อดำเนินการนี้");
      return;
    }

    try {
      // Call backend to mark user status = "0" (inactive) using user_id
      await axios.put(
        `http://localhost:3000/api/auth/users/${user.user_id}/status`,
        { status: "0" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from UI so they can't use the site (DB still keeps the user)
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch (err) {
      console.error("Error setting user inactive:", err.response?.data || err.message);
      alert("ล้มเหลวในการเปลี่ยนสถานะผู้ใช้ โปรดลองอีกครั้ง");
    }
  };

  const handleEdit = (user) => {
  setEditingUser(user.user_id);
  setForm({
    username: user.username,
    status: user.status,
    role: user.role,
  });
};

  const handleSave = async () => {
  try {
    await axios.put(
      `http://localhost:3000/api/auth/users/${editingUser}`,
      {
        status: form.status,
        role: form.role,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setEditingUser(null);
    fetchUsers();
  } catch (err) {
    console.error("Update error:", err.response?.data || err.message);
  }
};
  // ✅ ฟิลเตอร์ผู้ใช้ตาม username
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Card 1: Filters */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold">จัดการทะเบียนผู้ใช้</h2>
          {status === "loading" && (
            <div className="text-center">
              <span className="loading loading-lg loading-spinner"></span>
            </div>
          )}

          {status === "idle" && !users.length && <div></div>}

          {/* ช่องค้นหา */}
          <div className="flex justify-between items-center mb-4 mt-2">
            <label className="mr-10 whitespace-nowrap font-bold">ค้นหา:</label>
            <input
              className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "5px", flex: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Card 2: Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="h-96 overflow-x-auto">
            <table className="table table-s w-full table-pin-rows rounded-box bg-base-100">
        <thead>
          <tr className="bg-green-100 text-primary-content rounded-t-lg ">
            <th className="first:rounded-tl-lg">ชื่อผู้ใช้</th>
            <th>ประเภทของผู้ใช้งาน</th>
            <th>สถานะ</th>
            <th className="last:rounded-tr-lg">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ textAlign: "center" }}>
                ไม่พบผู้ใช้
              </td>
            </tr>
          ) : (
            filteredUsers.map((u) => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.role === "1" ? "Admin" : "Member"}</td>
                <td>
                  {u.status === "1" ? (
                    <span className="badge badge-success text-white">Active</span>
                  ) : (
                    <span className="badge badge-ghost">Inactive</span>
                  )}
                </td>
                <td>
                  <button onClick={() => handleEdit(u)}
                    className="btn btn-outline btn-sm btn-info"
                    >แก้ไข</button>
                  <> </>
                  <button onClick={() => handleDelete(u)}
                    className="btn btn-outline btn-sm btn-error"
                    >ลบ</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
          </div>
          <div className="mt-2 text-sm text-right">
            จำนวนทั้งหมด: {filteredUsers.length} รายการ
          </div>
        </div>
      </div>
      {editingUser && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-gray-900"
        >
          <div
            className="bg-gray-100 rounded-lg shadow-lg p-6 w-[400px]"
          >
            <h3 className="text-xl font-bold">แก้ไข Role & Status</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold mt-2">Username:</span> {form.username || "-"}</p>
            </div>
            <div className="mt-4">
              <label>ตำเเหน่ง :</label>
              <select
                className="select w-48 border border-gray-300 rounded px-2 py-1 ml-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                
              >
                <option value={"0"}>Member</option>
                <option value={"1"}>Admin</option>
              </select>
            </div>

            <div className="mt-4">
              <label>สถานะ :</label>
              <select
                className="select w-48 border border-gray-300 rounded px-2 py-1 ml-2"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                
              >
                <option value={"1"}>Active</option>
                <option value={"0"}>Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={handleSave}
                className="btn btn-success">
                บันทึก</button>
              <button onClick={() => setEditingUser(null)}
                className="btn btn-error ml-2">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;
