import { RichText } from "@atproto/api";

export interface Post {
  id?: number;
  scheduledFor: Date;
  status: "pending" | "published" | "failed";
  error?: string;
  createdAt: Date;
  data: PostData;
}

export type BlobRefType = {
  $type: string;
  ref: {
    $link: string;
  };
  mimeType: string;
  size: number;
};

export type PostData = {
  text: string;
  facets?: RichText["facets"];
  createdAt: string;
  embed?: {
    $type: string;
    images?: Array<{
      alt?: string;
      localUrl?: string;
      image: {
        $type: string;
        ref: {
          $link: string;
        };
        mimeType: string;
        size: number;
      };
    }>;
    external?: {
      uri: string;
      title: string;
      description: string;
      thumb?: BlobRefType;
    };
  };
};

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
