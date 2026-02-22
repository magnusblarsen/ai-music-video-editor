
export type JobStatus = {
  state: "queued" | "staging" | "ready" | "running" | "done" | "failed";
  error?: string | null;
}

export type Track = {
  id: string;
  name: string;
  type: "video" | "audio";
}
