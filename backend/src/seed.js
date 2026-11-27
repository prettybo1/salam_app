require("dotenv").config();
const pool = require("./db");

async function seed() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (rows[0].count > 0) {
    console.log("Users already seeded, skipping.");
    await pool.end();
    return;
  }

  await pool.query(`
    INSERT INTO users (name, age, city, bio, avatar_url, feed_category, is_premium, likes_remaining)
    VALUES
      ('Руслан', 25, 'Ашхабад', 'Делаю 3D и веб-приложения. Люблю кофе и ночной город.', '', 'for_you', false, 15),
      ('Айлара', 23, 'Ашхабад', 'Дизайнер интерьеров, обожаю эстетику и путешествия.', '', 'for_you', true, 999),
      ('Мяхри', 22, 'Мары', 'Учусь, читаю, ищу интересное общение.', '', 'popular', false, 15),
      ('Дженнет', 24, 'Ашхабад', 'Фотография, музыка и прогулки по паркам.', '', 'popular', false, 15),
      ('Лейли', 23, 'Туркменабад', 'Люблю книги, кино и вкусный плов.', '', 'for_you', false, 15);
  `);

  // Чтобы сразу можно было поймать взаимный матч при лайке Айлары (id=2):
  await pool.query(`
    INSERT INTO swipes (from_user_id, to_user_id, action)
    VALUES (2, 1, 'like');
  `);

  console.log("Seed completed successfully!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});