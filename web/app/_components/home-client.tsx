"use client"

import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import VideoPlayer from "./video-player";
import { useState, useEffect } from "react";
import { TestData, JobStatus, Task } from "@/types";
import Timeline from "./timeline/timeline";
import UploadFile from "./upload-file";
import GenerateVideo from "./generate-video";
import { AudioClip, VideoClip, Track } from "@/types/editor";
import { useMediaController } from "./hooks/useMediaController";
import { useQuery } from "@tanstack/react-query";
import { useGetJson } from "@/hooks/useGetJson";

type HomeClientProps = {
  initialTaskId?: string;
}

const AUDIO_SRC = "/api/media/never.mp3"; //NOTE: hardcoded
const VIDEO_SRC = "/api/media/never.mp4";

const audioClip: AudioClip = { src: AUDIO_SRC }
const videoClip: VideoClip = { src: VIDEO_SRC, startTime: 0, duration: 60 }

const defaultTracks: Track[] = [
  { id: "v1", type: "video", clips: [videoClip] },
  { id: "a1", type: "audio", clips: [audioClip] },
]


export default function HomeClient({ initialTaskId }: HomeClientProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);
  const [chosenTask, setChosenTask] = useState<Task | null>(null);

  const { data: tasks } = useGetJson<Task[]>(["tasks"], "/api/tasks");

  async function fetchStatus(id: number): Promise<JobStatus> {
    const res = await fetch(`/api/status/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
    return (await res.json()) as JobStatus;
  }
  const statusQuery = useQuery({
    queryKey: ["status", chosenTask?.id],
    queryFn: () => fetchStatus(chosenTask!.id),
    enabled: !!chosenTask,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false;

      const status = query.state.data?.state;

      if (!status) return 5000;

      return ["done", "failed"].includes(status) ? false : 5000;
    },
  })

  const jobStatus = statusQuery.data as JobStatus | null;


  const media = useMediaController()

  // TODO: remove hardcoded
  const audioUrl = AUDIO_SRC

  useEffect(() => {
    if (media.audioSrc !== audioUrl) {
      media.setAudioSrc(audioUrl);
    }
  }, [audioUrl])

  return (
    <Box sx={{ height: '100vh', display: "flex", flexDirection: "column" }}>
      <Box sx={{ height: '60%', display: "flex", flexDirection: "row", minHeight: 0 }} >
        <Box className="flex-1 min-w-0 min-h-0 p-2">
          <Typography variant="h4" gutterBottom>
            AI Music Video Editor!
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Project</InputLabel>
            <Select
              value={chosenTask?.id || ""}
              label="Project"
              onChange={(e) => {
                const task = tasks?.find((t) => t.id === e.target.value) ?? null;
                setChosenTask(task);
              }}
            >
              {tasks?.map((task) => (
                <MenuItem key={task.id} value={task.id} onClick={() => setChosenTask(task)}>
                  {task.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <UploadFile
            file={audioFile}
            setFileAction={setAudioFile}
            jobStatus={jobStatus}
          />
          <GenerateVideo taskId={chosenTask?.id || null} jobStatus={jobStatus} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, mt: 2 }}>
          <VideoPlayer
            videoSrc={VIDEO_SRC}
            videoRef={media.videoRef}
            audioSrc={media.audioSrc || undefined}
            audioRef={media.audioRef}
          />
        </Box>
      </Box>
      <Timeline
        tracks={tracks}
        time={media.time}
        seekToAction={media.seekTo}
        playAction={media.play}
        pauseAction={media.pause}
        durationSec={media.duration || undefined}
        isPlaying={media.isPlaying} />
    </Box>
  )

}
