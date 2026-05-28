import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { CommunityPolicyModal } from "@/components/CommunityPolicyModal";
import { KcWelcomeOverlay } from "@/components/KcWelcomeOverlay";
import { GuestExpiryNotice } from "@/components/GuestExpiryNotice";
import { supabase } from "@/integrations/supabase/client";
import { cleanUsername, ensureUsernameAvailable } from "@/lib/username";
import { ensureProfileForUser } from "@/lib/authProfile";
import { errorMessage } from "@/lib/errorMessage";
import { ArrowRight, Camera, Crown, Gift, Heart, Loader2, Mic, Sparkles, Trophy, Users, WalletCards, Zap } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Malayali Community Platform | Chat Rooms, Radio & Friends Worldwide",
      description:
        "Join Vibemalayali Chat — a nostalgic KC Chat-inspired Malayali community platform to chat, join rooms, listen to radio, share voice notes, play mini games, and connect with Malayalis worldwide.",
      path: "/",
    }),
  component: Home,
});

type Stage = "hero" | "entry" | "rooms";
type RoomId = "friends" | "romance";

const ROOMS = [
  {
    id: "friends" as const,
    emoji: "💫",
    title: "Friends Vibing",
    sub: "Friendly Malayalam + English room for daily talks, jokes, radio, voice notes, and mini games.",
    count: "1 live",
    glow: "from-sky-400/25 to-cyan-300/10",
  },
  {
    id: "romance" as const,
    emoji: "💘",
    title: "Romance Vibing",
    sub: "A softer KC-style room for sweet chats, respectful connections, and late-night vibes.",
    count: "1 live",
    glow: "from-pink-400/25 to-rose-300/10",
  },
];

const MOODS = ["Chill", "Happy", "RJ mood", "Missing KC", "Night owl", "Just watching"];

const EARN_CARDS = [
  { icon: Sparkles, title: "Daily login", value: "50 coins" },
  { icon: Mic, title: "Voice note", value: "25 coins" },
  { icon: Camera, title: "Profile setup", value: "100 coins" },
  { icon: Zap, title: "First message", value: "10 coins" },
  { icon: Trophy, title: "Streaks", value: "bonus" },
  { icon: Gift, title: "Gifts/activity", value: "rewards" },
];

const COUPONS = ["Amazon", "Swiggy", "Zomato", "Myntra"];

