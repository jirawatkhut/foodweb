import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { token, role, username, image, logout  } = useContext(AuthContext); 
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef();
  //console.log("File uploaded:", username);
  // ปิด dropdown ถ้าคลิกนอก
  useEffect(() => {
    
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (confirm("คุณต้องการออกจากระบบหรือไม่?")) {
      setOpenMenu(false);
      logout();
      navigate("/");
    }
  };

  const isActive = (path) => {
    if (!path) return false;
    // exact match or startsWith for base routes
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
      <div className="flex-1">
        {/* ไอคอนโลโก้ */}
        <label className="swap swap-rotate">
          <svg
            className="swap-off h-10 w-10 fill-current opacity-1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24">
            <path
              d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
          </svg>
        </label>
        {!(token && role === "1") && (
          <Link to="/" className={isActive('/') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            หน้าแรก
          </Link>
        )}

        {/* admin เห็น Dashboard */}
        {token && role === "1" && (
          <>
          <Link to="/admin" className={isActive('/admin') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            แดชบอร์ด
          </Link>
          <Link to="/recipeTable" className={isActive('/recipeTable') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            จัดการสูตรอาหาร
          </Link>
          <Link to="/tagTable" className={isActive('/tagTable') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            จัดการป้ายกำกับ
          </Link>
          <Link to="/userTable" className={isActive('/userTable') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            จัดการทะเบียนผู้ใช้
          </Link>
          <Link to="/reportTable" className={isActive('/reportTable') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            จัดการปัญหา
          </Link>
          </>
        )}

        {/* member เห็นเมนู สูตรอาหาร */}
        {token && role === "0" && (
          <>
          <Link to="/showRecipes" className={isActive('/showRecipes') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            สูตรอาหารทั้งหมด
          </Link>
          <Link to="/myRecipes" className={isActive('/myRecipes') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            คลังสูตรอาหารของฉัน
          </Link>
          <Link to="/recommend" className={isActive('/recommend') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            สูตรอาหารแนะนำ
          </Link>
          <Link to="/favorites" className={isActive('/favorites') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            รายการโปรด
          </Link>
          <Link to="/report" className={isActive('/report') ? 'btn btn-neutral' : 'btn btn-ghost'}>
            รายงานปัญหา
          </Link>
          </>
        )}
        
      </div>

      <div>
        {!token ? (
          <>
            <Link to="/login" className="btn btn-ghost">
              เข้าสู่ระบบ
            </Link>
            <Link to="/register" className="btn btn-ghost">
              สมัครสมาชิก
            </Link>
          </>
        ) : (
          <div style={{ position: "relative" }} ref={menuRef}>
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setOpenMenu(!openMenu)}
            >
              <img
                 src={
                 image
                   ? `/uploads/${image}`
                   : `/uploads/Placeholder.png`
                }
                alt="profile"
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: "50%",
                  marginRight: 8,
                }}
              />
              <h2 className="font-bold">{username || "User"}</h2>
            </div>

            {openMenu && (
              <div
                className="absolute right-0 mt-2 w-32 bg-white text-black rounded shadow-lg p-4 "
              >
                <li
                  className="btn btn-ghost p-2 font-semibold text-xs"
                  onClick={() => {
                    setOpenMenu(false);
                    navigate("/profile");
                  }}
                >
                  โปรไฟล์ของฉัน
                </li>
                <li
                  className="btn btn-ghost p-2 text-red-600 text-xs"
                  onClick={handleLogout}
                >
                  ออกจากระบบ
                </li>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;