const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!token) return res.sendStatus(401);

  try {
    const secret = process.env.JWT_SECRET || "SECRET_KEY_123";
    const payload = jwt.verify(token, secret);
    if (payload.role !== "admin") return res.sendStatus(403);
    req.admin = payload;
    next();
  } catch {
    res.sendStatus(403);
  }
};
