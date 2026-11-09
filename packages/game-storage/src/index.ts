/** Persistence boundary; adapters and migrations arrive in Phase 4. */
export interface LocalStorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export const SAVE_FORMAT_VERSION = 1 as const;
