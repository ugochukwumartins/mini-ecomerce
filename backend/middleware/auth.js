const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!token) return res.sendStatus(401);

  try {
    const secret = process.env.JWT_SECRET || "SECRET_KEY_123";
    req.admin = jwt.verify(token, secret);
    next();
  } catch {
    res.sendStatus(403);
  }
};
