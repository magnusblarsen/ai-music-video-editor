"use client";

import { Box, Button, Typography } from "@mui/material";
import { useRef, useEffect } from "react";

type VideoPlayerProps = {
  time: number;
  setTime: (seconds: number) => void;
  src: string;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function VideoPlayer({ time, setTime, src, play, pause, seekTo, onPlayingChange, videoRef }: VideoPlayerProps) {
  const requestId = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      setTime(v.currentTime);
      requestId.current = requestAnimationFrame(tick);
    }

    const onStart = () => {
      onPlayingChange(true);
      if (requestId.current == null) requestId.current = requestAnimationFrame(tick);
    }
    const onStop = () => {
      onPlayingChange(false);
      if (requestId.current !== null) {
        cancelAnimationFrame(requestId.current);
        requestId.current = null;
      }

      setTime(v.currentTime)
    }

    const onSeek = () => {
      setTime(v.currentTime);
    }

    const onLoadedMetadata = () => {
      setTime(v.currentTime);
    }

    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("play", onStart);
    v.addEventListener("pause", onStop);
    v.addEventListener("ended", onStop);
    v.addEventListener("seeking", onSeek);
    v.addEventListener("seeked", onSeek);

    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", onStart);
      v.removeEventListener("pause", onStop);
      v.removeEventListener("ended", onStop);
      v.removeEventListener("seeking", onSeek);
      v.removeEventListener("seeked", onSeek);

      if (requestId.current != null) {
        cancelAnimationFrame(requestId.current);
        requestId.current = null;
      }
    }
  }, [])


  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <video
          ref={videoRef}
          src={src}
          controls
          preload="metadata"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
}

