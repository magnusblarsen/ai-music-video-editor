export enum JobState {
  STARTED = "started",
  STAGING = "staging",
  READY = "ready",
  RUNNING = "running",
  VIDEOS_SEGMENTED = "videos_segmented",
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

export type Task = {
  id: number;
  state: JobState;
  progress: number;
  message?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
}
