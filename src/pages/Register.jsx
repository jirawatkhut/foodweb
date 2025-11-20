import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../context/api.js";

const Register = () => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    tel: "",
    email: "",
    gender: "0",
    role: "0",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = new FormData();
      data.append("first_name", form.first_name);
      data.append("last_name", form.last_name);
      data.append("username", form.username);
      data.append("password", form.password);
      data.append("tel", form.tel);
      data.append("email", form.email);
      data.append("gender", form.gender);
      data.append("role", form.role);

      if (image) {
        data.append("profileImage", image);
      }

      await api.post("/api/auth/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Register สำเร็จแล้ว! โปรด login");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-border bg-base-100 border-base-300 text-base-content p-4 rounded rounded-xl shadow-lg max-w-md mx-auto mt-5 mb-20">
      <h2 className="text-3xl font-bold mt-2 text-center">สมัครสมาชิก</h2>
      {error && <p className="text-red-500 text-center mt-2">{error}</p>}
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="flex flex-col gap-2 justify-center ml-5 mt-5">
        <legend className="fieldset-legend text-base">ชื่อ :</legend>
        <input
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="first_name"
          placeholder="ชื่อ"
          value={form.first_name}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">นามสกุล :</legend>
        <input
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="last_name"
          placeholder="นามสกุล"
          value={form.last_name}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">ชื่อผู้ใช้ :</legend>
        <input
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="username"
          placeholder="ชื่อผู้ใช้"
          value={form.username}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">รหัสผ่าน :</legend>
        <input
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="password"
          name="password"
          placeholder="รหัสผ่าน"
          value={form.password}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">เบอร์โทร :</legend>
        <input
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="tel"
          placeholder="เบอร์โทร"
          value={form.tel}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">อีเมล :</legend>
        <input
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="email"
          name="email"
          placeholder="อีเมล"
          value={form.email}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">เพศ :</legend>
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
        >
          <option value="0">ชาย</option>
          <option value="1">หญิง</option>
          <option value="2">อื่น ๆ</option>
        </select>
        
        <legend className="fieldset-legend text-base">รูปโปรไฟล์ :</legend>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
        />
        {preview && (
          <div className="mt-3 flex justify-center">
            <img src={preview} alt="preview" className="w-24 h-24 rounded-full object-cover border-2 border-blue-300" />
          </div>
        )}

        <div className="mt-4 mb-2 text-sm text-gray-500 justify-end flex gap-2">
          <button
            className="btn btn-success"
            type="submit"
            disabled={loading}
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
          <button className="btn btn-error" type="button" onClick={handleCancel}>
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;
