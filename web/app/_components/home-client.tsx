"use client"

import { Typography, Box, Switch } from "@mui/material";
import VideoPlayer from "./video-player";
import InputContainer from "@/components/input-container";
import { useState } from "react";
import { TestData } from "@/types";
import Timeline from "./timeline";


export default function HomeClient({ initialData }: { initialData: TestData }) {
  const [example, setExample] = useState(initialData)

  async function refresh() {
    // just for example
    const res = await fetch("/api/test");
    const data = (await res.json()) as TestData;
    setExample(data);
  }

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
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, mt: 2 }}>
          <VideoPlayer src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" />
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", minHeight: 0, p: 2 }}>
        <Timeline />
      </Box>
    </Box>
  )
}