function Home() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>("hero");
  const [selected, setSelected] = useState<RoomId>("friends");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [mood, setMood] = useState("Chill");
  const [policyAction, setPolicyAction] = useState<"guest" | "prime" | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function enterRoom(room: RoomId) {
    localStorage.setItem("vibe-selected-room", room);
    nav({ to: "/chat" });
  }

  async function continueGuest() {
    const cleanName = cleanUsername(name);
    if (cleanName.length < 2) return toast.error("Please enter your display name");
    if (birthYear) {
      const year = Number(birthYear);
      const age = new Date().getFullYear() - year;
      if (!year || age < 18) return toast.error("18+ only");
    }

    setLoading(true);
    try {
    const availability = await ensureUsernameAvailable(cleanName);
    if (!availability.ok) {
      setLoading(false);
      toast.error(availability.message);
      return;
    }

    const dob = birthYear ? `${birthYear}-01-01` : null;
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          username: availability.username,
          display_name: availability.username,
          avatar_emoji: selected === "romance" ? "💘" : "💫",
          gender: gender || null,
          dob,
          mood_text: mood,
          status_text: mood,
        },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(`Guest signup failed: ${error.message}`);
    }
    if (data.user) {
      const profileResult = await ensureProfileForUser(data.user, {
        username: availability.username,
        display_name: availability.username,
        avatar_emoji: selected === "romance" ? "💘" : "💫",
        gender: gender || null,
        dob,
        mood_text: mood,
        status_text: mood,
        is_guest: true,
      });
      console.info("[home-guest:profile]", {
        userId: data.user.id,
        created: profileResult.created,
        error: profileResult.error?.message ?? null,
      });
      if (profileResult.error) {
        setLoading(false);
        return toast.error(`Guest created, but profile save failed: ${profileResult.error.message}`);
      }
    }
    setLoading(false);
    toast.success(`Welcome ${availability.username}`);
    setStage("rooms");
    } catch (error) {
      console.error("[home-guest:error]", error);
      toast.error(errorMessage(error, "Guest login failed"));
    } finally {
      setLoading(false);
    }
  }

  function acceptPolicy() {
    const action = policyAction;
    setPolicyAction(null);
    if (action === "prime") nav({ to: "/login" });
    if (action === "guest") void continueGuest();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050814] text-white">
      <AmbientOrbs />
      <KcWelcomeOverlay
        open={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        onContinue={() => {
          setWelcomeOpen(false);
          setStage("entry");
        }}
      />
      <CommunityPolicyModal open={policyAction !== null} onClose={() => setPolicyAction(null)} onAccept={acceptPolicy} />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(14,165,233,0.20),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(236,72,153,0.18),transparent_32%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-hero shadow-glow">
              <Sparkles size={18} />
            </span>
            <p className="text-sm font-black">Vibe<span className="text-gradient">Malayali</span></p>
          </div>
          {stage !== "hero" && (
            <button type="button" onClick={() => setStage(stage === "rooms" ? "entry" : "hero")} className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-slate-200">
              Back
            </button>
          )}
        </header>

        {stage === "hero" && (
          <section className="grid flex-1 place-items-center py-12 text-center">
            <div className="max-w-2xl">
              <p className="mx-auto inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-sky-100">
                KC NOSTALGIA, NEW VIBE
              </p>
              <h1 className="mt-6 text-4xl font-black leading-tight sm:text-6xl">
                Find Your Tribe.
                <br />
                <span className="text-gradient">Find Your Vibe.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Join live rooms, meet friends, listen to radio, share voice notes, express your mood, send gifts, play mini games and relive the legendary KC-style community spirit.
              </p>
              <button type="button" onClick={() => setWelcomeOpen(true)} className="btn-neon mt-8 inline-flex items-center gap-2 px-7 text-sm">
                ENTER KC <ArrowRight size={17} />
              </button>
            </div>
          </section>
        )}

        {stage === "entry" && (
          <section className="mx-auto grid w-full max-w-4xl flex-1 content-center gap-5 py-8 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-slate-950/30">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">User entry</p>
              <h2 className="mt-3 text-3xl font-black">Choose how you enter</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                Profile picture is optional now. You can set it later from the avatar button at the top of chat.
              </p>
              <button type="button" onClick={() => setPolicyAction("prime")} className="btn-neon mt-5 flex w-full items-center justify-center gap-2 text-sm">
                <Crown size={17} /> Registered user login / register
              </button>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-slate-950/30">
              <div className="grid gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" maxLength={24} className="h-12 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm font-bold outline-none placeholder:text-slate-500 focus:border-sky-300" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-12 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm font-bold outline-none focus:border-sky-300">
                    <option value="">Gender optional</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <input value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="Birth year optional" className="h-12 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm font-bold outline-none placeholder:text-slate-500 focus:border-sky-300" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {MOODS.map((item) => (
                    <button key={item} type="button" onClick={() => setMood(item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${mood === item ? "bg-sky-500 text-white" : "bg-white/8 text-slate-300"}`}>
                      {item}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setPolicyAction("guest")} disabled={loading} className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/10 text-sm font-black text-white disabled:opacity-60">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                  Continue as Guest
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === "rooms" && (
          <section className="w-full flex-1 py-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {ROOMS.map((room) => (
                <article key={room.id} className={`rounded-[2rem] border border-white/10 bg-gradient-to-br ${room.glow} p-5 shadow-2xl shadow-slate-950/25`}>
                  <div className="flex items-start gap-4">
                    <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-3xl">{room.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-2xl font-black">{room.title}</h2>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-300">{room.sub}</p>
                      <p className="mt-3 text-xs font-black text-emerald-300">{room.count}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => enterRoom(room.id)} className="mt-5 h-12 w-full rounded-2xl bg-sky-500 text-sm font-black text-white shadow-lg shadow-sky-500/20">
                    Enter Room
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-5 rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">Claim Daily Coins</p>
                  <p className="text-sm font-bold text-amber-100">Claim 50 daily coins and keep your streak alive.</p>
                </div>
                <button type="button" onClick={() => toast.success("Daily coins are handled in your wallet/rewards system")} className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">
                  Claim 50
                </button>
              </div>
            </div>

            <div className="mt-5">
              <GuestExpiryNotice profile={profile} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EARN_CARDS.map(({ icon: Icon, title, value }) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <Icon className="text-sky-300" size={22} />
                  <p className="mt-3 text-sm font-black">{title}</p>
                  <p className="text-xs font-bold text-slate-400">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
              <div className="flex items-center gap-2 text-amber-200">
                <WalletCards size={20} />
                <h2 className="text-xl font-black text-white">Coin Redemption</h2>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-300">500 coins = ₹1. Redemptions are manually approved by admin.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {COUPONS.map((coupon) => (
                  <div key={coupon} className="rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3 text-center text-sm font-black">
                    {coupon}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/8 px-4 py-3 text-sm font-black">25,000 coins = ₹50 coupon</div>
                <div className="rounded-2xl bg-white/8 px-4 py-3 text-sm font-black">50,000 coins = ₹100 coupon</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => nav({ to: "/wallet" })} className="rounded-full bg-white/10 px-5 py-3 text-sm font-black">View Rewards</button>
                <button type="button" onClick={() => nav({ to: "/wallet" })} className="rounded-full bg-sky-500 px-5 py-3 text-sm font-black text-white">Request Redemption</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
