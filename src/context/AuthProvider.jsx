import { useState } from "react";
import { AuthContext } from "./AuthContext.js";

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
  // โหลดจาก localStorage ตอนเปิดเว็บใหม่
  const saved = localStorage.getItem("auth");
  return saved ? JSON.parse(saved) : { token: null, role: null, username: null, image : null };
});

const login = (token, role, username, image ,user_id ) => {
  const newAuth = { token, role, username, image ,user_id  };
  setAuth(newAuth);
  localStorage.setItem("auth", JSON.stringify(newAuth));
};

const logout = () => {
  setAuth({ token: null, role: null, username: null, image : null });
  localStorage.removeItem("auth");
};

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
