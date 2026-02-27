
export type JobStatus = {
  state: "queued" | "staging" | "ready" | "running" | "done" | "failed";
  error?: string | null;
}

export type TrackType = "video" | "audio";

export type Clip = {
  src: string;
  startTime?: number;
  duration?: number;
}

export type Track = {
  id: string;
  type: TrackType;
  clips: Clip[];
}
