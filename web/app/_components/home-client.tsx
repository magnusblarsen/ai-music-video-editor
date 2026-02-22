"use client"

import { Typography, Box, Switch, Button } from "@mui/material";
import VideoPlayer from "./video-player";
import InputContainer from "@/components/input-container";
import { useCallback, useState, useRef, useEffect } from "react";
import { TestData } from "@/types";
import Timeline from "./timeline/timeline";
import UploadFile from "./upload-file";
import GenerateVideo from "./generate-video";
import { Track } from "@/types/editor";

type HomeClientProps = {
  initialData: TestData;
  initialAudioId?: string;
}

const defaultTracks: Track[] = [
  { id: "v1", name: "Video 1", type: "video" },
  { id: "a1", name: "Audio 1", type: "audio" },
]

export default function HomeClient({ initialData, initialAudioId }: HomeClientProps) {
  const [example, setExample] = useState(initialData)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [audioId, setAudioId] = useState<string | null>(initialAudioId || null);
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);

  async function refresh() {
    // just an example
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
            onUploadedAction={(id: string) => {
              setAudioId(id);
            }}
            audioId={audioId}
            file={audioFile}
            setFileAction={setAudioFile}
          />
          <GenerateVideo />
          <InputContainer label="Make it faster!" float="top">
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
      <Timeline tracks={tracks} time={time} seekToAction={seekTo} playAction={play} pauseAction={pause} isPlaying={isPlaying} />
    </Box>
  )

}
