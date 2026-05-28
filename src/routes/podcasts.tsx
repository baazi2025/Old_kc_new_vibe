import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mic2 } from "lucide-react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/podcasts")({
  head: () =>
    seo({
      title: "Malayali Podcasts | Stories, Talks & Community Voices",
      description:
        "Listen to Malayalam podcasts, community stories, discussions, and voices shared by Vibemalayali Chat members.",
      path: "/podcasts",
    }),
  component: PodcastsPage,
});

function PodcastsPage() {
  return (
    <main className="relative min-h-screen grid-bg px-5 py-8">
      <AmbientOrbs />
      <div className="relative mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
          <ArrowLeft size={16} /> Home
        </Link>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-neon">
          <Mic2 className="h-10 w-10 text-pink-300" />
          <h1 className="mt-4 text-3xl font-black text-white">Malayali Podcasts</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Listen to Malayalam podcasts, community stories, discussions, and voices shared by Vibemalayali Chat members.
          </p>
        </section>
      </div>
    </main>
  );
}
