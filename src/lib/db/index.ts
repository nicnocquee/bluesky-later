import type { DatabaseInterface } from "./types";
import { LocalDB } from "./local";
import { RemoteDB } from "./remote";

export function createDatabase(credentials?: string): DatabaseInterface {
  if (import.meta.env.VITE_STORAGE_MODE === "remote") {
    return new RemoteDB(credentials);
  }
  return new LocalDB();
}

export const db = createDatabase();

// Re-export types
export type { Post, Credentials } from "./types";
