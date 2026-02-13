"use client";

import { Box, Button, Typography } from "@mui/material";
import { useRef, useEffect } from "react";

export default function VideoPlayer({ time, setTime, src, play, pause, seekTo, videoRef }: { time: number, setTime: (seconds: number) => void, src: string, play: () => void, pause: () => void, seekTo: (seconds: number) => void, videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const requestId = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      setTime(v.currentTime);
      requestId.current = requestAnimationFrame(tick);
    }

    const start = () => {
      if (requestId.current == null) requestId.current = requestAnimationFrame(tick);
    }
    const stop = () => {
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
    v.addEventListener("play", start);
    v.addEventListener("pause", stop);
    v.addEventListener("ended", stop);
    v.addEventListener("seeking", onSeek);
    v.addEventListener("seeked", onSeek);

    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", start);
      v.removeEventListener("pause", stop);
      v.removeEventListener("ended", stop);
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

      <Box sx={{ display: "flex", gap: 8, mt: 2 }}>
        <Button onClick={play}>Play</Button>
        <Button onClick={pause}>Pause</Button>
        <Button onClick={() => seekTo(10)}>Test seek</Button>
        <Typography>time: {time.toFixed(3)}s</Typography>
      </Box>
    </Box>
  );
}

