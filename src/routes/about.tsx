import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    seo({
      title: "About Vibemalayali Chat | Malayali Community Platform",
      description:
        "Vibemalayali Chat is a nostalgic Malayali community platform inspired by KC Chat, built for friendships, chat rooms, radio, podcasts, moods, voice notes, and meaningful online connections.",
      path: "/about",
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="relative min-h-screen grid-bg px-5 py-8">
      <AmbientOrbs />
      <div className="relative mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
          <ArrowLeft size={16} /> Home
        </Link>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-neon">
          <HeartHandshake className="h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-3xl font-black text-white">About Vibemalayali Chat</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Vibemalayali Chat is a nostalgic Malayali community platform inspired by KC Chat, built for friendships, chat rooms, radio, podcasts, moods, voice notes, and meaningful online connections.
          </p>
        </section>
      </div>
    </main>
  );
}
