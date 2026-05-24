import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const SPECIAL_EMOJIS = ["❤️", "💖", "🔥", "😍", "😘", "💋", "💞", "💘", "🥵", "✨"];

export function isSpecialEmoji(text: string) {
  return SPECIAL_EMOJIS.includes(text.trim());
}

type Trigger = { id: string; emoji: string };

type Burst = {
  id: string;
  emoji: string;
  combo: number;
  particles: Particle[];
  sparkles: Sparkle[];
  startedAt: number;
};

type Particle = {
  id: number;
  x: number;
  driftX: number;
  rise: number;
  rotate: number;
  scale: number;
  duration: number;
  delay: number;
  swayAmp: number;
};

type Sparkle = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  hue: number;
};

const THEME: Record<
  string,
  {
    glow: string;
    flash: string;
    ring: string;
    vibrate: number[];
    count: number;
    sparkleHueBase: number;
    label?: string;
  }
> = {
  "❤️": { glow: "0 0 18px rgba(255,40,90,.95), 0 0 38px rgba(255,80,140,.55)", flash: "rgba(255,60,120,0.45)", ring: "rgba(255,80,140,.9)", vibrate: [18, 30, 18], count: 55, sparkleHueBase: 340, label: "Loved it" },
  "💖": { glow: "0 0 18px rgba(255,120,210,.95), 0 0 36px rgba(255,80,200,.55)", flash: "rgba(255,120,210,0.5)", ring: "rgba(255,120,210,.95)", vibrate: [20, 25, 30, 25, 20], count: 60, sparkleHueBase: 320, label: "Heart burst" },
  "🔥": { glow: "0 0 18px rgba(255,140,40,.95), 0 0 38px rgba(255,60,20,.7)", flash: "rgba(255,120,40,0.55)", ring: "rgba(255,140,40,1)", vibrate: [40, 30, 60], count: 70, sparkleHueBase: 30, label: "On fire" },
  "😍": { glow: "0 0 18px rgba(255,90,170,.95), 0 0 34px rgba(255,140,210,.55)", flash: "rgba(255,120,180,0.45)", ring: "rgba(255,140,210,.95)", vibrate: [15, 20, 15], count: 55, sparkleHueBase: 320 },
  "😘": { glow: "0 0 18px rgba(255,80,140,.95), 0 0 34px rgba(255,140,180,.55)", flash: "rgba(255,100,160,0.45)", ring: "rgba(255,140,180,.95)", vibrate: [10, 20, 10, 20, 30], count: 55, sparkleHueBase: 340, label: "Mwah" },
  "💋": { glow: "0 0 18px rgba(255,30,80,.95), 0 0 34px rgba(255,80,120,.55)", flash: "rgba(255,40,90,0.5)", ring: "rgba(255,40,90,1)", vibrate: [25, 35, 25], count: 50, sparkleHueBase: 350 },
  "💞": { glow: "0 0 18px rgba(255,120,200,.95), 0 0 34px rgba(255,80,200,.55)", flash: "rgba(255,120,200,0.45)", ring: "rgba(255,120,200,.95)", vibrate: [15, 20, 25], count: 55, sparkleHueBase: 320 },
  "💘": { glow: "0 0 18px rgba(255,90,170,.95), 0 0 34px rgba(255,60,140,.55)", flash: "rgba(255,80,160,0.45)", ring: "rgba(255,80,160,.95)", vibrate: [20, 30, 20], count: 55, sparkleHueBase: 330 },
  "🥵": { glow: "0 0 18px rgba(255,80,40,.95), 0 0 34px rgba(255,40,40,.6)", flash: "rgba(255,80,40,0.55)", ring: "rgba(255,80,40,1)", vibrate: [40, 50, 40], count: 60, sparkleHueBase: 10, label: "Too hot" },
  "✨": { glow: "0 0 16px rgba(255,240,180,.95), 0 0 30px rgba(180,160,255,.7)", flash: "rgba(255,240,180,0.45)", ring: "rgba(255,240,180,.95)", vibrate: [10, 15, 10, 15, 10], count: 80, sparkleHueBase: 50, label: "Magic" },
};

function themeFor(e: string) {
  return THEME[e] ?? THEME["❤️"];
}

function buildParticles(emoji: string, count: number): Particle[] {
  const isFire = emoji === "🔥" || emoji === "🥵";
  const isSparkle = emoji === "✨";
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    driftX: (Math.random() - 0.5) * (isSparkle ? 220 : 320),
    rise: isFire ? 80 + Math.random() * 35 : 95 + Math.random() * 25,
    rotate: (Math.random() - 0.5) * (isFire ? 80 : 420),
    scale: 0.55 + Math.random() * 1.6,
    duration: 2.4 + Math.random() * 1.8,
    delay: Math.random() * 0.7,
    swayAmp: 18 + Math.random() * 32,
  }));
}

function buildSparkles(hueBase: number, count = 70): Sparkle[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 30 + Math.random() * 70,
    size: 3 + Math.random() * 6,
    delay: Math.random() * 1.2,
    duration: 0.9 + Math.random() * 1.4,
    hue: hueBase + (Math.random() - 0.5) * 60,
  }));
}

