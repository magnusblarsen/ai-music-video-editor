"use client";

import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";


type WaveformTrackProps = {
  src: string;
  height: number;
  width: number;
}





export default function WaveformTrack({ src, height, width }: WaveformTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [samples, setSamples] = useState<Float32Array | null>(null); // PCM data

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const res = await fetch(src);
      const arrayBuffer = await res.arrayBuffer();

      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      if (cancelled) return;

      // first channel (left)
      const raw = audioBuffer.getChannelData(0);

      setSamples(raw);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!samples || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const step = Math.floor(samples.length / width); // 1 pixel = chunk of samples
    const amplitude = height / 2;

    for (let i = 0; i < width; i++) {
      const start = i * step;
      let min = 1;
      let max = -1;

      for (let j = 0; j < step; j++) {
        const val = samples[start + j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      const y1 = (1 + min) * amplitude;
      const y2 = (1 + max) * amplitude;

      ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }
  }, [samples, width, height]);

  return (
    <Box sx={{ width, height }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </Box>
  );
}

