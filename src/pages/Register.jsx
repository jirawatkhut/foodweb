import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {

const [form, setForm] = useState({
  first_name: "",
  last_name: "",
  username: "",
  password: "",
  tel: "",
  email: "",
  image: "",
  gender: 0,
  role: 0,
});


  const [image, setimage] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setimage(e.target.files[0]);
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = new FormData();
      Object.keys(form).forEach((key) => {
        data.append(key, form[key]);
      });
      if (image) {
        data.append("image", image);
      }

      await axios.post("http://localhost:3000/api/auth/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Register สำเร็จแล้ว! โปรด login");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("Register failed");
    }
  };

  return (
    <div className="card card-border bg-base-100 border-base-300 text-base-content p-4 rounded rounded-xl shadow-lg max-w-md mx-auto mt-5 mb-20">
      <h2 className="text-3xl font-bold mt-2 text-center">สมัครสมาชิก</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="flex flex-col gap-2 justify-center ml-5 mt-5">
      <legend className="fieldset-legend text-base">ชื่อ :</legend>
        <input className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="first_name"
          placeholder="ชื่อ"
          value={form.first_name}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">นามสกุล :</legend>
        <input className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="last_name"
          placeholder="นามสกุล"
          value={form.last_name}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">ชื่อผู้ใช้ :</legend>
        <input className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="username"
          placeholder="ชื่อผู้ใช้"
          value={form.username}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">รหัสผ่าน :</legend>
        <input className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="password"
          name="password"
          placeholder="รหัสผ่าน"
          value={form.password}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">เบอร์โทร :</legend>
        <input className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="text"
          name="tel"
          placeholder="เบอร์โทร"
          value={form.tel}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">อีเมล :</legend>
        <input className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"
          type="email"
          name="email"
          placeholder="อีเมล"
          value={form.email}
          onChange={handleChange}
          required
        />
        <legend className="fieldset-legend text-base">เพศ :</legend>
        <select name="gender" value={form.gender} onChange={handleChange} className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900"> 
          <option value="0">ชาย</option>
          <option value="1">หญิง</option>
          <option value="2">อื่น ๆ</option>
        </select>
        {/* role fixed to สมาชิก; hide select in UI but keep value in form */}
        <input type="hidden" name="role" value={0} />
        <legend className="fieldset-legend text-base">รูปโปรไฟล์ :</legend>
        <input type="file" accept="image/*" onChange={handleFileChange} className="border border-gray-300 rounded px-2 py-1 mr-5 bg-white text-gray-900" />
        <br />
        <div className="mt-2 mb-2 text-sm text-gray-500 justify-end flex">
          <button className="btn btn-success"
          type="submit">สมัครสมาชิก</button>
          <button
            className="btn btn-error ml-2" 
            type="button" 
            onClick={handleCancel}
          >
            ยกเลิก
          </button>
        </div>
        
        
      </form>
    </div>
  );
};

export default Register;
