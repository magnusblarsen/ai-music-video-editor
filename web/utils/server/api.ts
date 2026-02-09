import "server-only";
import { fetchJson } from "../fetchJson";

export async function fetchInternal<T>(path: string): Promise<T> {
  const url = process.env.API_INTERNAL_URL!;
  return fetchJson<T>(`${url}${path}`);
}
