"use client"

import { Typography, Box, Switch } from "@mui/material";
import VideoPlayer from "./video-player";
import InputContainer from "@/components/input-container";
import { useCallback, useState, useRef, useEffect } from "react";
import { TestData } from "@/types";
import Timeline from "./timeline";
import UploadFile from "./upload-file";



type JobStatus = {
  status: "queued" | "running" | "done" | "failed" | string;
  error?: string | null;
}

export default function HomeClient({ initialData }: { initialData: TestData }) {
  const [example, setExample] = useState(initialData)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [audioId, setAudioId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);

  // TODO: in the future: tanstack query
  // useQuery({
  //   queryKey: ["status", audioId],
  //   queryFn: () => fetchStatus(audioId),
  //   enabled: !!audioId,
  //   refetchInterval: (data) =>
  //     data?.status === "done" || data?.status === "failed" ? false : 1500,
  // })

  useEffect(() => {
    if (!audioId) return;

    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      try {
        const res = await fetch(`/api/status/${audioId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
        const data = (await res.json()) as JobStatus;

        if (!cancelled) setJob(data);

        // Stop polling when terminal
        if (!cancelled && data.status !== "done" && data.status !== "failed") {
          timer = window.setTimeout(tick, 2000);
        }
      } catch (e) {
        if (!cancelled) {
          setJob({ status: "failed", error: (e as Error).message });
        }
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [audioId]);

  async function refresh() {
    // just for example
    const res = await fetch("/api/test");
    const data = (await res.json()) as TestData;
    setExample(data);
  }


  const play = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
    } catch (e) {
      console.error(e); // Autoplay policies can block play() unless initiated by user interaction
    }
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);


  const seekTo = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, seconds);
  }, []);


  return (
    <Box sx={{ height: '100vh', display: "flex", flexDirection: "column" }}>
      <Box sx={{ height: '60%', display: "flex", flexDirection: "row", minHeight: 0 }} >
        <Box className="flex-1 min-w-0 min-h-0 p-2">
          <Typography variant="h4" gutterBottom>
            AI Music Video Editor!
          </Typography>
          <UploadFile
            onUploaded={(id: string) => {
              setAudioId(id);
              setJob({ status: "queued" });
            }}
          />
          <InputContainer label="Reduce latency" float="top">
            <Switch />
          </InputContainer>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, mt: 2 }}>
          <VideoPlayer
            time={time}
            setTime={setTime}
            onPlayingChange={setIsPlaying}
            src="https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v"
            play={play}
            pause={pause}
            seekTo={seekTo}
            videoRef={videoRef} />
        </Box>
      </Box>
      <Timeline time={time} seekTo={seekTo} play={play} pause={pause} isPlaying={isPlaying} />
    </Box>
  )

}
