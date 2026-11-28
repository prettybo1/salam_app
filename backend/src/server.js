require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./db");
const { requireAuth, normalizePhone } = require("../middleware/auth");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `user_${req.user.id}_${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // до 5 МБ
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Разрешены только изображения"));
    }
  },
});

// Загрузка одного фото с устройства -> возвращает публичный URL
app.post("/api/profile/upload-photo", requireAuth, upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "NO_FILE", message: "Файл не выбран" });
  }
  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// Обновление данных профиля и списка фото текущего пользователя
app.put("/api/profile", requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const age = Number(req.body.age);
    const city = String(req.body.city || "Ашхабад").trim();
    const job = String(req.body.job || "").trim();
    const bio = String(req.body.bio || "").trim();
    const photos = Array.isArray(req.body.photos)
      ? req.body.photos.map((p) => String(p || "").trim()).filter(Boolean).slice(0, 5)
      : [];

    if (!name || !age || age < 18 || age > 99) {
      return res.status(400).json({ error: "INVALID_PROFILE", message: "Проверьте имя и возраст (18+)" });
    }

    const avatarUrl = photos[0] || null;
    const photosJson = JSON.stringify(photos);

    const { rows } = await pool.query(
      `UPDATE users
       SET name = $1,
           age = $2,
           city = $3,
           job = $4,
           bio = $5,
           photos = $6::jsonb,
           avatar_url = $7
       WHERE id = $8
       RETURNING id, phone, name, age, city, bio, job, hobbies, avatar_url, photos, is_premium, verified, likes_remaining, ad_likes_earned`,
      [name, age, city, job, bio, photosJson, avatarUrl, req.user.id]
    );

    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    res.status(500).json({ error: "PROFILE_UPDATE_FAILED", message: "Не удалось сохранить профиль" });
  }
});

function signUserToken(user) {
  return jwt.sign(
    { userId: user.id, phone: user.phone },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "salam-backend", db: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, service: "salam-backend", db: "error", message: err.message });
  }
});

// ================= AUTH =================

// Регистрация по номеру телефона (+993...)
app.post("/api/auth/register", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || "");
    const name = String(req.body.name || "").trim();
    const age = Number(req.body.age);
    const city = String(req.body.city || "Ашхабад").trim();

    if (!/^\+993\d{8}$/.test(phone)) {
      return res.status(400).json({
        error: "INVALID_PHONE",
        message: "Введите корректный номер Туркменистана (+993 XX XXXXXX)",
      });
    }
    if (/[а-яА-ЯёЁ]/.test(password)) {
      return res.status(400).json({
        error: "CYRILLIC_PASSWORD",
        message: "Пароль не должен содержать кириллицу — используйте латинские буквы",
      });
    }
    if (password.length < 6 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        error: "WEAK_PASSWORD",
        message: "Пароль должен быть от 6 символов и содержать заглавную букву и цифру",
      });
    }
    if (!name || !age || age < 18 || age > 99) {
      return res.status(400).json({
        error: "INVALID_PROFILE",
        message: "Укажите имя и корректный возраст (от 18 лет)",
      });
    }

    const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "PHONE_TAKEN",
        message: "Этот номер телефона уже зарегистрирован",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (phone, password_hash, name, age, city, likes_remaining, is_premium)
       VALUES ($1, $2, $3, $4, $5, 15, FALSE)
       RETURNING id, phone, name, age, city, bio, job, hobbies, avatar_url, photos, is_premium, verified, likes_remaining, ad_likes_earned`,
      [phone, passwordHash, name, age, city]
    );

    const user = rows[0];
    const token = signUserToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("POST /api/auth/register error:", err);
    res.status(500).json({ error: "REGISTER_FAILED", message: "Ошибка регистрации" });
  }
});

// Вход по номеру телефона и паролю
app.post("/api/auth/login", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || "");

    const { rows } = await pool.query(
      `SELECT id, phone, password_hash, name, age, city, bio, job, hobbies, avatar_url, photos, is_premium, verified, likes_remaining, ad_likes_earned
       FROM users WHERE phone = $1`,
      [phone]
    );

    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Неверный номер телефона или пароль",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Неверный номер телефона или пароль",
      });
    }

    delete user.password_hash;
    const token = signUserToken(user);

    res.json({ token, user });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({ error: "LOGIN_FAILED", message: "Ошибка входа" });
  }
});

