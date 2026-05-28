import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const RULES = [
  {
    title: "1. Respect the Vibe",
    body: "This room is for fun, friendship, trolling, memes, random talks, and peaceful chaos. Do not enter expecting corporate behavior or perfect emotional stability.",
  },
  {
    title: "2. Privacy Matters",
    body: "Do NOT share personal photos, phone numbers, private conversations, DM screenshots, or any member's personal information outside the chat. Admins are not responsible for problems caused by members sharing personal details with others.",
  },
  {
    title: "3. No Religion / Politics / Racism",
    body: "Religious debates, political fights, racist comments, hate speech, and community-targeted insults are strictly not allowed. Instant action may be taken without warning.",
  },
  {
    title: "4. Personal Attacks Are Not Allowed",
    body: "Fun roasting and chat-triggered abuse may happen during chaos moments, but intentionally targeting, humiliating, or repeatedly abusing someone will not be tolerated. Know the difference between chat vibe trolling and personal harassment.",
  },
  {
    title: "5. Fight Expiry Policy",
    body: "Daily chat fights must end on the same day. Tomorrow is a new episode. Continuing yesterday's fight into the next day is not tolerated, not healthy, and not cinematic anymore.",
  },
  {
    title: "6. DM Privacy Rule",
    body: "What is shared in private messages must remain private. Publishing personal chats, forwarding screenshots, or exposing DMs without permission is strictly prohibited.",
  },
  {
    title: "7. Midnight Activity Policy",
    body: "Members may suddenly become overactive after 11 PM. This may include random deep conversations, emotional status updates, fake relationship rumors, unnecessary overthinking, and disappearing without explanation. Others must support the chaos, react with memes, or pretend they did not see anything.",
  },
  {
    title: "8. Ghosting Is Legal",
    body: "Members may disappear for 8 months and randomly return with 'hello guys'. This behavior is accepted by ancient chatroom law.",
  },
  {
    title: "9. Admin Rights",
    body: "Admins reserve the right to mute chaos creators, remove toxic members, end unnecessary drama, and restore peace after war zones.",
  },
];

export function CommunityPolicyModal({
  open,
  onAccept,
  onClose,
}: {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/78 px-3 pb-3 pt-10 backdrop-blur-md sm:items-center sm:py-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/96 shadow-2xl shadow-slate-950/70">
        <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_14%_10%,rgba(14,165,233,0.35),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(236,72,153,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))] p-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/10 text-slate-200"
            title="Close"
          >
            <X size={15} />
          </button>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">Community Rules</p>
          <h2 className="mt-1 pr-10 text-xl font-black text-white sm:text-2xl">
            📜 Malayali Vibe Chat Room
          </h2>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">
            Read and acknowledge before entering the vibe.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="grid gap-3">
            {RULES.map((rule) => (
              <section key={rule.title} className="rounded-2xl border border-white/10 bg-white/7 p-3">
                <p className="text-sm font-black text-white">{rule.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{rule.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3">
            <p className="text-sm font-black text-amber-200">⚠️ Final Warning</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
              Entering Malayali Vibe Chat Room may result in sleep schedule destruction, uncontrollable laughter,
              emotional attachment to strangers, permanent inside jokes, random Malayalam chaos, and unexpected friendships.
            </p>
            <p className="mt-2 text-sm font-black text-white">Welcome to the vibe 🌙</p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-slate-950/92 p-4">
          <label className="flex items-start gap-3 rounded-2xl bg-white/7 p-3 text-xs font-bold leading-5 text-slate-200">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1"
            />
            I have read and agree to follow the Malayali Vibe community rules.
          </label>
          <button
            type="button"
            onClick={onAccept}
            disabled={!acknowledged}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            <ShieldCheck size={17} /> Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
