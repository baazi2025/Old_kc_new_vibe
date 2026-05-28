import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Pause, Play, Radio, Volume2, VolumeX } from "lucide-react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/radio")({
  head: () =>
    seo({
      title: "Malayali Radio Online | Listen & Chat with Friends",
      description:
        "Listen to Malayalam and nostalgic Bollywood radio online while chatting with friends in Vibemalayali Chat rooms.",
      path: "/radio",
    }),
  component: RadioPage,
});

const STATIONS = [
  {
    id: "nostalgic-bollywood-90s",
    name: "Nostalgic Bollywood 90s",
    category: "Bollywood / 90s",
    source: "LiveRadios / Dezizone Radio",
    icon: "🎶",
    streamUrl: "http://desizoneradio.com:8000/relay3",
    pageUrl: "https://liveradios.in/nostalgic-bollywood-90s.html",
  },
];

function RadioPage() {
  const { user, profile } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [station] = useState(STATIONS[0]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [streamError, setStreamError] = useState("");

  const moodText = useMemo(() => `🎵 Listening to: ${station.name}`, [station.name]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.muted = muted;
  }, [volume, muted]);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    setStreamError("");

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.warn("[radio:play-error]", error);
      setPlaying(false);
      setStreamError("Stream unavailable. Please add a direct MP3/AAC/HLS stream URL.");
    }
  }

  async function setAsMood() {
    if (!user) {
      toast("Sign in to set radio as mood.");
      return;
    }
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ status_text: moodText })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Radio mood updated");
  }

  return (
    <main className="relative min-h-screen grid-bg px-5 py-8 lg:pl-[92px]">
      <AmbientOrbs />
      <audio
        ref={audioRef}
        src={station.streamUrl}
        preload="none"
        crossOrigin="anonymous"
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onError={() => {
          setPlaying(false);
          setStreamError("Stream unavailable. Please add a direct MP3/AAC/HLS stream URL.");
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <Link to="/chat" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
          <ArrowLeft size={16} /> Back to Chat
        </Link>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/85 shadow-neon">
          <div className="bg-gradient-to-br from-sky-500/20 via-fuchsia-500/14 to-amber-300/10 p-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-sky-100">
              <Radio size={13} /> Vibemalayali Radio
            </p>
            <h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">Malayali Radio Online</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
              Listen while chatting, keep it muted when needed, and set the current station as your profile mood.
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 shrink-0 place-items-center rounded-3xl bg-sky-500/15 text-4xl shadow-[0_0_35px_rgba(14,165,233,0.18)]">
                    {station.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{station.name}</h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-200">{station.category}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Source: {station.source}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                  {playing ? "Pause" : "Play"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <button
                  type="button"
                  onClick={() => setMuted((value) => !value)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-xs font-black text-slate-100"
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {muted ? "Unmute" : "Mute"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="w-full accent-sky-400"
                  aria-label="Radio volume"
                />
                <button
                  type="button"
                  onClick={setAsMood}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/12 px-4 text-xs font-black text-amber-100"
                >
                  Set as mood
                </button>
              </div>

              {streamError && (
                <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
                  {streamError}
                </p>
              )}

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-xs font-semibold leading-5 text-slate-400">
                Direct stream URL: <span className="break-all text-slate-200">{station.streamUrl}</span>
                <br />
                Station page checked:{" "}
                <a href={station.pageUrl} target="_blank" rel="noreferrer" className="text-sky-200 underline-offset-2 hover:underline">
                  LiveRadios page
                </a>
              </div>
            </article>

            <Link
              to="/chat"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950"
            >
              Open Chat Rooms <MessageCircle size={16} />
            </Link>

            {profile?.status_text && (
              <p className="mt-4 text-xs font-semibold text-slate-400">
                Current mood: <span className="text-slate-200">{profile.status_text}</span>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