// Получение текущего профиля по JWT
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, phone, name, age, city, bio, job, hobbies, avatar_url, photos, is_premium, verified, likes_remaining, ad_likes_earned
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    res.status(500).json({ error: "ME_FAILED" });
  }
});

// ================= FEED & SWIPES =================

app.get("/api/feed", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const city = (req.query.city || "").trim();
    const category = (req.query.category || "").trim();

    const params = [userId];
    let sql = `
      SELECT id, name, age, city, job, bio, hobbies, avatar_url, photos, feed_category, is_premium, verified
      FROM users
      WHERE id <> $1
        AND id NOT IN (
          SELECT to_user_id FROM swipes WHERE from_user_id = $1
        )
    `;

    if (city && city !== "Все") {
      params.push(city);
      sql += ` AND city = $${params.length}`;
    }

    if (category && category !== "all") {
      params.push(category);
      sql += ` AND feed_category = $${params.length}`;
    }

    sql += ` ORDER BY id ASC`;

    const { rows } = await pool.query(sql, params);
    res.json({ profiles: rows });
  } catch (err) {
    console.error("GET /api/feed error:", err);
    res.status(500).json({ error: "Failed to load feed" });
  }
});

app.post("/api/swipes", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const fromUserId = req.user.id;
    const toUserId = Number(req.body.toUserId);
    const action = req.body.action;

    if (!toUserId || toUserId === fromUserId || !["like", "pass"].includes(action)) {
      return res.status(400).json({ error: "Invalid swipe payload" });
    }

    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT id, is_premium, likes_remaining FROM users WHERE id = $1 FOR UPDATE",
      [fromUserId]
    );
    const currentUser = userRes.rows[0];
    if (!currentUser) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    if (action === "like" && !currentUser.is_premium) {
      if (currentUser.likes_remaining <= 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "NO_LIKES_LEFT",
          message: "Лимит лайков исчерпан. Посмотрите рекламу или оформите подписку.",
        });
      }
      await client.query(
        "UPDATE users SET likes_remaining = likes_remaining - 1 WHERE id = $1",
        [fromUserId]
      );
    }

    await client.query(
      `INSERT INTO swipes (from_user_id, to_user_id, action)
       VALUES ($1, $2, $3)
       ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET action = EXCLUDED.action`,
      [fromUserId, toUserId, action]
    );

    let isMatch = false;
    let matchId = null;

    if (action === "like") {
      const reciprocal = await client.query(
        `SELECT 1 FROM swipes
         WHERE from_user_id = $1 AND to_user_id = $2 AND action = 'like'`,
        [toUserId, fromUserId]
      );

      if (reciprocal.rowCount > 0) {
        const u1 = Math.min(fromUserId, toUserId);
        const u2 = Math.max(fromUserId, toUserId);
        const matchInsert = await client.query(
          `INSERT INTO matches (user1_id, user2_id)
           VALUES ($1, $2)
           ON CONFLICT (user1_id, user2_id) DO UPDATE SET user1_id = EXCLUDED.user1_id
           RETURNING id`,
          [u1, u2]
        );
        isMatch = true;
        matchId = matchInsert.rows[0].id;
      }
    }

    const updatedUser = await client.query(
      "SELECT likes_remaining, ad_likes_earned, is_premium FROM users WHERE id = $1",
      [fromUserId]
    );

    await client.query("COMMIT");

    res.json({
      ok: true,
      isMatch,
      matchId,
      wallet: updatedUser.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/swipes error:", err);
    res.status(500).json({ error: "Failed to process swipe" });
  } finally {
    client.release();
  }
});

// ================= MONETIZATION =================

app.post("/api/monetization/reward-ad", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rewardLikes = Number(req.body.rewardLikes || 5);

    const { rows } = await pool.query(
      `UPDATE users
       SET likes_remaining = likes_remaining + $2,
           ad_likes_earned = ad_likes_earned + $2
       WHERE id = $1
       RETURNING id, likes_remaining, ad_likes_earned, is_premium`,
      [userId, rewardLikes]
    );

    res.json({ ok: true, wallet: rows[0] });
  } catch (err) {
    console.error("POST /api/monetization/reward-ad error:", err);
    res.status(500).json({ error: "Failed to grant ad reward" });
  }
});

