// src/lib/db/index.ts
import type { DatabaseInterface } from "./types";
import { LocalDB } from "./local";
import { RemoteDB } from "./remote";

function createDatabase(): DatabaseInterface {
  if (import.meta.env.VITE_STORAGE_MODE === "remote") {
    return new RemoteDB();
  }
  return new LocalDB();
}

export const db = createDatabase();

// Re-export types
export type { Post, Credentials } from "./types";
