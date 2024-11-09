import express from "express";
import { Pool } from "pg";
import cors from "cors";
import { BskyAgent } from "@atproto/api";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

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

app.get("/api/posts/pending", async (req, res) => {
  console.log("Getting pending posts");
  const result = await pool.query(
    "SELECT * FROM posts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );
  res.json(result.rows);
});

app.get("/api/posts", async (req, res) => {
  console.log("Getting all posts");
  const result = await pool.query("SELECT * FROM posts");
  res.json(result.rows);
});

app.post("/api/posts", async (req, res) => {
  console.log("Creating post");
  const { content, scheduledFor, image } = req.body;
  const result = await pool.query(
    "INSERT INTO posts (content, scheduled_for, status, image) VALUES ($1, $2, $3, $4) RETURNING *",
    [content, scheduledFor, "pending", image]
  );
  res.json(result.rows[0]);
});

app.delete("/api/posts/:id", async (req, res) => {
  console.log("Deleting post");
  const { id } = req.params;
  await pool.query("DELETE FROM posts WHERE id = $1", [id]);
  res.json({ success: true });
});

// Cron endpoint
app.post("/api/cron/check-posts", async (req, res) => {
  console.log("Checking posts");
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

app.get("/api/credentials", async (req, res) => {
  console.log("Getting credentials");
  const result = await pool.query("SELECT * FROM credentials LIMIT 1");
  res.json(result.rows[0]);
});

app.post("/api/credentials", async (req, res) => {
  console.log("Setting credentials");
  const { identifier, password } = req.body;
  await pool.query("DELETE FROM credentials");
  await pool.query(
    "INSERT INTO credentials (identifier, password) VALUES ($1, $2)",
    [identifier, password]
  );
  res.json({ success: true });
});

app.delete("/api/credentials", async (req, res) => {
  console.log("Deleting credentials");
  await pool.query("DELETE FROM credentials");
  res.json({ success: true });
});

initDB().then(() => {
  app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
});
