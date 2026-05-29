import { useEffect, useRef, useState } from "react";
import { Headphones, ShieldCheck, Volume2, VolumeX, X } from "lucide-react";

type Legend = {
  icon: string;
  name: string;
  caption: string;
};

type WelcomeRoomCard = Legend;

type WelcomeRoomGroup = {
  title: string;
  tone: "romance" | "friends";
  rooms: WelcomeRoomCard[];
  marquee?: string;
};

const ROMANCE_LEGENDS: Legend[] = [
  { icon: "👑", name: "PL", caption: "ladies favourite since prehistoric WiFi era" },
  { icon: "✨", name: "AM", caption: "certified aura distributor" },
  { icon: "🎤", name: "G_G", caption: "singing first, thinking later" },
  { icon: "❄️", name: "Frosty", caption: "vanished without explanation… still typing somewhere probably" },
  { icon: "🇲🇱", name: "Sathyan", caption: "Deeply in love with Malayalam font" },
  { icon: "😈", name: "Punyalan", caption: "Certified Moda Supplier" },
  { icon: "🎮", name: "Lucifer", caption: "Poland ne kurich oraksharam mindaruth" },
  { icon: "🎶", name: "Chellamma", caption: "melody + sarcasm combo" },
  { icon: "🫧", name: "Broken Angel", caption: "Bubbly with full of energy" },
  { icon: "🎵", name: "Mastani", caption: "Northy Girl with a Singin soul" },
  { icon: "🐍", name: "Rattles", caption: "The Girl with a Fighter mind & Vip's Dream Girl" },
  { icon: "🌀", name: "Zaya & Siya", caption: "confusion twins powered by chaos" },
  { icon: "💌", name: "Soul For You", caption: "flirting department chairman" },
  { icon: "👻", name: "Paavam Jinn", caption: "chill guy… until provoked....😤" },
  { icon: "🌧️", name: "Black Pearl", caption: "Punyalan's partner in crime" },
  { icon: "✨", name: "Chaithra", caption: "innocent face, dangerous typing speed" },
  { icon: "🚨", name: "F37", caption: "nobody still knows what F means" },
  { icon: "😎", name: "Paavam VIP", caption: "cashew nut wholesaler with VIP emotions" },
  { icon: "😂", name: "Shyam", caption: "“I love you” loading faster than 5G network ⚡" },
];

const FRIENDS_LEGENDS: Legend[] = [
  { icon: "🎙️", name: "CM", caption: "mic smoothness level: dangerous" },
  { icon: "🦠", name: "Covidian", caption: "survived every online generation update" },
  { icon: "😎", name: "Vishnu", caption: "Ladies First Movement founder" },
  { icon: "🎭", name: "Masterpiece", caption: "witty counter chatter & certified pickup line specialist" },
  { icon: "🔥", name: "Samantha", caption: "Feminist with a Dangerous rasting skill" },
  { icon: "💪🎤", name: "Shaaz003", caption: "gym body, singer soul" },
  { icon: "👀", name: "Bheegaran", caption: "permanently online, never type a word" },
  { icon: "🗣️", name: "Tessa", caption: "Body buffering in Hindi, soul streaming in Malayalam HD 📡" },
  { icon: "⚡", name: "Rahul Dubai", caption: "instant Counter machine" },
  { icon: "🎼", name: "Ewarr", caption: "philosopher with background music" },
  { icon: "❄️", name: "Snowy", caption: "spicy counter queen with unlimited battery" },
  { icon: "🎵", name: "Vaigakutty", caption: "singer with permanent sanchari mode enabled" },
  { icon: "💉❤️", name: "Arya", caption: 'female version of "Pavam Jinn" 😂' },
  { icon: "😂🎶", name: "Gopika", caption: "laughter soundtrack enabled" },
];

const WARNINGS = [
  "Unexpected friendships 🤝",
  "Sleep schedule destruction 🌙",
  "Emotional attachment issues 💔",
  "Random singing battles 🎤",
  "Fake fights turning into real friendships 😂",
  "People disappearing for 8 months and returning with “Hi guys” 👀",
  "Typing “gn” and staying online for 3 more hours",
  "Sudden nostalgia attacks after midnight",
];

