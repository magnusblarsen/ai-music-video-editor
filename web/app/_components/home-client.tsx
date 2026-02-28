"use client"

import { Typography, Box, Switch } from "@mui/material";
import VideoPlayer from "./video-player";
import { useState, useEffect } from "react";
import { TestData } from "@/types";
import Timeline from "./timeline/timeline";
import UploadFile from "./upload-file";
import GenerateVideo from "./generate-video";
import { Clip, Track } from "@/types/editor";
import { useMediaController } from "./hooks/useMediaController";

type HomeClientProps = {
  initialData: TestData;
  initialTaskId?: string;
}

const AUDIO_SRC = "/api/media/never.mp3"; //NOTE: hardcoded
const VIDEO_SRC = "/api/media/never.mp4";

const audioClip: Clip = { src: AUDIO_SRC }
const videoClip: Clip = { src: VIDEO_SRC, startTime: 0, duration: 60 }

const defaultTracks: Track[] = [
  { id: "v1", type: "video", clips: [videoClip] },
  { id: "a1", type: "audio", clips: [audioClip] },
]


export default function HomeClient({ initialData, initialTaskId }: HomeClientProps) {
  const [example, setExample] = useState(initialData)

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(initialTaskId || null);
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);

  async function refresh() {
    // just an example
    const res = await fetch("/api/test");
    const data = (await res.json()) as TestData;
    setExample(data);
  }

  const media = useMediaController()

  // NOTE: hardcoded audio file
  const audioUrl = taskId ? AUDIO_SRC : null;

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
          <UploadFile
            onUploadedAction={(id: string) => {
              setTaskId(id);
            }}
            audioId={taskId}
            file={audioFile}
            setFileAction={setAudioFile}
          />
          <GenerateVideo />
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
