import express from "express";
import { Pool } from "pg";
import cors from "cors";
import { BskyAgent } from "@atproto/api";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config({ path: "../.env" });

const app = express();
const port = 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

app.post("/api/auth/setup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  // Check if credentials already exist
  const existing = await pool.query("SELECT * FROM api_auth LIMIT 1");
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: "API credentials already exist" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store credentials
  await pool.query(
    "INSERT INTO api_auth (username, password) VALUES ($1, $2)",
    [username, hashedPassword]
  );

  res.json({ success: true });
});

async function authenticateRequest(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Skip auth for initial setup and cron endpoint
  if (req.path === "/api/auth/setup" || req.path === "/api/cron/check-posts") {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");

  const result = await pool.query("SELECT * FROM api_auth LIMIT 1");
  if (result.rows.length === 0) {
    return res.status(401).json({ error: "No API credentials set" });
  }

  const storedCreds = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, storedCreds.password);

  if (username !== storedCreds.username || !passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  next();
}

app.get("/api/auth/check", async (_req, res) => {
  const result = await pool.query("SELECT * FROM api_auth LIMIT 1");
  if (result.rows.length > 0) {
    return res.json({ exists: true });
  }
  return res.status(404).json({ exists: false });
});

// Apply middleware to all routes
app.use(authenticateRequest);

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

    CREATE TABLE IF NOT EXISTS api_auth (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