// ================= CHATS & SOCKET.IO =================

app.get("/api/chats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT
         m.id AS match_id,
         m.created_at AS matched_at,
         u.id AS partner_id,
         u.name AS partner_name,
         u.age AS partner_age,
         u.city AS partner_city,
         u.avatar_url AS partner_avatar,
         (
           SELECT body FROM messages msg
           WHERE msg.match_id = m.id
           ORDER BY msg.created_at DESC, msg.id DESC
           LIMIT 1
         ) AS last_message
       FROM matches m
       JOIN users u
         ON u.id = CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
       WHERE m.user1_id = $1 OR m.user2_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.json({ chats: rows });
  } catch (err) {
    console.error("GET /api/chats error:", err);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

app.get("/api/chats/:matchId/messages", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const matchId = Number(req.params.matchId);

    const access = await pool.query(
      "SELECT 1 FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)",
      [matchId, userId]
    );
    if (access.rowCount === 0) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const { rows } = await pool.query(
      `SELECT id, match_id, sender_id, body, status, created_at
       FROM messages
       WHERE match_id = $1
       ORDER BY created_at ASC, id ASC`,
      [matchId]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error("GET /api/chats/:matchId/messages error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

app.post("/api/chats/:matchId/messages", requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const matchId = Number(req.params.matchId);
    const body = (req.body.body || "").trim();

    if (!body) {
      return res.status(400).json({ error: "Message body cannot be empty" });
    }

    const access = await pool.query(
      "SELECT 1 FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)",
      [matchId, senderId]
    );
    if (access.rowCount === 0) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (match_id, sender_id, body, status)
       VALUES ($1, $2, $3, 'sent')
       RETURNING id, match_id, sender_id, body, status, created_at`,
      [matchId, senderId, body]
    );

    const createdMessage = rows[0];
    io.to(`match_${matchId}`).emit("new_message", createdMessage);

    res.status(201).json({ message: createdMessage });
  } catch (err) {
    console.error("POST /api/chats/:matchId/messages error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("UNAUTHORIZED"));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("INVALID_TOKEN"));
  }
});

io.on("connection", (socket) => {
  const currentUserId = socket.user.userId || socket.user.id;

  socket.on("join_match", async ({ matchId }) => {
    const id = Number(matchId);
    if (!id) return;
    try {
      const { rows } = await pool.query(
        `SELECT id FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
        [id, currentUserId]
      );
      if (rows.length > 0) {
        socket.join(`match_${id}`);
      }
    } catch (err) {
      console.error("join_match error:", err);
    }
  });

  socket.on("leave_match", ({ matchId }) => {
    const id = Number(matchId);
    if (!id) return;
    socket.leave(`match_${id}`);
  });

  socket.on("send_message", async ({ matchId, body, text }) => {
    const id = Number(matchId);
    const cleanBody = String(body ?? text ?? "").trim();
    if (!id || !cleanBody) return;

    try {
      const matchRes = await pool.query(
        `SELECT id FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
        [id, currentUserId]
      );
      if (matchRes.rows.length === 0) return;

      const { rows } = await pool.query(
        `INSERT INTO messages (match_id, sender_id, body, status)
         VALUES ($1, $2, $3, 'sent')
         RETURNING id, match_id, sender_id, body, status, created_at`,
        [id, currentUserId, cleanBody]
      );

      io.to(`match_${id}`).emit("new_message", rows[0]);
    } catch (err) {
      console.error("send_message error:", err);
    }
  });

  socket.on("mark_read", async ({ matchId }) => {
    const id = Number(matchId);
    if (!id) return;

    try {
      const matchRes = await pool.query(
        `SELECT id FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
        [id, currentUserId]
      );
      if (matchRes.rows.length === 0) return;

      const { rows } = await pool.query(
        `UPDATE messages
         SET status = 'read'
         WHERE match_id = $1
           AND sender_id <> $2
           AND status <> 'read'
         RETURNING id, match_id, sender_id, status`,
        [id, currentUserId]
      );

      if (rows.length > 0) {
        io.to(`match_${id}`).emit("messages_read", {
          matchId: id,
          readerId: currentUserId,
          messageIds: rows.map((r) => r.id),
        });
      }
    } catch (err) {
      console.error("mark_read error:", err);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Salam backend listening on http://localhost:${PORT}`);
});