const jwt = require("jsonwebtoken");

function normalizePhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 8) return `+993${digits}`;
  if (digits.length === 11 && digits.startsWith("993")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Требуется авторизация" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = { id: Number(payload.userId), phone: payload.phone };
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN", message: "Сессия истекла, войдите заново" });
  }
}

module.exports = { requireAuth, normalizePhone };