export function CinematicReactions({ triggers }: { triggers: Trigger[] }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const lastByEmojiRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (triggers.length === 0) return;
    const last = triggers[triggers.length - 1];
    if (seenRef.current.has(last.id)) return;
    seenRef.current.add(last.id);

    const now = Date.now();
    const prev = lastByEmojiRef.current[last.emoji] ?? 0;
    const within = now - prev < 2000;
    const t = themeFor(last.emoji);
    lastByEmojiRef.current[last.emoji] = now;

    setBursts((b) => {
      const existingCombo = within
        ? Math.max(0, ...b.filter((x) => x.emoji === last.emoji).map((x) => x.combo))
        : 0;
      const combo = existingCombo + 1;
      const next: Burst = {
        id: last.id,
        emoji: last.emoji,
        combo,
        particles: buildParticles(last.emoji, t.count + combo * 6),
        sparkles: buildSparkles(t.sparkleHueBase, 60 + combo * 10),
        startedAt: now,
      };
      return [...b.slice(-3), next];
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(t.vibrate);
    }

    const id = last.id;
    const timeout = setTimeout(() => {
      setBursts((b) => b.filter((x) => x.id !== id));
    }, 4800);
    return () => clearTimeout(timeout);
  }, [triggers]);

  const activeShake = bursts.length > 0 ? bursts[bursts.length - 1] : null;

  return (
    <>
      {/* Screen shake wrapper - applied via fixed overlay only, doesn't affect chat */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
        animate={
          activeShake
            ? {
                x: [0, -6, 6, -4, 4, -2, 2, 0],
                y: [0, 4, -4, 3, -3, 2, -2, 0],
              }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.6, ease: "easeOut" }}
        key={activeShake?.id ?? "idle"}
      >
        <AnimatePresence>
          {bursts.map((b) => {
            const t = themeFor(b.emoji);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                {/* Edge vignette glow */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.7, 0.4, 0] }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 50% 60%, transparent 35%, ${t.flash} 110%)`,
                    mixBlendMode: "screen",
                  }}
                />

                {/* Color flash */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.35, 0] }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-0"
                  style={{ background: t.flash, mixBlendMode: "screen" }}
                />

                {/* Shockwave rings */}
                {[0, 0.18, 0.36].map((delay, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.1 }}
                    animate={{ opacity: [0, 0.85, 0], scale: [0.1, 1.6, 2.4] }}
                    transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      border: `2px solid ${t.ring}`,
                      boxShadow: `0 0 40px ${t.ring}, inset 0 0 40px ${t.ring}`,
                    }}
                  />
                ))}

                {/* Hero pop emoji */}
                <motion.div
                  initial={{ scale: 0.1, opacity: 0, rotate: -20 }}
                  animate={{
                    scale: [0.1, 1.8, 1.3, 1.1, 0],
                    opacity: [0, 1, 1, 1, 0],
                    rotate: [-20, 8, -4, 0, 0],
                  }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], times: [0, 0.25, 0.45, 0.7, 1] }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[140px] leading-none"
                  style={{ filter: `drop-shadow(${t.glow})`, willChange: "transform, opacity" }}
                >
                  {b.emoji}
                </motion.div>

                {/* Combo badge */}
                {b.combo > 1 && (
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0, y: 30 }}
                    animate={{
                      scale: [0.4, 1.4, 1],
                      opacity: [0, 1, 1, 0],
                      y: [30, -10, -20, -60],
                    }}
                    transition={{ duration: 2, ease: "easeOut", times: [0, 0.2, 0.6, 1] }}
                    className="absolute left-1/2 top-[58%] -translate-x-1/2 text-center"
                  >
                    <div
                      className="text-5xl font-black tracking-tight"
                      style={{
                        background: "linear-gradient(135deg,#fff,#ffd1ff,#fff)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: `drop-shadow(${t.glow})`,
                      }}
                    >
                      ×{b.combo}
                    </div>
                    <div
                      className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90"
                      style={{ filter: `drop-shadow(${t.glow})` }}
                    >
                      {b.combo >= 5 ? "INSANE COMBO" : b.combo >= 3 ? "COMBO!" : t.label ?? "Vibe"}
                    </div>
                  </motion.div>
                )}

                {/* Sparkle dust */}
                {b.sparkles.map((s) => (
                  <motion.span
                    key={`s-${s.id}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
                    transition={{ duration: s.duration, delay: s.delay, ease: "easeOut" }}
                    className="absolute rounded-full"
                    style={{
                      left: `${s.x}vw`,
                      top: `${s.y}vh`,
                      width: s.size,
                      height: s.size,
                      background: `hsl(${s.hue}, 100%, 75%)`,
                      boxShadow: `0 0 ${s.size * 3}px hsl(${s.hue}, 100%, 70%)`,
                      willChange: "transform, opacity",
                    }}
                  />
                ))}

                {/* Floating emoji particles */}
                {b.particles.map((p) => (
                  <motion.span
                    key={`p-${p.id}`}
                    initial={{ x: 0, y: 0, opacity: 0, scale: p.scale * 0.3, rotate: 0 }}
                    animate={{
                      x: [0, p.driftX * 0.4, p.driftX],
                      y: [0, `-${p.rise * 0.5}vh`, `-${p.rise}vh`],
                      opacity: [0, 1, 1, 0],
                      scale: [p.scale * 0.3, p.scale, p.scale * 0.85],
                      rotate: [0, p.rotate * 0.5, p.rotate],
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      ease: [0.22, 1, 0.36, 1],
                      times: [0, 0.3, 0.7, 1],
                    }}
                    className="absolute"
                    style={{
                      left: `${p.x}vw`,
                      top: `108vh`,
                      fontSize: `${22 + p.scale * 18}px`,
                      filter: `drop-shadow(${t.glow})`,
                      willChange: "transform, opacity",
                    }}
                  >
                    {b.emoji}
                  </motion.span>
                ))}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
