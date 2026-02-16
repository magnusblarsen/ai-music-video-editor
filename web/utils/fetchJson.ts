
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  return res.json() as Promise<T>;
}

