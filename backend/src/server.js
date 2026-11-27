require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "salam-backend", db: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, service: "salam-backend", db: "error", message: err.message });
  }
});

// Лента анкет с фильтрами по городу и вкладке ('for_you' | 'popular')
app.get("/api/feed", async (req, res) => {
  try {
    const userId = Number(req.query.userId || 1);
    const city = (req.query.city || "").trim();
    const category = (req.query.category || "").trim();

    const params = [userId];
    let sql = `
      SELECT id, name, age, city, bio, avatar_url, photos, feed_category, is_premium
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

// Свайп ('like' | 'pass') + проверка взаимного матча
app.post("/api/swipes", async (req, res) => {
  const client = await pool.connect();
  try {
    const fromUserId = Number(req.body.fromUserId || 1);
    const toUserId = Number(req.body.toUserId);
    const action = req.body.action;

    if (!toUserId || !["like", "pass"].includes(action)) {
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

// Начисление бонусных лайков после просмотра рекламы
app.post("/api/monetization/reward-ad", async (req, res) => {
  try {
    const userId = Number(req.body.userId || 1);
    const rewardLikes = Number(req.body.rewardLikes || 5);

    const { rows } = await pool.query(
      `UPDATE users
       SET likes_remaining = likes_remaining + $2,
           ad_likes_earned = ad_likes_earned + $2
       WHERE id = $1
       RETURNING id, likes_remaining, ad_likes_earned, is_premium`,
      [userId, rewardLikes]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ ok: true, wallet: rows[0] });
  } catch (err) {
    console.error("POST /api/monetization/reward-ad error:", err);
    res.status(500).json({ error: "Failed to grant ad reward" });
  }
});

// Список матчей/чатов пользователя
app.get("/api/chats/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
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
    console.error("GET /api/chats/:userId error:", err);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

// Сообщения конкретного матча
app.get("/api/chats/:matchId/messages", async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
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

// Отправка сообщения в чат матча
app.post("/api/chats/:matchId/messages", async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    const senderId = Number(req.body.senderId || 1);
    const body = (req.body.body || "").trim();

    if (!body) {
      return res.status(400).json({ error: "Message body cannot be empty" });
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (match_id, sender_id, body, status)
       VALUES ($1, $2, $3, 'sent')
       RETURNING id, match_id, sender_id, body, status, created_at`,
      [matchId, senderId, body]
    );

    res.status(201).json({ message: rows[0] });
  } catch (err) {
    console.error("POST /api/chats/:matchId/messages error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.listen(PORT, () => {
  console.log(`Salam backend listening on http://localhost:${PORT}`);
});