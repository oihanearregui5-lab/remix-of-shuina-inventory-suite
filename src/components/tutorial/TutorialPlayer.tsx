import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHAPTERS, formatTime } from "./chapters";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  videoId: string;
  userId: string;
}

const SPEEDS = [0.5, 1, 1.5, 2];

const storageKey = (uid: string, vid: string) => `tutorial-progress:${uid}:${vid}`;

export function TutorialPlayer({ src, videoId, userId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [resumeMsg, setResumeMsg] = useState(false);
  const [skipFeedback, setSkipFeedback] = useState<"+15" | "-15" | null>(null);
  const lastTapRef = useRef<{ time: number; side: "L" | "R" } | null>(null);

  // Resume from saved progress
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const saved = localStorage.getItem(storageKey(userId, videoId));
    const onLoaded = () => {
      setDuration(v.duration || 0);
      if (saved) {
        const t = parseFloat(saved);
        if (!isNaN(t) && t > 3 && t < (v.duration || 0) - 2) {
          v.currentTime = t;
          setResumeMsg(true);
          setTimeout(() => setResumeMsg(false), 3500);
        }
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [src, videoId, userId]);

  // Save progress periodically
  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && !v.paused && v.currentTime > 0) {
        localStorage.setItem(storageKey(userId, videoId), String(v.currentTime));
      }
    }, 3000);
    return () => clearInterval(id);
  }, [videoId, userId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v) setCurrent(v.currentTime);
  };

  const onEnded = () => {
    localStorage.removeItem(storageKey(userId, videoId));
    setPlaying(false);
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration || t, t));
  };

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    seekTo(v.currentTime + delta);
    setSkipFeedback(delta > 0 ? "+15" : "-15");
    setTimeout(() => setSkipFeedback(null), 600);
  };

  const handleTap = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.changedTouches[0].clientX - rect.left;
    const side: "L" | "R" = x < rect.width / 2 ? "L" : "R";
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && now - last.time < 350 && last.side === side) {
      skip(side === "R" ? 15 : -15);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, side };
    }
  }, [duration]);

  const setSpeedValue = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const fullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const currentChapter = CHAPTERS.reduce((acc, c) => (current >= c.time ? c : acc), CHAPTERS[0]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-black"
        onTouchEnd={handleTap}
      >
        <video
          ref={videoRef}
          src={src}
          className="aspect-video w-full"
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onVolumeChange={(e) => setMuted((e.target as HTMLVideoElement).muted)}
          playsInline
        />

        {skipFeedback && (
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-2 text-lg font-semibold text-white",
              skipFeedback === "+15" ? "right-8" : "left-8",
            )}
          >
            {skipFeedback === "+15" ? "+15s" : "-15s"}
          </div>
        )}

        {resumeMsg && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-sm text-white">
            Continuando desde donde lo dejaste
          </div>
        )}

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/80 to-transparent p-3">
          <Slider
            value={[duration ? (current / duration) * 100 : 0]}
            onValueChange={(v) => seekTo(((v[0] ?? 0) / 100) * (duration || 0))}
            max={100}
            step={0.1}
          />
          <div className="flex items-center gap-2 text-white">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 hover:text-white" onClick={togglePlay}>
              {playing ? <Pause /> : <Play />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 hover:text-white"
              onClick={() => {
                const v = videoRef.current;
                if (v) v.muted = !v.muted;
              }}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
            <span className="text-xs tabular-nums">
              {formatTime(current)} / {formatTime(duration)}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1 text-white hover:bg-white/20 hover:text-white">
                    <Gauge className="h-4 w-4" /> x{speed}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100]">
                  {SPEEDS.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setSpeedValue(s)}>
                      x{s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 hover:text-white" onClick={fullscreen}>
                <Maximize />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters list */}
      <div className="rounded-2xl border bg-card p-3">
        <h3 className="mb-2 px-2 text-sm font-semibold">Capítulos</h3>
        <ul className="max-h-[480px] space-y-1 overflow-y-auto">
          {CHAPTERS.map((c) => {
            const active = currentChapter.time === c.time;
            return (
              <li key={c.time}>
                <button
                  onClick={() => {
                    seekTo(c.time);
                    videoRef.current?.play();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className={cn("tabular-nums text-xs", active ? "opacity-90" : "text-muted-foreground")}>
                    {formatTime(c.time)}
                  </span>
                  <span className="flex-1">{c.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
