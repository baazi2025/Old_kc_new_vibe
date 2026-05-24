import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { UIEvent } from "react";
import { useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Crown, Heart, Loader2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Welcome to the Vibe" },
      {
        name: "description",
        content: "Choose Friends vibe or Romance vibe and join as a Prime Viber or Guest vibe.",
      },
      { property: "og:title", content: "Welcome to the Vibe" },
      {
        property: "og:description",
        content: "Choose Friends vibe or Romance vibe and join as a Prime Viber or Guest vibe.",
      },
    ],
  }),
  component: Home,
});

const VIBES = [
  {
    id: "friends",
    title: "Friends vibe",
    sub: "Meet friendly people and start easy conversations.",
    icon: Users,
    accent: "from-cyan-400 to-sky-500",
  },
  {
    id: "romance",
    title: "Romance vibe",
    sub: "A softer room for sweet, respectful connection.",
    icon: Heart,
    accent: "from-rose-400 to-pink-500",
  },
] as const;

const CHAOS_LEGENDS = [
  "👑 PL — ladies’ favourite since prehistoric internet days",
  "✨ AM — certified aura supplier",
  "🎤 GG — singer who never skipped a mic night",
  "❄️ Frosty — vanished without explanation… probably still typing somewhere",
  "🇲🇱 Sathyan — official Malayalam department",
  "😈 Sathan — management still monitoring him carefully",
  "🎶 Chellamma — super singer girl of the century",
  "🫧 Broken Angel — bubbly energy overload",
  "🎵 Mastani — northy singer girl with midnight vibes",
  "🐍 Rattles — dangerous after 11 PM",
  "🌀 Zia & Siya — double trouble combo pack",
  "🦠 Covidian — survived every online era somehow",
  "👻 Paavam Jinn — emotionally available ghost",
  "🌧️ Blue Rain — Sathans partner in crime",
  "✨ Chaithra — calm outside, chaos inside",
  "🚨 F37 — nobody still knows what the “F” means",
  "😎 Super Cool Paavam VIP — VIP by emotions, not by money",
  "🎙️ CM — singer by talent, storyteller by destiny",
  "🌫️ Mist — permanently mysterious… even Google can’t explain",
  "📖 Eware — philosophy department + emotional singing combo pack",
  "😎 Vishnu — online presence stronger than WiFi signals",
  "🎨 Masterpiece — behaves like limited edition artwork",
  "🎧 Shaaz — enters quietly, leaves with emotional damage",
  "🇦🇪 Rahul Dubai — unofficial Dubai branch manager",
  "🗿 BHeegaran — fear level increases when typing starts",
  "🌸 Gopika — calm voice, dangerous roasting skills",
  "✨ Samantha — elegant outside, chaos creator inside",
  "🦋 Tessa — sweet until provoked after midnight",
  "🙏 Kripa — spiritually calm during maximum chat violence",
  "❄️ Snowy — cold replies, warm heart… sometimes",
];

const CHAOS_WARNINGS = [
  "Random midnight singing",
  "Emotional damage",
  "Fake fights that become real fights",
  "Malayalam chaos",
  "People falling in fake love",
  "Unexpected friendships",
  "“Who are you?” moments",
  "Users disappearing and returning after 8 months saying “hi”",
  "Someone typing “gn” and staying online for 2 more hours",
  "Philosophical debates at 3 AM",
  "Voice notes nobody asked for",
  "Sudden roast sessions",
  "Ghost typing activities 👻",
];

