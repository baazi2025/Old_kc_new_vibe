import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { CinematicReactions, isSpecialEmoji } from "@/components/CinematicReactions";
import { VoiceMessage } from "@/components/VoiceMessage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { ArrowLeft, Mic, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/dm/$userId")({
  head: () => ({ meta: [{ title: "Private Chat — Vibe Malayali" }] }),
  component: DMConversation,
});

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string | null;
  kind: string;
  audio_url: string | null;
  duration_ms: number | null;
  created_at: string;
};

function DMConversation() {
  const { userId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [peer, setPeer] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [cinematic, setCinematic] = useState<{ id: string; emoji: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const recorder = useVoiceRecorder();
  const cancelRef = useRef(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);

  // load peer profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setPeer((data as Profile) ?? null);
    })();
  }, [userId]);

  // load + subscribe
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) { toast.error(error.message); return; }
      if (!cancelled) setMsgs((data ?? []) as Msg[]);
    })();

    const ch = supabase
      .channel(`dm:${[user.id, userId].sort().join(":")}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        (payload) => {
          const m = payload.new as Msg;
          const inThread =
            (m.sender_id === user.id && m.recipient_id === userId) ||
            (m.sender_id === userId && m.recipient_id === user.id);
          if (!inThread) return;
          setMsgs((prev) => prev.some((p) => p.id === m.id) ? prev : [...prev, m]);
          if (m.text && m.sender_id !== user.id && isSpecialEmoji(m.text)) {
            setCinematic((c) => [...c.slice(-3), { id: m.id, emoji: m.text!.trim() }]);
          }
        })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, { user_id: string }[]>;
        const flat = Object.values(state).flat();
        setPeerOnline(flat.some((p) => p.user_id === userId));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user) {
          await ch.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user, userId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    if (isSpecialEmoji(body)) {
      setCinematic((c) => [...c.slice(-3), { id: `${Date.now()}`, emoji: body }]);
    }
    const { error } = await supabase.from("dm_messages").insert({
      sender_id: user.id, recipient_id: userId, text: body, kind: "text",
    });
    if (error) { toast.error(error.message); setText(body); }
  }

  async function startRec() {
    if (recorder.state !== "idle" || uploading) return;
    cancelRef.current = false;
    try { await recorder.start(); } catch { toast.error("Mic permission denied"); }
  }
  async function endRec() {
    if (recorder.state !== "recording") return;
    const r = await recorder.stop();
    if (!r || !user || cancelRef.current) return;
    if (r.durationMs < 500) { toast("Hold to record"); return; }
    setUploading(true);
    try {
      const ext = r.blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/dm-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("voice-notes").upload(path, r.blob, { contentType: r.blob.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("voice-notes").getPublicUrl(path);
      const { error } = await supabase.from("dm_messages").insert({
        sender_id: user.id, recipient_id: userId,
        kind: "voice", audio_url: pub.publicUrl, duration_ms: r.durationMs, text: null,
      });
      if (error) throw error;
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice upload failed");
    } finally { setUploading(false); }
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen grid-bg lg:pl-[72px]">
      <AmbientOrbs />

      <header className="sticky top-0 z-30 glass-strong">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button onClick={() => nav({ to: "/dm" })} className="rounded-full glass p-2"><ArrowLeft size={16}/></button>
          <div className="relative h-10 w-10 rounded-full glass flex items-center justify-center text-xl">
            {peer?.avatar_emoji ?? "🧑"}
            {peerOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background shadow-[0_0_8px_rgba(16,185,129,0.9)]"/>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{peer?.username ?? "user"}</p>
            <p className="text-[10px] text-muted-foreground">{peerOnline ? <span className="text-emerald-400">● online</span> : "offline"}</p>
          </div>
        </div>
      </header>

      <div ref={scrollerRef} className="mx-auto max-w-md px-4 pt-4 pb-32 space-y-3 overflow-y-auto">
        {msgs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-12">Say hi 👋 — this chat is private.</p>
        )}
        {msgs.map((m) => {
          const me = m.sender_id === user.id;
          const isVoice = m.kind === "voice" && !!m.audio_url;
          return (
            <div key={m.id} className={`flex ${me ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                me ? "bg-hero text-white rounded-br-sm shadow-glow" : "glass rounded-bl-sm"
              }`}>
                {isVoice
                  ? <VoiceMessage url={m.audio_url!} durationMs={m.duration_ms} mine={me} id={m.id}/>
                  : m.text}
                <p className="mt-1 text-[9px] opacity-70 text-right">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-0 right-0 z-30 px-3">
        <div className="mx-auto max-w-md glass-strong rounded-full px-2 py-2 flex items-center gap-1 shadow-glow">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={recorder.state === "recording" ? "Recording…" : "Message privately…"}
            disabled={recorder.state === "recording"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground px-3 disabled:opacity-50"
          />
          {text ? (
            <button onClick={send} className="h-9 w-9 rounded-full bg-hero flex items-center justify-center shadow-glow"><Send size={16} className="text-white"/></button>
          ) : (
            <button
              onPointerDown={(e) => { e.preventDefault(); startRec(); }}
              onPointerUp={(e) => { e.preventDefault(); endRec(); }}
              onPointerLeave={() => { if (recorder.state === "recording") endRec(); }}
              onPointerCancel={() => { cancelRef.current = true; recorder.cancel(); }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={uploading}
              className={`h-9 w-9 rounded-full flex items-center justify-center shadow-glow select-none touch-none transition ${
                recorder.state === "recording" ? "bg-red-500 scale-125" : uploading ? "bg-muted opacity-60" : "bg-hero"
              }`}
            ><Mic size={16} className="text-white"/></button>
          )}
        </div>
      </div>

      {recorder.state === "recording" && (
        <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm flex items-end justify-center pb-32 animate-fade-in">
          <div className="glass-strong rounded-3xl px-6 py-5 flex flex-col items-center gap-3 shadow-glow">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm tabular-nums">{Math.floor(recorder.elapsedMs/1000)}s</p>
            <button onClick={() => { cancelRef.current = true; recorder.cancel(); }} className="rounded-full bg-red-500/20 text-red-300 p-2"><Trash2 size={16}/></button>
          </div>
        </div>
      )}

      <CinematicReactions triggers={cinematic} />
    </div>
  );
}
