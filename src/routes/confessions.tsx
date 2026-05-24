import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BottomNav } from "@/components/BottomNav";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Heart, Send, Sparkles, VenetianMask, Trash2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/confessions")({
  head: () => ({
    meta: [
      { title: "Anonymous Secrets — Vibe Malayali" },
      { name: "description", content: "Share anonymous confessions, secret crushes & emotional vibes." },
    ],
  }),
  component: ConfessionsPage,
});

type Mood = "crush" | "compliment" | "secret" | "emotional";

const MOODS: { id: Mood; emoji: string; label: string; glow: string }[] = [
  { id: "crush", emoji: "💘", label: "Crush", glow: "from-pink-500/40 to-fuchsia-500/30" },
  { id: "compliment", emoji: "✨", label: "Compliment", glow: "from-amber-300/40 to-yellow-500/30" },
  { id: "secret", emoji: "🤫", label: "Secret", glow: "from-violet-500/40 to-indigo-500/30" },
  { id: "emotional", emoji: "💔", label: "Emotional", glow: "from-rose-500/40 to-red-500/20" },
];

type Confession = {
  id: string;
  author_id: string;
  text: string;
  mood: Mood;
  reveal_identity: boolean;
  like_count: number;
  created_at: string;
};

function moodMeta(m: string) {
  return MOODS.find((x) => x.id === m) ?? MOODS[2];
}

