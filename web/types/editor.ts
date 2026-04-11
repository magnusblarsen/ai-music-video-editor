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

export type Clip = {
  id: number;
  url: string | null;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  script_description: string;
  aesthetics: string;
  camera_movement: string;
}

export type Track = {
  id: string;
  task_id: number;
  clips: Clip[];
}

export type Task = {
  id: number;
  state: JobState;
  progress: number;
  message?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
  cut_markers: number[];
}
