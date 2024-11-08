// src/lib/db/types.ts
export interface Post {
  id?: number;
  content: string;
  scheduledFor: Date;
  status: "pending" | "published" | "failed";
  error?: string;
  createdAt: Date;
  url?: string;
  image?: {
    url: string;
    type: string;
    alt?: string;
    blobRef?: {
      $type: string;
      ref: {
        $link: string;
      };
      mimeType: string;
      size: number;
    };
  };
}

export interface Credentials {
  id: number;
  identifier: string;
  password: string;
}

export interface DatabaseInterface {
  getPendingPosts(): Promise<Post[]>;
  getAllPosts(): Promise<Post[]>;
  createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post>;
  updatePost(id: number, post: Partial<Post>): Promise<void>;
  deletePost(id: number): Promise<void>;
  getCredentials(): Promise<Credentials | null>;
  setCredentials(creds: Omit<Credentials, "id">): Promise<void>;
  deleteCredentials(): Promise<void>;
}