function ConfessionsPage() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [items, setItems] = useState<Confession[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [mood, setMood] = useState<Mood>("secret");
  const [reveal, setReveal] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) { toast.error(error.message); return; }
      if (cancelled) return;
      setItems((data ?? []) as Confession[]);

      const reveals = (data ?? []).filter((c) => c.reveal_identity).map((c) => c.author_id);
      if (reveals.length) {
        const { data: ps } = await supabase.from("profiles").select("*").in("id", reveals);
        if (ps) setProfiles(Object.fromEntries(ps.map((p) => [p.id, p as Profile])));
      }

      const { data: myLikes } = await supabase
        .from("confession_likes")
        .select("confession_id")
        .eq("user_id", user!.id);
      if (myLikes) setLikes(new Set(myLikes.map((l) => l.confession_id)));
    }
    load();

    const channel = supabase
      .channel("confessions-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, (p) => {
        const c = p.new as Confession;
        setItems((prev) => prev.some((x) => x.id === c.id) ? prev : [c, ...prev]);
        if (c.reveal_identity) {
          supabase.from("profiles").select("*").eq("id", c.author_id).maybeSingle()
            .then(({ data }) => { if (data) setProfiles((prev) => ({ ...prev, [data.id]: data as Profile })); });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "confessions" }, (p) => {
        const c = p.new as Confession;
        setItems((prev) => prev.map((x) => x.id === c.id ? { ...x, like_count: c.like_count } : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "confessions" }, (p) => {
        const old = p.old as { id: string };
        setItems((prev) => prev.filter((x) => x.id !== old.id));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  async function post() {
    if (!user || !text.trim() || posting) return;
    if (text.trim().length > 500) { toast.error("Max 500 characters"); return; }
    setPosting(true);
    const body = text.trim();
    const { error } = await supabase.from("confessions").insert({
      author_id: user.id,
      text: body,
      mood,
      reveal_identity: reveal,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    toast.success("Sent into the void ✨");
  }

  async function toggleLike(c: Confession) {
    if (!user) return;
    const liked = likes.has(c.id);
    if (liked) {
      setLikes((s) => { const n = new Set(s); n.delete(c.id); return n; });
      setItems((prev) => prev.map((x) => x.id === c.id ? { ...x, like_count: Math.max(0, x.like_count - 1) } : x));
      await supabase.from("confession_likes").delete().eq("confession_id", c.id).eq("user_id", user.id);
    } else {
      setLikes((s) => new Set(s).add(c.id));
      setItems((prev) => prev.map((x) => x.id === c.id ? { ...x, like_count: x.like_count + 1 } : x));
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
      const { error } = await supabase.from("confession_likes").insert({ confession_id: c.id, user_id: user.id });
      if (error && !error.message.includes("duplicate")) toast.error(error.message);
    }
  }

  async function remove(c: Confession) {
    if (!user || c.author_id !== user.id) return;
    setItems((prev) => prev.filter((x) => x.id !== c.id));
    await supabase.from("confessions").delete().eq("id", c.id);
  }

  if (loading || !user) {
    return (
      <div className="relative min-h-screen grid-bg flex items-center justify-center">
        <AmbientOrbs />
        <p className="text-sm text-muted-foreground animate-pulse">Loading secrets…</p>
      </div>
    );
  }

  const remaining = 500 - text.length;

  return (
    <div className="relative min-h-screen grid-bg lg:pl-[72px]">
      <AmbientOrbs />
      

      <header className="sticky top-0 z-30 glass-strong">
        <div className="mx-auto max-w-md px-4 py-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <VenetianMask size={12} /> Anonymous Secrets
          </p>
          <h1 className="font-mal text-2xl font-extrabold mt-0.5">
            <span className="text-gradient">രഹസ്യങ്ങൾ</span> പങ്കിടാം 💌
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1">
            {profile?.username} — fully anonymous unless you reveal
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pt-4 pb-44 space-y-4">
        {/* Composer */}
        <div className="glass-strong rounded-3xl p-4 shadow-glow space-y-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  mood === m.id ? "bg-hero text-white shadow-glow" : "glass text-muted-foreground"
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="നിന്റെ രഹസ്യം ഇവിടെ എഴുതൂ… (anonymous)"
            rows={3}
            className="w-full resize-none rounded-2xl bg-background/40 border border-white/10 p-3 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setReveal((r) => !r)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                reveal ? "bg-amber-500/20 text-amber-300 border border-amber-400/40" : "glass text-muted-foreground"
              }`}
            >
              {reveal ? <Eye size={12} /> : <EyeOff size={12} />}
              {reveal ? "Show as me" : "Hide identity"}
            </button>

            <span className={`text-[10px] ${remaining < 40 ? "text-pink-400" : "text-muted-foreground"}`}>{remaining}</span>

            <button
              onClick={post}
              disabled={!text.trim() || posting}
              className="h-9 px-4 rounded-full bg-hero text-white text-sm font-semibold flex items-center gap-1.5 shadow-glow disabled:opacity-40"
            >
              <Send size={14} /> Send
            </button>
          </div>
        </div>

        {/* Feed */}
        {items.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-12">
            <Sparkles className="mx-auto mb-2 opacity-50" size={24} />
            <p className="font-mal">ഇനി ആദ്യത്തെ secret നിന്റേതാവട്ടെ ✨</p>
          </div>
        )}

        {items.map((c) => {
          const m = moodMeta(c.mood);
          const author = c.reveal_identity ? profiles[c.author_id] : null;
          const liked = likes.has(c.id);
          const mine = c.author_id === user.id;
          return (
            <article
              key={c.id}
              className={`relative overflow-hidden rounded-3xl p-4 glass-strong shadow-glow animate-fade-in`}
            >
              <div className={`pointer-events-none absolute -inset-1 bg-gradient-to-br ${m.glow} opacity-40 blur-2xl`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]">{m.emoji}</span>
                    <div>
                      <p className="text-xs font-semibold">
                        {author ? <>{author.avatar_emoji} {author.username}</> : <>Anonymous</>}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{c.mood}</p>
                    </div>
                  </div>
                  {mine && (
                    <button onClick={() => remove(c)} className="rounded-full glass p-1.5 text-muted-foreground hover:text-pink-400">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <p className="font-mal mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{c.text}</p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  <button
                    onClick={() => toggleLike(c)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-90 ${
                      liked ? "bg-pink-500/20 text-pink-300 border border-pink-400/40" : "glass text-muted-foreground"
                    }`}
                  >
                    <Heart size={12} className={liked ? "fill-pink-400 text-pink-400" : ""} />
                    {c.like_count}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