function Home() {
  const nav = useNavigate();
  const [entered, setEntered] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("vibes") === "1"
  );
  const [showChaosWelcome, setShowChaosWelcome] = useState(false);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const [selected, setSelected] = useState<(typeof VIBES)[number]["id"]>("friends");
  const [guestLoading, setGuestLoading] = useState(false);
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  async function guestLogin() {
    if (!gender) return toast.error("Please choose gender");
    if (!dob) return toast.error("Please enter date of birth");
    setGuestLoading(true);
    const guestName = `Guest_${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { username: guestName, avatar_emoji: selected === "romance" ? "💞" : "🎉", gender, dob } },
    });
    setGuestLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Vibing as ${guestName}`);
    nav({ to: "/chat" });
  }

  function openChaosWelcome() {
    setScrollUnlocked(false);
    setShowChaosWelcome(true);
  }

  function handleChaosScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    if (!reachedBottom || scrollUnlocked) return;
    setScrollUnlocked(true);
    setTimeout(() => {
      setShowChaosWelcome(false);
      setEntered(true);
    }, 650);
  }

  return (
    <div className="relative min-h-screen overflow-hidden grid-bg">
      <AmbientOrbs />

      {showChaosWelcome && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/86 px-3 pb-4 pt-12 backdrop-blur-md sm:items-center sm:py-6">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-slate-950/96 shadow-2xl shadow-slate-950/70">
            <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/18 via-fuchsia-500/14 to-amber-300/12 p-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Before you enter</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                🌙 Welcome Back to the Chaos Room™
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Please stand silently for 3 seconds in tribute to the legendary chatroom souls who once ruled the nights 👀
              </p>
            </div>

            <div onScroll={handleChaosScroll} className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
              <div className="grid gap-2 sm:grid-cols-2">
                {CHAOS_LEGENDS.map((legend) => (
                  <div key={legend} className="rounded-2xl border border-white/10 bg-white/7 px-3 py-2 text-xs font-bold leading-5 text-slate-100">
                    {legend}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="text-sm font-black text-amber-200">⚠️ Warning:</p>
                <p className="mt-1 text-xs font-bold text-slate-300">This room may contain:</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {CHAOS_WARNINGS.map((warning) => (
                    <div key={warning} className="rounded-xl bg-slate-950/45 px-3 py-2 text-xs leading-5 text-slate-200">
                      • {warning}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-16" />
            </div>

            <div className="border-t border-white/10 bg-slate-950/90 p-4 text-center">
              <p className={`text-xs font-bold transition ${scrollUnlocked ? "text-emerald-300" : "text-slate-300"}`}>
                {scrollUnlocked
                  ? "Entering the vibe..."
                  : "Scroll the full message to enter. Mental stability check in progress."}
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hero shadow-glow">
              <Sparkles size={18} className="text-white" />
            </div>
            <p className="text-sm font-bold">
              Vibe<span className="text-gradient">Malayali</span>
            </p>
          </div>
          {entered && (
            <button
              type="button"
              onClick={() => setEntered(false)}
              className="rounded-full glass px-4 py-2 text-xs font-semibold text-muted-foreground"
            >
              Back
            </button>
          )}
        </div>

        {!entered ? (
          <button
            type="button"
            onClick={openChaosWelcome}
            className="group flex flex-1 flex-col items-center justify-center text-center outline-none"
          >
            <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-hero shadow-neon transition-transform group-hover:scale-105">
              <Sparkles size={28} className="text-white" />
            </span>
            <span className="text-5xl font-extrabold leading-tight">
              Welcome to
              <br />
              <span className="text-gradient">the Vibe</span>
            </span>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full glass px-5 py-3 text-sm font-semibold">
              Tap to enter <ArrowRight size={16} />
            </span>
          </button>
        ) : (
          <section className="flex flex-1 flex-col justify-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--neon-cyan)]">
                Choose your vibe
              </p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight">
                Friends or
                <br />
                <span className="text-gradient">Romance</span>
              </h1>
            </div>

            <div className="mt-7 grid gap-3">
              {VIBES.map(({ id, title, sub, icon: Icon, accent }) => {
                const active = selected === id;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setSelected(id)}
                    className={`relative overflow-hidden rounded-2xl p-4 text-left transition ${
                      active ? "glass-strong shadow-neon" : "glass"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${accent} ${active ? "opacity-25" : "opacity-10"}`} />
                    <div className="relative flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent}`}>
                        <Icon size={22} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold">{title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                      </div>
                      <span
                        className={`h-3 w-3 rounded-full border ${
                          active ? "border-white bg-white shadow-glow" : "border-white/40"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
                >
                  <option value="">Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not">Prefer not to say</option>
                </select>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
                />
              </div>
              <Link
                to="/login"
                className="btn-neon flex items-center justify-center gap-2 text-sm"
              >
                <Crown size={17} /> Join as Prime Viber
              </Link>
              <button
                type="button"
                onClick={guestLogin}
                disabled={guestLoading}
                className="flex items-center justify-center gap-2 rounded-full glass px-5 py-3 text-sm font-semibold disabled:opacity-70"
              >
                {guestLoading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                Guest vibe
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