const ROMANCE_MORE =
  "Other Legendary Romance Vibers: Manikuttan • Jerin • Balan • Charly • Vibes • Leo • Vikki • Janki • VaigaS • Sknr • K.Pachu • Babs • Kamala • Vikru";

const FRIENDS_MORE =
  "More KC Friends Legends: Tuxedo • amazing • SK • Kripa • Maya • Raaj • Nadia • Maalu • Shalabham • Femina • Anamika • UrMyall • RK • Boss2022 • Monk • Dilu1245 • UrmyAll • Amz_Urs • Pazham41Inch • Giggles";

const WELCOME_ROOM_GROUPS: WelcomeRoomGroup[] = [
  {
    title: "Romance Vibes",
    tone: "romance",
    rooms: ROMANCE_LEGENDS,
    marquee: ROMANCE_MORE,
  },
  {
    title: "Friends Vibes",
    tone: "friends",
    rooms: FRIENDS_LEGENDS,
    marquee: FRIENDS_MORE,
  },
];

function KcMarquee({ text }: { text: string }) {
  return (
    <div className="kc-legends-strip">
      <div className="kc-legends-marquee">
        <span>{text}</span>
        <span aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}

function RoomCard({ room, tone }: { room: WelcomeRoomCard; tone: WelcomeRoomGroup["tone"] }) {
  const toneClass =
    tone === "romance" ? "welcome-room-card--romance" : "welcome-room-card--friends";

  return (
    <article className={`welcome-room-card ${toneClass}`}>
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-lg shadow-inner shadow-white/5 sm:size-11 sm:rounded-2xl sm:text-xl">
        {room.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-black text-white sm:text-base">{room.name}</h4>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] font-normal leading-4 text-slate-300 sm:text-xs sm:leading-5">
          {room.caption}
        </p>
      </div>
    </article>
  );
}

function RoomGroup({ group }: { group: WelcomeRoomGroup }) {
  return (
    <section className="welcome-room-group">
      <div className="text-center">
        <div className="text-[11px] font-black tracking-[0.26em] text-slate-500">━━━━━━━━━━━━━━━</div>
        <h3 className="mt-2 text-base font-black text-white sm:text-lg">
          {group.tone === "romance" ? "💘 THE ROMANCE VIBERS" : "🤝 THE FRIENDS VIBERS"}
        </h3>
        <div className="mt-1 text-[11px] font-black tracking-[0.26em] text-slate-500">━━━━━━━━━━━━━━━</div>
      </div>
      <div className="welcome-room-grid mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {group.rooms.map((room) => (
          <RoomCard key={`${group.title}-${room.name}-${room.caption}`} room={room} tone={group.tone} />
        ))}
      </div>
      {group.marquee && (
        <div className="mt-4">
          <KcMarquee text={group.marquee} />
        </div>
      )}
    </section>
  );
}

