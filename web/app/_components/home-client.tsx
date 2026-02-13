"use client"

import { Typography, Box, Switch, Button } from "@mui/material";
import VideoPlayer from "./video-player";
import InputContainer from "@/components/input-container";
import { useCallback, useState, useRef } from "react";
import { TestData } from "@/types";
import Timeline from "./timeline";


export default function HomeClient({ initialData }: { initialData: TestData }) {
  const [example, setExample] = useState(initialData)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);

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
      // Autoplay policies can block play() unless initiated by user interaction
      console.error(e);
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
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <Typography variant="h4" gutterBottom>
            Video Editor
          </Typography>
          <InputContainer label="Reduce latency" float="top">
            <Switch />
          </InputContainer>
          <Button onClick={play}>test plasy</Button>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, mt: 2 }}>
          <VideoPlayer time={time} setTime={setTime} src="https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v" play={play} pause={pause} seekTo={seekTo} videoRef={videoRef} />
        </Box>
      </Box>
      <Timeline time={time} seekTo={seekTo} />
    </Box>
  )

}
