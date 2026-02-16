import "server-only";
import { fetchJson } from "../fetchJson";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function fetchInternal<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = process.env.API_INTERNAL_URL;
  if (!base) throw new Error("Missing API_INTERNAL_URL");

  const mergedInit: RequestInit = { cache: "no-store", ...init };

  return fetchJson<T>(joinUrl(base, path), mergedInit);
}
