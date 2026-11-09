/** Local persistence boundary. */
export interface LocalStorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export const SAVE_FORMAT_VERSION = 2 as const;
export * from './save';
export { storage, cacheImage, readImage } from './platform';
