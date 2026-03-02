export enum JobState {
  QUEUED = "queued",
  STAGING = "staging",
  READY = "ready",
  RUNNING = "running",
  DONE = "done",
  FAILED = "failed"
}

export type JobStatus = {
  state: JobState;
  error?: string | null;
}

export type TrackType = "video" | "audio";

export type BaseClip = {
  src: string;
}

export type VideoClip = BaseClip & {
  duration: number;
  startTime: number;
}

export type AudioClip = BaseClip;

export type Track = {
  id: string;
  type: TrackType;
  clips: BaseClip[];
}
