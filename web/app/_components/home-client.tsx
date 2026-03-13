"use client"

import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";
import VideoPlayer from "./video-player";
import { useState, useEffect } from "react";
import { JobStatus, Task } from "@/types";
import Timeline from "./timeline/timeline";
import UploadFile from "./upload-file";
import GenerateVideo from "./generate-video";
import { Track } from "@/types/editor";
import { useMediaController } from "./hooks/useMediaController";
import { useQuery } from "@tanstack/react-query";
import { useGetJson } from "@/hooks/useGetJson";

type HomeClientProps = {
  initialTaskId?: string;
}

const VIDEO_SRC = "/api/media/never.mp4";

// export enum JobState {
//   STARTED = "started",
//   STAGING = "staging",
//   READY = "ready",
//   RUNNING = "running",
//   VIDEOS_SEGMENTED = "videos_segmented",
//   DONE = "done",
//   FAILED = "failed"
// }
//

export default function HomeClient({ initialTaskId }: HomeClientProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [editedTracks, setEditedTracks] = useState<Track[] | null>(null);
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

  const { data: fetchedTracks, isLoading: tracksLoading, error: tracksError } = useGetJson<Track[]>(
    ["tracks", chosenTask?.id],
    `/api/tasks/${chosenTask?.id}/tracks`,
    undefined,
    {
      enabled: !!chosenTask?.id
    }
  );

  function startPolling() {
    fetch(`/api/tasks/${chosenTask?.id}/start-polling`, {
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to start polling: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Polling started:", data);
      })
      .catch((err) => {
        console.error("Error starting polling:", err);
      });
  }

  const tracks = editedTracks ?? fetchedTracks ?? []

  const { setAudioSrc, videoRef, audioRef, time, seekTo, play, pause, duration, isPlaying, audioSrc } = useMediaController()

  useEffect(() => {
    if (chosenTask?.id) {
      setAudioSrc(`/api/media/${chosenTask.id}.mp3`)
    }
  }, [chosenTask?.id, setAudioSrc])

  return (
    <Box sx={{ height: '100vh', display: "flex", flexDirection: "column" }}>
      <Box sx={{ height: '60%', display: "flex", flexDirection: "row", minHeight: 0 }} >
        <Box className="flex-1 min-w-0 min-h-0 p-2">
          <Typography variant="h4" gutterBottom>
            AI Music Video Editor!
          </Typography>
          <Button variant="contained" color="primary" onClick={() => startPolling()}>
            start polling
          </Button>
          <FormControl fullWidth>
            <InputLabel>Project</InputLabel>
            <Select
              value={chosenTask?.id || ""}
              label="Project"
              onChange={(e) => {
                const task = tasks?.find((t) => t.id === e.target.value) ?? null;
                setChosenTask(task);
                setEditedTracks(null)
              }}
            >
              {tasks?.map((task) => (
                <MenuItem key={task.id} value={task.id}>
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
            videoRef={videoRef}
            audioSrc={audioSrc || undefined}
            audioRef={audioRef}
          />
        </Box>
      </Box>
      <Timeline
        tracks={tracks}
        time={time}
        seekToAction={seekTo}
        playAction={play}
        pauseAction={pause}
        durationSec={duration || undefined}
        audioSrc={audioSrc}
        isPlaying={isPlaying} />
    </Box>
  )

}
