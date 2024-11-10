// src/lib/db/remote.ts
import { parseISO } from "date-fns";
import type { DatabaseInterface, Post, Credentials } from "./types";
import { makeAuthenticatedRequest } from "../api";

export class RemoteDB implements DatabaseInterface {
  private apiUrl: string;
  private credentials: string | null;

  constructor(credentials?: string) {
    this.apiUrl = import.meta.env.VITE_API_URL;
    this.credentials = credentials ?? localStorage.getItem("apiCredentials");
  }

  private async fetchApi(endpoint: string, options?: RequestInit) {
    const response = await makeAuthenticatedRequest(
      `${this.apiUrl}/api${endpoint}`,
      options,
      this.credentials || undefined // You'll need to add this as a class property
    );
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async getPendingPosts(): Promise<Post[]> {
    return this.fetchApi("/posts/pending");
  }

  async getAllPosts(): Promise<Post[]> {
    return this.fetchApi("/posts").then((posts) => {
      return posts.map((p: Record<string, unknown>) => {
        return {
          ...p,
          scheduledFor: parseISO(p.scheduled_for as string),
        };
      });
    });
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    return this.fetchApi("/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async updatePost(id: number, post: Partial<Post>): Promise<void> {
    await this.fetchApi(`/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async deletePost(id: number): Promise<void> {
    await this.fetchApi(`/posts/${id}`, {
      method: "DELETE",
    });
  }

  async getCredentials(): Promise<Credentials | null> {
    try {
      return await this.fetchApi("/credentials");
    } catch (error: unknown) {
      console.log(error);
      return null;
    }
  }

  async setCredentials(creds: Omit<Credentials, "id">): Promise<void> {
    await this.fetchApi("/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
  }

  async deleteCredentials(): Promise<void> {
    await this.fetchApi("/credentials", {
      method: "DELETE",
    });
  }
}
