"use client";

import { Box } from "@mui/material";

type VideoPlayerProps = {
  videoSrc: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioSrc?: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export default function VideoPlayer({ videoSrc, videoRef, audioSrc, audioRef }: VideoPlayerProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <video
          ref={videoRef}
          src={videoSrc}
          controls={false}
          preload="metadata"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>
      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} preload="auto" controls={true} />
      )}
    </Box>
  );
}

