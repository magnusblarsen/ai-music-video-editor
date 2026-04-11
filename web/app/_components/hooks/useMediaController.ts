"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MediaControllerOptions = {
  driftSnapThresholdSec?: number;
  driftNudgeThresholdSec?: number;
  driftNudgeAmount?: number;

  uiFps?: number;
};

export function useMediaController(opts: MediaControllerOptions = {}) {
  const {
    driftSnapThresholdSec = 0.15,
    driftNudgeThresholdSec = 0.04,
    driftNudgeAmount = 0.02,
    uiFps = 15,
  } = opts;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [time, setTime] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const rafIdRef = useRef<number | null>(null);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const setUiTimeThrottled = useRef({ last: 0 });
  const tickRef = useRef<(ts: number) => void>(() => { })

  const tick = useCallback(
    (ts: number) => {
      const v = videoRef.current;
      const a = audioRef.current;
      const source = v ?? a;

      if (source) {
        const minDt = 1000 / uiFps;
        if (ts - setUiTimeThrottled.current.last >= minDt) {
          setUiTimeThrottled.current.last = ts;
          setTime(source.currentTime);
        }
      }

      // handle drift
      if (v && a && !v.paused && !a.paused) {
        const diff = v.currentTime - a.currentTime;

        if (Math.abs(diff) > driftSnapThresholdSec) {
          try {
            v.currentTime = a.currentTime;
          } catch { }
          v.playbackRate = a.playbackRate;
        } else if (Math.abs(diff) > driftNudgeThresholdSec) {
          const direction = diff > 0 ? -1 : 1;
          v.playbackRate = a.playbackRate + direction * driftNudgeAmount;
        } else {
          v.playbackRate = a.playbackRate;
        }
      }

      rafIdRef.current = requestAnimationFrame(tickRef.current);
    },
    [
      driftSnapThresholdSec,
      driftNudgeThresholdSec,
      driftNudgeAmount,
      uiFps,
    ]
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick])

  const ensureRaf = useCallback(() => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);


  const play = useCallback(async () => {
    const a = audioRef.current;
    const v = videoRef.current;

    await a?.play().catch(console.error);
    if (v) {
      v.muted = true;
      v.currentTime = a?.currentTime ?? 0;
      await v.play().catch(console.error);
    }
  }, []);


  const pause = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    a?.pause();
    v?.pause();

    if (a) setTime(a.currentTime);
  }, [])


  const seekTo = useCallback(
    (seconds: number) => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (!a) return;

      const t = Math.max(0, seconds);

      a.currentTime = t;
      setTime(t);

      if (v) {
        v.currentTime = t;
      }

    },
    []
  );

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => {
      setIsPlaying(true)
      ensureRaf()
    }

    const onPause = () => {
      setIsPlaying(false)
      stopRaf()
      setTime(a.currentTime)
    }

    const onEnded = () => {
      setIsPlaying(false)
      stopRaf()
    }
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("loadedmetadata", onMeta);

    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, [ensureRaf, stopRaf, audioSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
  }, []);


  return {
    videoRef,
    audioRef,

    time,
    isPlaying,
    duration,

    audioSrc,
    setAudioSrc,

    play,
    pause,
    seekTo,
  };
}
