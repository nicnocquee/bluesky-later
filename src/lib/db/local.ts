// src/lib/db/local.ts
import Dexie, { type Table } from "dexie";
import type { DatabaseInterface, Post, Credentials } from "./types";

class BlueSkyDB extends Dexie {
  posts!: Table<Post>;
  credentials!: Table<{
    id: number;
    identifier: string;
    password: string;
  }>;

  constructor() {
    super("blueSkyDB");
    this.version(1).stores({
      posts: "++id, scheduledFor, status",
      credentials: "++id, identifier",
    });
  }
}

export class LocalDB implements DatabaseInterface {
  private db: BlueSkyDB;

  constructor() {
    this.db = new BlueSkyDB();
  }

  async getPendingPosts(): Promise<Post[]> {
    return this.db.posts
      .where("status")
      .equals("pending")
      .and((post) => new Date(post.scheduledFor) <= new Date())
      .toArray();
  }

  async getAllPosts(): Promise<Post[]> {
    return this.db.posts.toArray();
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const id = await this.db.posts.add({
      ...post,
      createdAt: new Date(),
    });
    return this.db.posts.get(id) as Promise<Post>;
  }

  async updatePost(id: number, post: Partial<Post>): Promise<void> {
    await this.db.posts.update(id, post);
  }

  async deletePost(id: number): Promise<void> {
    await this.db.posts.delete(id);
  }

  async getCredentials(): Promise<Credentials | null> {
    const creds = await this.db.credentials.toCollection().first();
    return creds || null;
  }

  async setCredentials(creds: Omit<Credentials, "id">): Promise<void> {
    await this.db.credentials.clear();
    await this.db.credentials.add({
      ...creds,
      id: 1,
    });
  }

  async deleteCredentials(): Promise<void> {
    await this.db.credentials.clear();
  }
}
