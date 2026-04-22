"use client"

import { Typography, Box, SelectChangeEvent } from "@mui/material";
import VideoPlayer from "./video-player";
import { useState, useEffect, useMemo } from "react";
import { JobStatus, Task, JobState } from "@/types";
import Timeline from "./timeline/timeline";
import UploadFile from "./upload-file";
import GenerateVideo from "./generate-video";
import { Track } from "@/types/editor";
import { useMediaController } from "./hooks/useMediaController";
import { useQuery } from "@tanstack/react-query";
import { useGetJson } from "@/hooks/useGetJson";
import DebugControls from "./debug-controls";


const stateToLabel: Record<JobState, string> = {
  "started": "The task has started",
  "staging": "Uploading audio file",
  "ready": "Ready to start generating videos",
  "running": "Making video scripts",
  "videos_segmented": "Video scripts have been generated. Generating videos now :)",
  "done": "Done generating videos",
  "failed": "Failed. Sadness :("
}

export default function HomeClient() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);

  const chosenTaskId = pendingTaskId ?? selectedTaskId;


  const { data: tasks } = useGetJson<Task[]>(["tasks"], "/api/tasks");

  const chosenTask = useMemo(() => {
    if (!chosenTaskId || !tasks) return null;
    return tasks.find((t) => t.id === chosenTaskId) ?? null;
  }, [tasks, chosenTaskId])

  const videoSrc = useMemo(() => {
    if (!chosenTask) return null;
    return `/api/media/${chosenTask.id}/final_video.mp4`;
  }, [chosenTask])

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

      if (!status) return 1000 * 60;

      return ["done", "failed"].includes(status) ? false : 5000;
    },
  })


  function onSetSelectedTaskId(id: number | null) {
    setSelectedTaskId(id);
    setPendingTaskId(null);
  }

  const jobStatus = statusQuery.data as JobStatus | null;

  const { data: fetchedTracks, isLoading: tracksLoading, error: tracksError } = useGetJson<Track[]>(
    ["tracks", chosenTask?.id],
    `/api/tasks/${chosenTask?.id}/tracks`,
    undefined,
    {
      enabled: !!chosenTask?.id
    }
  );

  const { data: task, isLoading: taskLoading, error: taskError } = useGetJson<Task>(
    ["task", chosenTask?.id],
    `/api/tasks/${chosenTask?.id}`,
    undefined,
    {
      enabled: !!chosenTask?.id
    }
  );

  const tracks = fetchedTracks ?? []

  const { setAudioSrc, videoRef, audioRef, time, seekTo, play, pause, duration, isPlaying, audioSrc } = useMediaController()

  useEffect(() => {
    if (chosenTask?.id) {
      setAudioSrc(`/api/media/${chosenTask.id}.mp3`)
    }
  }, [chosenTask?.id, setAudioSrc])


  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: 'space-between', minHeight: "100vh" }} >
      <Box sx={{ display: "flex", flexDirection: "row", minHeight: 0 }} >
        <Box className="flex-1 min-w-0 min-h-0 p-2">
          <Typography variant="h4" gutterBottom>
            Generate videos
          </Typography>
          {jobStatus && (
            <Typography variant="body1" color={jobStatus.state === "failed" ? "error" : "textPrimary"}>
              Status: {stateToLabel[jobStatus.state]}
            </Typography>
          )}
          {jobStatus?.state == JobState.FAILED && jobStatus?.error && (
            <Typography color="error">
              Message: {jobStatus.error}
            </Typography>
          )}
          <Typography variant="body1" sx={{ my: 2 }}>
            Generating a video takes approximately 4 hours.
          </Typography>
          <UploadFile
            tasks={tasks || null}
            chosenTask={chosenTask}
            setPendingTaskId={setPendingTaskId}
            setSelectedTaskId={onSetSelectedTaskId}
            file={audioFile}
            setFileAction={setAudioFile}
          />
          <GenerateVideo taskId={chosenTask?.id || null} jobStatus={jobStatus} task={task} />
          <DebugControls chosenTask={chosenTask} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, mt: 2 }}>
          <VideoPlayer
            videoSrc={videoSrc}
            videoRef={videoRef}
            audioSrc={audioSrc || undefined}
            audioRef={audioRef}
          />
        </Box>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Timeline
          key={task?.id} // force remount
          tracks={tracks}
          time={time}
          seekToAction={seekTo}
          playAction={play}
          pauseAction={pause}
          durationSec={duration || undefined}
          audioSrc={audioSrc}
          isPlaying={isPlaying}
          taskId={chosenTask?.id}
          cutMarkers={task?.cut_markers || []}
        />
      </Box>
    </Box>
  )

}
