"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MediaControllerOptions = {
  /** Snap audio to video if drift exceeds this */
  driftSnapThresholdSec?: number;

  /** Small drift: gently nudge playbackRate instead of snapping */
  driftNudgeThresholdSec?: number;

  /** How much to nudge playbackRate (e.g. 0.02 means 0.98..1.02) */
  driftNudgeAmount?: number;
};

export function useMediaController(opts: MediaControllerOptions = {}) {
  const {
    driftSnapThresholdSec = 0.15,
    driftNudgeThresholdSec = 0.04,
    driftNudgeAmount = 0.02,
  } = opts;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const rafIdRef = useRef<number | null>(null);

  const hasExternalAudio = !!audioSrc;

  const stopRaf = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    if (v) {
      setTime(v.currentTime); // TODO: Calls on every animation frame. Should be throttled.

      // duration is available after metadata is loaded
      if (Number.isFinite(v.duration) && v.duration > 0) {
        setDuration(v.duration);
      }
    }

    // NOTE: Drift correction
    if (v && a && hasExternalAudio && !v.paused && !a.paused) {
      const diff = a.currentTime - v.currentTime;

      if (Math.abs(diff) > driftSnapThresholdSec) {
        try {
          a.currentTime = v.currentTime;
        } catch { }
        a.playbackRate = v.playbackRate;
      } else if (Math.abs(diff) > driftNudgeThresholdSec) {
        // nudge if small drift
        const direction = diff > 0 ? -1 : 1;
        a.playbackRate = v.playbackRate + direction * driftNudgeAmount;
      } else {
        a.playbackRate = v.playbackRate;
      }
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }, [
    hasExternalAudio,
    driftSnapThresholdSec,
    driftNudgeThresholdSec,
    driftNudgeAmount,
  ]);

  const ensureRaf = useCallback(() => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const syncAudioToVideoTime = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a || !hasExternalAudio) return;

    try {
      a.currentTime = v.currentTime;
    } catch { }
  }, [hasExternalAudio]);

  const syncAudioPlaybackRate = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a || !hasExternalAudio) return;
    a.playbackRate = v.playbackRate;
  }, [hasExternalAudio]);

  const play = useCallback(async () => {
    const v = videoRef.current;
    const a = audioRef.current;

    if (!v) return;

    v.muted = true;

    if (hasExternalAudio && a) {
      syncAudioToVideoTime();
      syncAudioPlaybackRate();
    }

    try {
      await v.play();
      if (hasExternalAudio && a) {
        try {
          await a.play();
        } catch {
        }
      }
    } catch (e) {
      console.error(e);
      // NOTE: some browsers block autoplay of audio?
    }
  }, [
    hasExternalAudio,
    syncAudioToVideoTime,
    syncAudioPlaybackRate,
  ]);

  const pause = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    v?.pause();
    if (hasExternalAudio) a?.pause();
  }, [hasExternalAudio]);

  const seekTo = useCallback(
    (seconds: number) => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (!v) return;

      const t = Math.max(0, seconds);
      v.currentTime = t;

      if (hasExternalAudio && a) {
        try {
          a.currentTime = t;
        } catch { }
      }

      setTime(t);
    },
    [hasExternalAudio]
  );

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      setTime(v.currentTime);
      if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    };

    const onPlay = () => {
      setIsPlaying(true);
      ensureRaf();

      if (hasExternalAudio) {
        syncAudioToVideoTime()
        syncAudioPlaybackRate()
        a?.play().catch(() => { })
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      stopRaf();
      setTime(v.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      stopRaf();
      if (hasExternalAudio && a) a.pause();
      setTime(v.currentTime);
    };

    const onSeeked = () => {
      if (hasExternalAudio) syncAudioToVideoTime();
      setTime(v.currentTime);
    };

    const onRateChange = () => {
      if (hasExternalAudio) syncAudioPlaybackRate();
    };

    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("ratechange", onRateChange);

    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("ratechange", onRateChange);
      stopRaf();
    };
  }, [
    ensureRaf,
    stopRaf,
    hasExternalAudio,
    syncAudioToVideoTime,
    syncAudioPlaybackRate,
  ]);

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    v.muted = true;

    if (hasExternalAudio && a && !v.paused) {
      syncAudioToVideoTime();
      syncAudioPlaybackRate();
      a.play().catch(() => { });
    }
  }, [
    hasExternalAudio,
    syncAudioToVideoTime,
    syncAudioPlaybackRate,
  ]);

  return {
    // refs
    videoRef,
    audioRef,

    // state
    time,
    isPlaying,
    duration,

    // audio
    audioSrc,
    setAudioSrc,

    // actions
    play,
    pause,
    seekTo,
  };
}
