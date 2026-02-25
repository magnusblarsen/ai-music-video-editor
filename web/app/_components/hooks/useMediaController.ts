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
  const timeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const hasExternalAudio = !!audioSrc;

  const rafIdRef = useRef<number | null>(null);

  const pendingAudioSeekRef = useRef<number | null>(null);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const setUiTimeThrottled = useRef({ last: 0 });
  const tick = useCallback(
    (ts: number) => {
      const v = videoRef.current;
      const a = audioRef.current;

      if (v) {
        timeRef.current = v.currentTime;

        const minDt = 1000 / uiFps;
        if (ts - setUiTimeThrottled.current.last >= minDt) {
          setUiTimeThrottled.current.last = ts;
          setTime(v.currentTime);
        }
      }

      // handle drift
      if (v && a && hasExternalAudio && !v.paused && !a.paused) {
        const diff = a.currentTime - v.currentTime;

        if (Math.abs(diff) > driftSnapThresholdSec) {
          try {
            a.currentTime = v.currentTime;
          } catch { }
          a.playbackRate = v.playbackRate;
        } else if (Math.abs(diff) > driftNudgeThresholdSec) {
          const direction = diff > 0 ? -1 : 1;
          a.playbackRate = v.playbackRate + direction * driftNudgeAmount;
        } else {
          a.playbackRate = v.playbackRate;
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [
      hasExternalAudio,
      driftSnapThresholdSec,
      driftNudgeThresholdSec,
      driftNudgeAmount,
      uiFps,
    ]
  );

  const ensureRaf = useCallback(() => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const trySetAudioTime = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;

    try {
      a.currentTime = t;
      pendingAudioSeekRef.current = null;
    } catch {
      console.log("Audio seek failed")
      pendingAudioSeekRef.current = t;
    }
  }, []);

  const syncAudioToVideo = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a || !hasExternalAudio) return;

    trySetAudioTime(v.currentTime);
    a.playbackRate = v.playbackRate;
  }, [hasExternalAudio, trySetAudioTime]);

  const play = useCallback(async () => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    // You never want video audio
    v.muted = true;
    v.volume = 0;

    if (hasExternalAudio && a) {
      syncAudioToVideo();
    }

    try {
      await v.play();

      if (hasExternalAudio && a) {
        try {
          await a.play();
        } catch {
          // Autoplay restrictions can block audio until user gesture
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [hasExternalAudio, syncAudioToVideo]);

  const pause = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    v?.pause();
    if (hasExternalAudio) {
      a?.pause();
      if (v && a) a.playbackRate = v.playbackRate; // reset any nudge
    }

    // force UI time update on pause
    if (v) setTime(v.currentTime);
  }, [hasExternalAudio]);

  const seekTo = useCallback(
    (seconds: number) => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (!v) return;

      const t = Math.max(0, seconds);
      v.currentTime = t;
      timeRef.current = t;
      setTime(t);

      if (hasExternalAudio && a) {
        trySetAudioTime(t);
      }
    },
    [hasExternalAudio, trySetAudioTime]
  );

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    // Set “never play video audio” once when we have the element
    v.muted = true;
    v.volume = 0;

    const onLoadedMetadata = () => {
      setTime(v.currentTime);
      timeRef.current = v.currentTime;
    };

    const onPlay = () => {
      setIsPlaying(true);
      ensureRaf();
      if (hasExternalAudio) syncAudioToVideo();
    };

    const onPause = () => {
      setIsPlaying(false);
      stopRaf();
      setTime(v.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      stopRaf();
      if (hasExternalAudio && a) {
        a.pause();
        a.playbackRate = v.playbackRate;
      }
      setTime(v.currentTime);
    };

    const onSeeking = () => {
      // while scrubbing via native video controls
      if (hasExternalAudio) syncAudioToVideo();
      setTime(v.currentTime);
    };

    const onSeeked = () => {
      if (hasExternalAudio) syncAudioToVideo();
      setTime(v.currentTime);
    };

    const onRateChange = () => {
      if (hasExternalAudio) syncAudioToVideo();
    };

    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("ratechange", onRateChange);

    const onAudioLoadedMetadata = () => {
      const pending = pendingAudioSeekRef.current;
      if (pending != null) trySetAudioTime(pending);

      if (a && Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    a?.addEventListener("loadedmetadata", onAudioLoadedMetadata);

    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("ratechange", onRateChange);

      a?.removeEventListener("loadedmetadata", onAudioLoadedMetadata);
      stopRaf();
    };
  }, [ensureRaf, stopRaf, hasExternalAudio, syncAudioToVideo, trySetAudioTime]);

  // If audioSrc changes while playing, start it in sync
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    v.muted = true;
    v.volume = 0;

    if (hasExternalAudio && a && !v.paused) {
      syncAudioToVideo();
      a.play().catch(() => { });
    }
  }, [hasExternalAudio, syncAudioToVideo]);

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
