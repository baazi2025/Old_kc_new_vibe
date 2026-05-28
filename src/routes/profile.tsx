import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserRound } from "lucide-react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/profile")({
  head: () =>
    seo({
      title: "Malayali Community Profiles | Vibemalayali Chat",
      description:
        "Create your profile, share moods, connect with friends, and become part of the Vibemalayali Malayali community.",
      path: "/profile",
    }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <main className="relative min-h-screen grid-bg px-5 py-8">
      <AmbientOrbs />
      <div className="relative mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
          <ArrowLeft size={16} /> Home
        </Link>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-neon">
          <UserRound className="h-10 w-10 text-emerald-300" />
          <h1 className="mt-4 text-3xl font-black text-white">Malayali Community Profiles</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Create your profile, share moods, connect with friends, and become part of the Vibemalayali Malayali community.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950"
          >
            Create Profile
          </Link>
        </section>
      </div>
    </main>
  );
}
