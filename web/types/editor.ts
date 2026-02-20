// type JobStatus = {
//   status: "queued" | "running" | "done" | "failed" | string;
//   error?: string | null;
// }

export interface JobStatus {
  state: "queued" | "staging" | "readt" | "running" | "done" | "failed" | string;
  error?: string | null;
}
