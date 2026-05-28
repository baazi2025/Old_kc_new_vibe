import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, Mic, MessageCircle, Users } from "lucide-react";
import { AmbientOrbs } from "@/components/AmbientOrbs";

export type SeoLandingSlug =
  | "malayalam-chat-room"
  | "gulf-malayali-chat"
  | "anonymous-malayalam-chat"
  | "malayalam-voice-chat";

type LandingPage = {
  path: `/${SeoLandingSlug}`;
  title: string;
  eyebrow: string;
  h1: string;
  paragraphs: string[];
  faqs: { question: string; answer: string }[];
};

export const SEO_LANDING_PAGES: Record<SeoLandingSlug, LandingPage> = {
  "malayalam-chat-room": {
    path: "/malayalam-chat-room",
    title: "Malayalam Chat Room",
    eyebrow: "Malayali community chat",
    h1: "Malayalam Chat Room for Friends, Voice Chat, and Gulf Malayalis",
    paragraphs: [
      "Vibemalayali Chat is a live Malayalam community space where Malayalis can meet, talk, and feel at home online. The platform keeps the room choice simple: join the Friends Room for friendly conversations or the Romance Room for softer, respectful chats.",
      "For UAE and Gulf users, the chat experience is built around familiar Malayalam community energy, friendship, late-night conversations, radio-style moments, and voice chat. You can drop in from Dubai, Abu Dhabi, Sharjah, Qatar, Saudi Arabia, Oman, Bahrain, Kuwait, Kerala, or anywhere the Malayali crowd is active.",
      "These landing pages are here to help you find the right vibe, not to create extra rooms. Pick one of the existing rooms below and continue into the same live Vibemalayali experience.",
    ],
    faqs: [
      {
        question: "Is this a separate Malayalam chat room?",
        answer:
          "No. This page introduces the platform and sends users into the existing Friends Room or Romance Room.",
      },
      {
        question: "Can Gulf Malayalis use the chat room?",
        answer:
          "Yes. The community welcomes Malayalis in the UAE, wider Gulf region, Kerala, India, and worldwide.",
      },
      {
        question: "Does the platform support voice chat?",
        answer:
          "Yes. Users can participate with text and voice notes inside the existing chat room experience.",
      },
    ],
  },
  "gulf-malayali-chat": {
    path: "/gulf-malayali-chat",
    title: "Gulf Malayali Chat",
    eyebrow: "UAE and Gulf Malayalis",
    h1: "Gulf Malayali Chat for UAE Friends and Malayalam Voice Conversations",
    paragraphs: [
      "Vibemalayali Chat brings UAE and Gulf Malayalis into one familiar online community. Whether you are in Dubai, Abu Dhabi, Sharjah, Doha, Riyadh, Muscat, Manama, Kuwait, or back home in Kerala, you can join the same live rooms and meet people who understand the Malayali mood.",
      "The Friends Room is ideal for friendship, daily talks, casual Malayalam and English conversations, and voice chat moments. The Romance Room is available for users looking for respectful, softer conversations without creating a new room or changing the existing chat setup.",
      "If you miss that old community-chat feeling, this page is a doorway into Vibemalayali's existing rooms, built for Malayalam community connection across the Gulf.",
    ],
    faqs: [
      {
        question: "Is this chat only for UAE Malayalis?",
        answer:
          "No. UAE users are welcome, and so are Malayalis from the Gulf, Kerala, India, and the wider diaspora.",
      },
      {
        question: "Which room should I join for friendship?",
        answer:
          "Choose the Friends Room for casual friendship, group conversations, and Malayalam community vibes.",
      },
      {
        question: "Can I use voice chat from the Gulf?",
        answer:
          "Yes. The existing chat experience supports voice notes, so Gulf Malayalis can join with text or voice.",
      },
    ],
  },
  "anonymous-malayalam-chat": {
    path: "/anonymous-malayalam-chat",
    title: "Anonymous Malayalam Chat",
    eyebrow: "Simple guest-friendly entry",
    h1: "Anonymous Malayalam Chat for Friendship, Gulf Users, and Voice Notes",
    paragraphs: [
      "Vibemalayali Chat lets Malayalis enter the community with a simple, guest-friendly flow and start talking in the existing rooms. It is made for Malayalam community conversations, friendly discovery, and relaxed online connection.",
      "You can join the Friends Room for friendship, Malayalam banter, Gulf-user conversations, and voice chat. If you want a softer conversation style, the Romance Room is available as the second existing room, with the same platform rules and room logic.",
      "This page does not create a new anonymous room. It simply helps users searching for anonymous Malayalam chat find Vibemalayali and choose one of the two live rooms already available.",
    ],
    faqs: [
      {
        question: "Do I need a new room for anonymous Malayalam chat?",
        answer:
          "No. Users are funneled into the existing Friends Room or Romance Room through the same Vibemalayali chat flow.",
      },
      {
        question: "Is this useful for Gulf Malayali users?",
        answer:
          "Yes. The platform is built for Malayalis in the UAE, Gulf region, Kerala, India, and worldwide.",
      },
      {
        question: "Can I send voice notes?",
        answer:
          "Yes. Voice notes are part of the current chat experience when you enter the rooms.",
      },
    ],
  },
  "malayalam-voice-chat": {
    path: "/malayalam-voice-chat",
    title: "Malayalam Voice Chat",
    eyebrow: "Voice notes and live room energy",
    h1: "Malayalam Voice Chat for Friends, UAE Malayalis, and Community Rooms",
    paragraphs: [
      "Vibemalayali Chat supports Malayalam voice chat moments through voice notes inside the existing community rooms. It is a place for Malayalis to talk, laugh, meet friends, and keep the conversation feeling more personal than plain text.",
      "The Friends Room is the best place for community voice notes, friendship, daily Malayalam and English chat, and UAE or Gulf Malayali conversations. The Romance Room offers a more relaxed space for respectful connection without adding any new rooms.",
      "If you are searching for Malayalam voice chat, use this page as a clear path into the existing Vibemalayali rooms and continue with the community already there.",
    ],
    faqs: [
      {
        question: "Is Malayalam voice chat available here?",
        answer:
          "Yes. The chat experience includes voice notes inside the existing Friends Room and Romance Room.",
      },
      {
        question: "Which room is better for voice chat with friends?",
        answer:
          "The Friends Room is the main place for friendship, Malayalam community chat, and voice-note conversations.",
      },
      {
        question: "Does this page create a voice-only room?",
        answer:
          "No. It is an SEO landing page that directs users into the existing Vibemalayali chat rooms.",
      },
    ],
  },
};

