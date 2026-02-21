
export type JobStatus = {
  state: "queued" | "staging" | "ready" | "running" | "done" | "failed";
  error?: string | null;
}
