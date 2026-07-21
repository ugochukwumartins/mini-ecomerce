const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please log in before checking out" });

  try {
    const secret = process.env.JWT_SECRET || "SECRET_KEY_123";
    const payload = jwt.verify(token, secret);
    if (payload.role !== "customer") return res.status(403).json({ message: "Customer login required" });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Your login has expired. Please log in again" });
  }
};
