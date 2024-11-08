// api/index.ts
import express from "express";
import { Pool } from "pg";
import cors from "cors";
import { BskyAgent } from "@atproto/api";

const app = express();
const port = 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// Initialize database
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      url TEXT,
      image JSONB
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id SERIAL PRIMARY KEY,
      identifier TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);
}

// API Routes
app.get("/api/posts/pending", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM posts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );
  res.json(result.rows);
});

app.post("/api/posts", async (req, res) => {
  const { content, scheduledFor, image } = req.body;
  const result = await pool.query(
    "INSERT INTO posts (content, scheduled_for, status, image) VALUES ($1, $2, $3, $4) RETURNING *",
    [content, scheduledFor, "pending", image]
  );
  res.json(result.rows[0]);
});

// Cron endpoint
app.post("/api/cron/check-posts", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { rows: posts } = await pool.query(
    "SELECT * FROM posts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );

  for (const post of posts) {
    try {
      const {
        rows: [creds],
      } = await pool.query("SELECT * FROM credentials LIMIT 1");

      const agent = new BskyAgent({ service: "https://bsky.social" });
      await agent.login({
        identifier: creds.identifier,
        password: creds.password,
      });

      await agent.post({ text: post.content });

      await pool.query("UPDATE posts SET status = $1 WHERE id = $2", [
        "published",
        post.id,
      ]);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await pool.query(
        "UPDATE posts SET status = $1, error = $2 WHERE id = $3",
        ["failed", errorMessage, post.id]
      );
    }
  }

  res.json({ success: true });
});

// Add this route to api/index.ts
app.delete("/api/credentials", async (req, res) => {
  await pool.query("DELETE FROM credentials");
  res.json({ success: true });
});

initDB().then(() => {
  app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
});
