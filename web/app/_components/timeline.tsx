"use client";
import { Box, Button, Paper, Typography } from "@mui/material";
import React, { useRef, useState, useMemo, useEffect } from "react";

type Track = { id: string; name: string };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const defaultTracks: Track[] = [
  { id: "v1", name: "Video 1" },
  { id: "v2", name: "Video 2" },
  { id: "a1", name: "Audio 1" },
]

type TimelineProps = {
  time: number;
  seekToAction: (seconds: number) => void;
  playAction: () => void;
  pauseAction: () => void;
  isPlaying?: boolean;
  durationSec?: number;
  tracks?: Track[];
}

export default function Timeline({ time, seekToAction, playAction, pauseAction, isPlaying, durationSec = 120, tracks = defaultTracks }: TimelineProps) {
  const rulerHeight = 30
  const trackHeight = 50

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const didInitZoomRef = useRef(false);
  const viewportWidthRef = useRef(0);

  const [pxPerSecond, setPxPerSecond] = useState(80)
  const [viewportWidth, setViewportWidth] = useState(0);


  const minPxPerSecond = useMemo(() => {
    if (!viewportWidth) return 1; // fallback for first render
    return Math.max(0.5, viewportWidth / durationSec)
  }, [viewportWidth, durationSec]);

  const fitToView = () => {
    setPxPerSecond(minPxPerSecond);
    scrollRef.current?.scrollTo({ left: 0 })
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      const clientWidth = el.clientWidth;

      // On first render fit timeline to viewport width
      if (!didInitZoomRef.current) {
        didInitZoomRef.current = true;
        viewportWidthRef.current = clientWidth;
        const initialZoom = Math.max(0.5, clientWidth / durationSec);
        setPxPerSecond(initialZoom);
        el.scrollTo({ left: 0 })
      }

      setViewportWidth(el.clientWidth);
    })

    resizeObserver.observe(el);
    setViewportWidth(el.clientWidth);

    return () => resizeObserver.disconnect();
  }, [durationSec])


  const totalWidthPx = Math.max(1, durationSec * pxPerSecond);

  const majorStepSec = useMemo(() => {
    if (pxPerSecond >= 180) return 1;
    if (pxPerSecond >= 100) return 2;
    if (pxPerSecond >= 60) return 5;
    if (pxPerSecond >= 30) return 10;
    return 30;
  }, [pxPerSecond]);

  const minorStepSec = majorStepSec / 5;

  const timeToX = (t: number) => t * pxPerSecond;
  const xToTime = (x: number) => x / pxPerSecond;

  const playheadX = timeToX(time);

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const rect = scroller.getBoundingClientRect();
    const xInView = e.clientX - rect.left;
    const x = scroller.scrollLeft + xInView;
    const time = clamp(xToTime(x), 0, durationSec);
    seekToAction(time);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handler = (ev: WheelEvent) => {
      if (ev.ctrlKey || ev.metaKey) {
        ev.preventDefault();
      }
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const dragRef = useRef<{ dragging: boolean; startX: number; startT: number } | null>(null);

  const onPlayheadPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { dragging: true, startX: e.clientX, startT: time };
    e.preventDefault();
  };

  const onPlayheadPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current?.dragging) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    const dt = xToTime(e.clientX - dragRef.current.startX);
    seekToAction(clamp(dragRef.current.startT + dt, 0, durationSec));
  };

  const onPlayheadPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }
  };


  const onWheel = (e: React.WheelEvent) => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      const rect = scroller.getBoundingClientRect();
      const cursorXInView = e.clientX - rect.left;
      const cursorX = scroller.scrollLeft + cursorXInView;
      const cursorTime = xToTime(cursorX);

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const next = clamp(pxPerSecond * zoomFactor, minPxPerSecond, 400);

      const nextCursorX = cursorTime * next;
      const nextScrollLeft = nextCursorX - cursorXInView;

      setPxPerSecond(next);
      requestAnimationFrame(() => {
        scroller.scrollLeft = nextScrollLeft;
      });
      return;
    }

    e.preventDefault();
    scroller.scrollLeft += e.deltaX !== 0 ? e.deltaX : e.deltaY;
  };



  return (
    <Box className="flex flex-col flex-1 min-h-0 p-2">
      <Box className="flex justify-between">
        {isPlaying ? (
          <Button onClick={pauseAction} variant="outlined" className="m-1">Pause</Button>
        ) : (
          <Button onClick={playAction} variant="outlined" className="m-1">Play</Button>
        )}

        <Box className="flex p-0 m-0 items-end">
          <Typography>{formatTime(time)}</Typography>
          <Typography color="text.secondary" className="mx-1">/</Typography>
          <Typography color="text.secondary">{formatTime(durationSec)}</Typography>
        </Box>
      </Box>
      <Paper variant="outlined" className="overflow-hidden">
        <Box
          ref={scrollRef}
          onClick={onSeek}
          onWheel={onWheel}
          sx={{
            position: "relative",
            width: "100%",
            overflowX: "auto",
            whiteSpace: "nowrap",
            flex: 1,
            cursor: "text"
          }}>
          <Box sx={{ position: "relative", height: rulerHeight, width: totalWidthPx, borderBottom: "1px solid", borderColor: "divider" }}>
            <Ruler
              durationSec={durationSec}
              pxPerSecond={pxPerSecond}
              majorStepSec={majorStepSec}
              minorStepSec={minorStepSec}
            />
          </Box>

          <Box
            sx={{
              position: "relative",
              width: totalWidthPx,
              height: tracks.length * trackHeight,
              bgcolor: "background.default",
            }}
          >
            {tracks.map((t, i) => (
              <Box
                key={t.id}
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: i * trackHeight,
                  height: trackHeight,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              />
            ))}

            <Box
              onPointerDown={onPlayheadPointerDown}
              onPointerMove={onPlayheadPointerMove}
              onPointerUp={onPlayheadPointerUp}
              sx={{
                position: "absolute",
                top: 0,
                left: playheadX,
                height: "100%",
                width: 0,
                borderLeft: "2px solid",
                borderColor: "primary.main",
                cursor: "ew-resize",
                // add a grab handle at top
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: -rulerHeight,
                  left: -6,
                  width: 12,
                  height: 12,
                  borderRadius: "2px",
                  bgcolor: "primary.main",
                },
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}




function Ruler({
  durationSec,
  pxPerSecond,
  majorStepSec,
  minorStepSec,
}: {
  durationSec: number;
  pxPerSecond: number;
  majorStepSec: number;
  minorStepSec: number;
}) {
  const ticks: Array<{ x: number; isMajor: boolean; label?: string }> = [];

  const minorCount = Math.floor(durationSec / minorStepSec);
  for (let i = 0; i <= minorCount; i++) {
    const t = i * minorStepSec;
    const x = t * pxPerSecond;
    const isMajor = Math.abs((t / majorStepSec) - Math.round(t / majorStepSec)) < 1e-9;
    ticks.push({
      x,
      isMajor,
      label: isMajor ? formatTime(t) : undefined,
    });
  }

  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      {ticks.map((tick, idx) => {
        if (idx === ticks.length - 1) {
          return null; // avoid overflow
        }
        return (<Box
          key={idx}
          sx={{
            position: "absolute",
            left: tick.x,
            top: 0,
            height: "100%",
            width: 0,
            borderLeft: "1px solid",
            borderColor: tick.isMajor ? "text.secondary" : "divider",
          }}
        >
          {tick.label && (
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                top: 2,
                left: 4,
                color: "text.secondary",
                userSelect: "none",
              }}
            >
              {tick.label}
            </Typography>
          )}
        </Box>)
      })}
    </Box>
  );
}
