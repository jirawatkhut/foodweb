// src/components/Layout.jsx
import React from "react";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  return (
    <div  className="min-h-screen bg-base-200">
      {/* Navbar */}
      <Navbar />

      {/* เนื้อหาหลัก */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer sm:footer-horizontal footer-center bg-base-300 text-base-content p-4 fixed bottom-0">
         <aside>
        © {new Date().getFullYear()} Food Community Web
        </aside>
      </footer>
    </div>
  );
};

export default Layout;
