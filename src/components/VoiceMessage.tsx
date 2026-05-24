import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const BAR_COUNT = 32;

function seedBars(seed: string) {
  // deterministic pseudo-waveform from message id so playback bars are stable
  const bars: number[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    bars.push(0.25 + ((h % 1000) / 1000) * 0.75);
  }
  return bars;
}

export function VoiceMessage({
  url,
  durationMs,
  mine,
  id,
  muted = false,
}: {
  url: string;
  durationMs: number | null;
  mine: boolean;
  id: string;
  muted?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const bars = seedBars(id);

  useEffect(() => {
    const a = new Audio(url);
    a.preload = "metadata";
    a.muted = muted;
    audioRef.current = a;
    const onTime = () => {
      if (a.duration && isFinite(a.duration)) setProgress(a.currentTime / a.duration);
    };
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); if (navigator.vibrate) navigator.vibrate(10); }
  }

  const totalSec = Math.max(1, Math.round((durationMs ?? 0) / 1000));
  const mm = Math.floor(totalSec / 60).toString().padStart(1, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");

  return (
    <div className={`flex items-center gap-2.5 min-w-[200px] ${mine ? "text-white" : ""}`}>
      <button
        onClick={toggle}
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${
          mine ? "bg-white/25" : "bg-foreground/10"
        }`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-7">
        {bars.map((b, i) => {
          const filled = i / BAR_COUNT < progress;
          return (
            <span
              key={i}
              className="w-[3px] rounded-full transition-colors"
              style={{
                height: `${Math.round(b * 100)}%`,
                background: filled
                  ? mine ? "rgba(255,255,255,0.95)" : "hsl(var(--primary))"
                  : mine ? "rgba(255,255,255,0.4)" : "hsl(var(--muted-foreground) / 0.45)",
              }}
            />
          );
        })}
      </div>
      <span className="text-[10px] tabular-nums opacity-80 shrink-0">{mm}:{ss}</span>
    </div>
  );
}
