import { get, set, del } from "idb-keyval";

export async function readLocal<T>(key: string, fallback: T): Promise<T> {
  try {
    return (await get<T>(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function writeLocal(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value);
  } catch {
    throw new Error(
      "Browser storage is unavailable. Your changes have not been saved locally.",
    );
  }
}

export async function clearCache(): Promise<void> {
  await del("events");
}