export function KcWelcomeOverlay({
  open,
  onClose,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    timer: number;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [atBottom, setAtBottom] = useState(false);
  const [ambienceOn, setAmbienceOn] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setAtBottom(false);
      setAmbienceOn(false);
    }
  }, [open]);

  useEffect(() => {
    if (!ambienceOn || typeof window === "undefined") return;

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;

    const context = new AudioCtor();
    const gain = context.createGain();
    gain.gain.value = 0.018;
    gain.connect(context.destination);

    const playTick = () => {
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = 430 + Math.random() * 170;
      oscillator.connect(gain);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.035);
    };

    const timer = window.setInterval(playTick, 850);
    audioRef.current = { context, gain, timer };
    playTick();

    return () => {
      window.clearInterval(timer);
      void context.close();
      audioRef.current = null;
    };
  }, [ambienceOn]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  function updateProgress() {
    const node = scrollRef.current;
    if (!node) return;

    const max = node.scrollHeight - node.clientHeight;
    const next = max <= 0 ? 100 : Math.min(100, Math.round((node.scrollTop / max) * 100));
    setProgress(next);
    if (next >= 98) setAtBottom(true);
  }

  function continueToEntry() {
    setAmbienceOn(false);
    onContinue();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/82 text-white backdrop-blur-xl animate-in fade-in duration-500">
    <style>{`
      .welcome-scroll-fade {
        mask-image: linear-gradient(to bottom, black 0, black calc(100% - 20px), transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, black 0, black calc(100% - 20px), transparent 100%);
      }
      .welcome-room-group {
        border-radius: 1.5rem;
        border: 1px solid oklch(1 0 0 / 0.1);
        background: linear-gradient(135deg, oklch(0.16 0.04 260 / 0.78), oklch(0.11 0.03 250 / 0.86));
        padding: 0.85rem;
        box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 18px 42px oklch(0 0 0 / 0.24);
      }
      .welcome-room-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.625rem;
        margin-top: 0.75rem;
      }
      @media (min-width: 640px) {
        .welcome-room-group { padding: 1rem; }
        .welcome-room-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }
      }
      .welcome-room-card {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        min-height: 4.05rem;
        border-radius: 1rem;
        border: 1px solid oklch(1 0 0 / 0.12);
        background:
          radial-gradient(circle at 0 0, oklch(1 0 0 / 0.08), transparent 34%),
          linear-gradient(135deg, oklch(0.2 0.05 260 / 0.86), oklch(0.13 0.04 250 / 0.9));
        padding: 0.65rem;
        box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.07), 0 14px 32px oklch(0 0 0 / 0.24);
        transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        box-sizing: border-box;
      }
      .welcome-room-card:hover { transform: translateY(-1px); }
      @media (min-width: 640px) {
        .welcome-room-card {
          gap: 0.75rem;
          min-height: 4.65rem;
          border-radius: 1.15rem;
          padding: 0.75rem;
          max-width: none;
        }
      }
      .welcome-room-card--romance {
        border-color: oklch(0.76 0.2 342 / 0.32);
        background:
          radial-gradient(circle at 0 0, oklch(0.74 0.22 342 / 0.18), transparent 38%),
          linear-gradient(135deg, oklch(0.2 0.08 330 / 0.88), oklch(0.12 0.04 265 / 0.9));
        box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 16px 34px oklch(0.7 0.2 342 / 0.16);
      }
      .welcome-room-card--friends {
        border-color: oklch(0.72 0.16 250 / 0.34);
        background:
          radial-gradient(circle at 0 0, oklch(0.72 0.16 250 / 0.18), transparent 38%),
          linear-gradient(135deg, oklch(0.19 0.07 255 / 0.9), oklch(0.12 0.04 285 / 0.9));
        box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 16px 34px oklch(0.58 0.17 250 / 0.16);
      }
      .kc-legends-strip {
        position: relative;
        overflow: hidden;
        border-radius: 999px;
        border: 1px solid oklch(0.86 0.14 82 / 0.24);
        background: linear-gradient(90deg, oklch(0.14 0.04 260 / 0.82), oklch(0.2 0.05 280 / 0.58));
        box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 12px 34px oklch(0 0 0 / 0.2);
      }
      .kc-legends-strip::before, .kc-legends-strip::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0;
        z-index: 2;
        width: 34px;
        pointer-events: none;
      }
      .kc-legends-strip::before {
        left: 0;
        background: linear-gradient(to right, oklch(0.14 0.04 260), transparent);
      }
      .kc-legends-strip::after {
        right: 0;
        background: linear-gradient(to left, oklch(0.16 0.05 280), transparent);
      }
      @keyframes kc-legends-marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .kc-legends-marquee {
        display: flex;
        width: max-content;
        gap: 1.4rem;
        padding: 0.65rem 1.1rem;
        color: oklch(0.92 0.05 88);
        font-size: 0.78rem;
        font-weight: 800;
        white-space: nowrap;
        animation: kc-legends-marquee 34s linear infinite;
      }
      .kc-legends-strip:hover .kc-legends-marquee { animation-play-state: paused; }
    `}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute left-[12%] top-[18%] size-1 rounded-full bg-sky-200/80 animate-pulse" />
        <span className="absolute left-[74%] top-[14%] size-1.5 rounded-full bg-pink-200/70 animate-pulse" />
        <span className="absolute left-[48%] top-[52%] size-1 rounded-full bg-amber-100/70 animate-pulse" />
        <span className="absolute left-[84%] top-[72%] size-1 rounded-full bg-cyan-100/70 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(236,72,153,0.14),transparent_30%),radial-gradient(circle_at_50%_92%,rgba(245,158,11,0.10),transparent_38%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(180deg,transparent_0,rgba(148,163,184,0.18)_1px,transparent_2px)] [background-size:100%_18px]" />
      </div>

      <div className="relative mx-auto flex h-[100dvh] w-full max-w-5xl flex-col px-3 py-3 sm:px-5 sm:py-5">
        <div className="welcome-gate-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/12 bg-slate-950/92 shadow-2xl">
          <header className="relative border-b border-white/10 bg-slate-950/80 px-4 py-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/10 text-slate-200 transition hover:bg-white/15"
              title="Close welcome"
            >
              <X size={16} />
            </button>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-sky-100">
              <Headphones size={13} /> KC archive unlocked
            </p>
            <h2 className="mt-3 pr-10 text-2xl font-black leading-tight text-white sm:text-4xl">
              🌙 Welcome Back to the KC Room™
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
              Some rooms never die. They just wait for the right people to return…
            </p>
            <p className="mt-2 max-w-3xl text-xs font-bold leading-5 text-amber-100/90 sm:text-sm">
              Please observe 3 seconds of silence for the legendary souls who once ruled these chatrooms day n night ðŸ‘€
            </p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-300 via-fuchsia-300 to-amber-200 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </header>

          <div
            ref={scrollRef}
            onScroll={updateProgress}
            className="welcome-scroll-fade min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 no-scrollbar sm:px-6"
          >
            {false && <section className="welcome-announcement relative overflow-hidden rounded-b-[2rem] border border-white/10 bg-white/[0.055] px-4 py-5 text-center">
              <p className="mx-auto max-w-2xl text-base font-black leading-7 text-amber-100 sm:text-lg">
                Please observe 3 seconds of silence for the legendary souls who once ruled these chatrooms day n night 👀
              </p>
            </section>}

            <div className="grid gap-5">
              {WELCOME_ROOM_GROUPS.map((group) => (
                <RoomGroup key={group.title} group={group} />
              ))}

              <section className="rounded-[1.5rem] border border-amber-300/25 bg-amber-300/10 p-4 sm:p-5">
                <div className="text-center">
                  <div className="text-[11px] font-black tracking-[0.26em] text-amber-200/55">━━━━━━━━━━━━━━━</div>
                  <h3 className="mt-2 text-xl font-black text-amber-100 sm:text-2xl">⚠️ WARNING</h3>
                  <div className="mt-1 text-[11px] font-black tracking-[0.26em] text-amber-200/55">━━━━━━━━━━━━━━━</div>
                </div>
                <p className="mt-5 text-sm font-black text-white">Entering this room may cause:</p>
                <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-200 sm:grid-cols-2">
                  {WARNINGS.map((warning) => (
                    <li key={warning} className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2">
                      {warning}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-2xl bg-slate-950/55 px-4 py-4 text-center text-base font-black text-white sm:text-lg">
                  Press ENTER only if your mental stability is strong enough.
                </p>
              </section>
            </div>
          </div>

          <footer className="sticky bottom-0 border-t border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-slate-950/70 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setAmbienceOn((value) => !value)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-xs font-black text-slate-200 transition hover:bg-white/12"
              >
                {ambienceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                Nostalgic ambience {ambienceOn ? "on" : "muted"}
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md">
                <p className="text-center text-[11px] font-bold text-slate-400 sm:text-right">
                  {atBottom ? "KC gate unlocked." : "Scroll to the bottom to unlock the KC gate."}
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid min-h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-300 transition hover:bg-white/12"
                    title="Close welcome"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={continueToEntry}
                    disabled={!atBottom}
                    className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition ${
                      atBottom
                        ? "bg-gradient-to-r from-sky-400 via-fuchsia-400 to-amber-300 text-slate-950 shadow-lg shadow-sky-500/25 hover:-translate-y-0.5"
                        : "cursor-not-allowed bg-slate-800 text-slate-500"
                    }`}
                  >
                    <ShieldCheck size={17} /> Continue to KC
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