const internalLinks: { slug: SeoLandingSlug; label: string }[] = [
  { slug: "malayalam-chat-room", label: "Malayalam Chat Room" },
  { slug: "gulf-malayali-chat", label: "Gulf Malayali Chat" },
  { slug: "anonymous-malayalam-chat", label: "Anonymous Malayalam Chat" },
  { slug: "malayalam-voice-chat", label: "Malayalam Voice Chat" },
];

export function SeoLandingPage({ slug }: { slug: SeoLandingSlug }) {
  const page = SEO_LANDING_PAGES[slug];
  const navigate = useNavigate();

  function joinRoom(room: "friends" | "romance") {
    if (typeof window !== "undefined") {
      localStorage.setItem("vibe-selected-room", room);
    }
    void navigate({ to: "/chat" });
  }

  return (
    <main className="relative min-h-screen grid-bg px-5 py-7 text-white">
      <AmbientOrbs />
      <div className="relative mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white">
            <ArrowLeft size={16} /> Home
          </Link>
          <nav className="flex flex-wrap items-center gap-2" aria-label="SEO landing pages">
            {internalLinks
              .filter((item) => item.slug !== slug)
              .map((item) => (
                <Link
                  key={item.slug}
                  to={SEO_LANDING_PAGES[item.slug].path}
                  className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-sky-300/50 hover:bg-white/12"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </header>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/82 p-6 shadow-neon sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-sky-100">
                {page.eyebrow}
              </p>
              <h1 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
                {page.h1}
              </h1>
              <div className="mt-5 space-y-4 text-sm font-semibold leading-7 text-slate-300 sm:text-base">
                {page.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => joinRoom("friends")}
                  className="btn-neon inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm"
                >
                  <Users size={17} /> Join Friends Room
                </button>
                <button
                  type="button"
                  onClick={() => joinRoom("romance")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-rose-300/30 bg-rose-400/15 px-6 text-sm font-black text-rose-50 shadow-lg shadow-rose-500/10 transition hover:-translate-y-0.5 hover:bg-rose-400/25"
                >
                  <Heart size={17} /> Join Romance Room
                </button>
              </div>
            </div>

            <aside className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
              <div className="rounded-2xl bg-sky-400/12 p-4">
                <MessageCircle className="text-sky-200" size={24} />
                <h2 className="mt-3 text-lg font-black">Two existing rooms</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Friends Room and Romance Room remain the only room choices.
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-400/12 p-4">
                <Mic className="text-emerald-200" size={24} />
                <h2 className="mt-3 text-lg font-black">Voice-ready community</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Share text, voice notes, friendship, and Malayalam community moments.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/76 p-6 sm:p-8">
          <h2 className="text-2xl font-black">Frequently Asked Questions</h2>
          <div className="mt-5 grid gap-3">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <h3 className="text-base font-black text-white">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
          <h2 className="text-xl font-black">Explore More Vibemalayali Pages</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {internalLinks.map((item) => (
              <Link
                key={item.slug}
                to={SEO_LANDING_PAGES[item.slug].path}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  item.slug === slug
                    ? "bg-sky-500 text-white"
                    : "border border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
