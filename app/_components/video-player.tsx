"use client";

import { Box, Button, Typography } from "@mui/material";
import { useRef, useCallback, useState, useEffect } from "react";

export default function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const requestId = useRef<number | null>(null);
  const [time, setTime] = useState(0);


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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0, mt: 2 }}>
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
      </Box>
      <Typography>time: {time.toFixed(3)}s</Typography>
    </Box>
  );
}

