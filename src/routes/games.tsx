import { createFileRoute } from "@tanstack/react-router";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BottomNav } from "@/components/BottomNav";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/games")({
  head: () =>
    seo({
      title: "Malayali Mini Games | Play Together in Chat Rooms",
      description:
        "Play lightweight social mini games with Malayali friends inside Vibemalayali Chat rooms.",
      path: "/games",
    }),
  component: Games,
});

const GAMES = [
  { name: "Ludo King", emoji: "🎲", players: "12.4k", hue: "from-rose-500 to-pink-600" },
  { name: "Spin Wheel", emoji: "🎡", players: "8.2k", hue: "from-amber-400 to-orange-600" },
  { name: "Truth or Dare", emoji: "💋", players: "6.7k", hue: "from-fuchsia-500 to-purple-600" },
  { name: "Malayalam Quiz", emoji: "🧠", players: "5.1k", hue: "from-cyan-400 to-blue-600" },
  { name: "Word Guess", emoji: "🔤", players: "3.9k", hue: "from-emerald-400 to-teal-600" },
  { name: "Couple Match", emoji: "💕", players: "9.0k", hue: "from-pink-400 to-rose-600" },
  { name: "Rapid Fire", emoji: "🔥", players: "4.4k", hue: "from-orange-400 to-red-600" },
  { name: "Emoji Guess", emoji: "🎭", players: "7.1k", hue: "from-violet-400 to-indigo-600" },
];

function Games() {
  return (
    <div className="relative min-h-screen grid-bg lg:pl-[72px]">
      <AmbientOrbs />
      <div className="mx-auto max-w-md px-4 pt-8 pb-32">
        <p className="text-xs text-muted-foreground">Multiplayer Arena</p>
        <h1 className="font-mal text-3xl font-extrabold mt-1">
          <span className="text-gradient">Kalikkam</span> together 🎮
        </h1>

        <div className="mt-5 rounded-3xl glass-strong p-5 shadow-neon overflow-hidden relative">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold opacity-30 blur-2xl" />
          <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">
            🏆 Weekly Challenge
          </p>
          <p className="font-bold mt-1">Win 10,000 coins this week</p>
          <p className="text-[11px] text-muted-foreground mt-1">Top 100 gamers get cash coupons</p>
          <div className="mt-3 h-2 rounded-full bg-input overflow-hidden">
            <div className="h-full w-2/3 bg-gold shimmer rounded-full" />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">6,420 / 10,000 XP</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {GAMES.map((g) => (
            <button
              key={g.name}
              className="group relative aspect-[4/5] overflow-hidden rounded-3xl glass shadow-glow transition-transform active:scale-95 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${g.hue} opacity-40 group-hover:opacity-60 transition`} />
              <div className="relative h-full p-4 flex flex-col">
                <div className="text-5xl drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{g.emoji}</div>
                <div className="mt-auto text-left">
                  <p className="text-sm font-bold">{g.name}</p>
                  <p className="text-[10px] text-white/80 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    {g.players} playing
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
