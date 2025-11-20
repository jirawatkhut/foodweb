const jwt = require("jsonwebtoken");
const JWT_SECRET = "MY_SECRET_KEY"; // ควรเก็บใน .env

// ตรวจสอบ token
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = decoded; // { id, role }
    next();
  });
}

// ตรวจสอบ role
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden: insufficient rights" });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
