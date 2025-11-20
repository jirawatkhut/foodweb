import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import api from "../context/api.js";
const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // clear inline status message when user edits inputs
    setStatusMessage({ type: "", text: "" });
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // clear previous messages
    setStatusMessage({ type: "", text: "" });
    try {
      const res = await api.post("/api/auth/login", form);

      // backend ส่งกลับ: { token, role, username, image }
      const { token, role, username, image ,user_id } = res.data;

      // ส่งค่าครบให้ AuthContext
      login(token, role, username, image ,user_id );

      // show inline success message and navigate shortly after so user sees it
      const msg = "เข้าสู่ระบบสำเร็จแล้ว!";
      setStatusMessage({ type: "success", text: msg });
      console.log("File uploaded:", username);  // 👈 debug
      const path = role === "1" ? "/admin" : "/";
      setTimeout(() => navigate(path), 700);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "เข้าสู่ระบบล้มเหลว";
      setStatusMessage({ type: "error", text: String(msg) });
    }
  };

  return (
    
    <div className="card card-border bg-base-100 border-base-300 text-base-content p-4 rounded rounded-xl shadow-lg max-w-md mx-auto mt-10">
      
      <h2 className="text-3xl font-bold mt-2 text-center">เข้าสู่ระบบ</h2>
      {/* inline status message (shown under password input) */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 justify-center items-center mt-5 ">
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xl">ชื่อผู้ใช้</legend>
          <label className="input validator">
            <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </g>
              </svg>
              
          <input className="input-md px-5 py-1"
                type="text"
                name="username"
                placeholder="ชื่อผู้ใช้"
                pattern="[A-Za-z][A-Za-z0-9\-]*"
                title="Only letters, numbers or dash"
                value={form.username}
                onChange={handleChange}
                required/>
          </label>
          <legend className="fieldset-legend text-xl">รหัสผ่าน</legend>
          <label className="input validator">
            <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
                  ></path>
                  <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
                </g>
              </svg>
          <input className="input-md px-5 py-1"
                type="password"
                name="password"
                placeholder="รหัสผ่าน"
                value={form.password}
                onChange={handleChange}
                required/>
          </label>
          {statusMessage.text && (
            <div className={`mt-2 text-sm ${statusMessage.type === "error" ? "text-red-600" : "text-green-600"}`}>
              {statusMessage.text}
            </div>
          )}
        </fieldset>
        <br />
        <div className="p-2 text-center">
            <button className="btn btn-success"
            type="submit">เข้าสู่ระบบ</button>
            <button
            className="btn btn-error m-2" 
            type="button" 
            onClick={handleCancel}
          >ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
