import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { CinematicReactions, isSpecialEmoji } from "@/components/CinematicReactions";
import { VoiceMessage } from "@/components/VoiceMessage";
import { GuestExpiryNotice } from "@/components/GuestExpiryNotice";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  Mic,
  Square,
  ArrowDown,
  Bot,
  Lock,
  Reply,
  Copy,
  Flag,
  Camera,
  Send,
  Smile,
  Image as ImageIcon,
  LogOut,
  Trash2,
  Radio,
  Anchor,
  MessageCircle,
  Users,
  Ban,
  ChevronLeft,
  ChevronsRight,
  Clapperboard,
  Gamepad2,
  Gift,
  HelpCircle,
  VenetianMask,
  Sticker,
  Volume2,
  VolumeX,
  Trophy,
  Unlock,
  Maximize2,
  Minimize2,
  Palette,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { claimProfileCompletionReward, formatCouponValue } from "@/lib/rewards";
import { setFeaturedGift, type GiftCatalogItem, type GiftTransaction } from "@/lib/gifts";
import { accountBadge, accountTypeForProfile, guestExpiryText, GUEST_DAILY_VOICE_LIMIT, guestVoiceCountKey } from "@/lib/account";

export const Route = createFileRoute("/chat")({
  head: () =>
    seo({
      title: "Malayali Chat Rooms | Live Community Chat for Malayalis",
      description:
        "Join live Malayali chat rooms, meet friends, share messages, voice notes, moods, and enjoy a fun online community experience.",
      path: "/chat",
    }),
  component: Chat,
});

const ROOMS = [
  {
    id: "friends",
    emoji: "💫",
    name: "Friends Vibing",
    label: "Malayalam + English",
    accent: "bg-sky-400",
  },
  {
    id: "romance",
    emoji: "💘",
    name: "Romance Vibes",
    label: "Slow chat room",
    accent: "bg-rose-400",
  },
];

const QUICK_EMOJIS = [
  "❤️", "😂", "🔥", "👏", "✨", "😍", "👍", "💖", "😘", "💋", "💞", "💕",
  "🥰", "😎", "🤝", "🙌", "😜", "😇", "🥳", "😢", "😭", "🤗", "😡", "😴",
  "🤔", "🎉", "🌹", "💯", "🫶", "🫰",
];

const QUIZ_PROMPTS = [
  "Quiz: Kerala's capital city? A) Kochi B) Trivandrum C) Kozhikode",
  "Quiz: Which festival is linked with pookalam? A) Vishu B) Onam C) Eid",
  "Quiz: Malayalam cinema is often called? A) Mollywood B) Kollywood C) Sandalwood",
  "Quiz: Which sea borders Kerala? A) Arabian Sea B) Bay of Bengal C) Red Sea",
  "Funny Quiz: Who finishes tea first? A) Appa B) Amma C) The guest who said 'just little'",
  "Funny Quiz: Kerala rain starts exactly when? A) You wash clothes B) You forget umbrella C) Both",
  "Funny Quiz: Best excuse for being late? A) Traffic B) Rain C) Friend was still getting ready",
  "Funny Quiz: Which snack disappears fastest? A) Pazham pori B) Parippu vada C) Banana chips",
  "Food Quiz: Best combo? A) Porotta beef B) Appam stew C) Puttu kadala",
  "Movie Quiz: Who gets the most mass entry? A) Mohanlal B) Mammootty C) The friend with Bluetooth speaker",
  "Word Quiz: Malayalam word for friend? A) Koottukaran B) Kadal C) Mazha",
  "Silly Poll: Choose one superpower. A) No traffic B) Unlimited biryani C) Phone never dies",
  "Silly Poll: Room mood now? A) Full comedy B) Chill C) Sleepy but online",
  "Speed Quiz: Type one Malayalam movie without using the letter A.",
  "Speed Quiz: Name a Kerala place in 5 seconds.",
];

type MiniGameId = "mafia" | "truth" | "song" | "scribble" | "story" | "voice" | "quiz";

const CURRENT_RADIO_SONG = "KC Radio Live";

type GameEvent = {
  id: string;
  game: MiniGameId;
  user: string;
  avatar?: string;
  text: string;
  kind: "join" | "vote" | "complete" | "win" | "draw" | "hint" | "round";
  target?: string;
  points?: { x: number; y: number }[];
  createdAt: number;
};

const MINI_GAMES: {
  id: MiniGameId;
  label: string;
  emoji: string;
  sub: string;
  color: string;
}[] = [
  { id: "mafia", label: "Mafia", emoji: "M", sub: "Roles + votes", color: "from-violet-500 to-slate-700" },
  { id: "truth", label: "Truth or Dare", emoji: "T", sub: "Funny cards", color: "from-rose-500 to-orange-400" },
  { id: "song", label: "Guess Song", emoji: "S", sub: "Malayalam/Tamil/Hindi", color: "from-emerald-500 to-teal-400" },
  { id: "scribble", label: "Scribble Draw", emoji: "D", sub: "Draw + guess", color: "from-fuchsia-500 to-pink-500" },
  { id: "story", label: "Emoji Story", emoji: "E", sub: "Emoji battle", color: "from-amber-400 to-lime-400" },
  { id: "voice", label: "Voice Challenge", emoji: "V", sub: "RJ prompts", color: "from-sky-500 to-indigo-500" },
  { id: "quiz", label: "Malayalam Quiz", emoji: "Q", sub: "Fast quiz", color: "from-cyan-500 to-blue-500" },
];

const TRUTH_DARES = [
  "Truth: funniest thing you searched online?",
  "Dare: reply using only emojis for 2 messages.",
  "Truth: your most dramatic food craving?",
  "Dare: tag someone and give them a movie hero entry.",
  "Truth: one song you secretly love?",
  "Dare: type a dialogue like a movie villain.",
];

const SONG_HINTS = {
  Malayalam: ["Rain + train + love failure", "College vibe, friendship chorus", "Old classic, everybody hums it"],
  Tamil: ["Mass intro with drums", "Love song near the beach", "Sad melody, big hero movie"],
  Hindi: ["Road trip friendship song", "Wedding dance hit", "90s romantic classic"],
};

const EMOJI_STORIES = ["🌧️🚆💔📱", "🍵😂👀🏃", "🎬🔥😎👏", "🌙💬❤️✨", "🏖️🎵🤳😂"];
const VOICE_CHALLENGES = ["Say one movie dialogue in RJ style", "Sing only one line, no full concert", "Say good night like a radio host", "Roast the room softly in 5 seconds"];

function storedNumber(key: string, fallback = 0) {
  if (typeof window === "undefined") return fallback;
  return Number(localStorage.getItem(key) ?? fallback);
}

function storedText(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

const GIF_CATEGORIES = ["Reaction", "Funny", "Malayalam mood", "Troll", "Love", "Celebration", "Sad"] as const;
type GifCategory = (typeof GIF_CATEGORIES)[number];
type GifItem = {
  id: string;
  label: string;
  category: GifCategory;
  url: string;
  token: string;
};

const GIFS: GifItem[] = [
  { id: "waiting-reaction", label: "Waiting", category: "Reaction", url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", token: "[[gif:waiting-reaction]]" },
  { id: "laugh-out", label: "Full laugh", category: "Funny", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif", token: "[[gif:laugh-out]]" },
  { id: "mass-entry", label: "Mass entry", category: "Malayalam mood", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", token: "[[gif:mass-entry]]" },
  { id: "troll-look", label: "Troll look", category: "Troll", url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", token: "[[gif:troll-look]]" },
  { id: "heart-vibe", label: "Heart vibe", category: "Love", url: "https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif", token: "[[gif:heart-vibe]]" },
  { id: "party-pop", label: "Party pop", category: "Celebration", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif", token: "[[gif:party-pop]]" },
  { id: "sad-mood", label: "Sad mood", category: "Sad", url: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif", token: "[[gif:sad-mood]]" },
];

const STICKER_CATEGORIES = ["Cute", "Funny", "Malayalam Troll", "Movie Reactions", "Love", "Angry", "Sad", "Celebration"] as const;
type StickerCategory = (typeof STICKER_CATEGORIES)[number];
type CharacterSticker = {
  id: string;
  label: string;
  category: StickerCategory;
  face: string;
  token: string;
  mood: string;
  text: string;
};

const CHARACTER_STICKERS: CharacterSticker[] = [
  { id: "shy-buddy", label: "Shy Buddy", category: "Cute", face: "bear", token: "[[sticker:shy-buddy]]", mood: "blush", text: "cute aanu" },
  { id: "sleepy-cloud", label: "Sleepy Cloud", category: "Sad", face: "cloud", token: "[[sticker:sleepy-cloud]]", mood: "float", text: "poyi kidakku" },
  { id: "tiny-heart", label: "Tiny Heart", category: "Love", face: "heart", token: "[[sticker:tiny-heart]]", mood: "heart", text: "love vibe" },
  { id: "dance-pal", label: "Dance Pal", category: "Celebration", face: "party", token: "[[sticker:dance-pal]]", mood: "dance", text: "set aanu" },
  { id: "wave-cutie", label: "Wave Cutie", category: "Funny", face: "wave", token: "[[sticker:wave-cutie]]", mood: "wave", text: "scene aanu" },
  { id: "sad-moon", label: "Sad Moon", category: "Sad", face: "moon", token: "[[sticker:sad-moon]]", mood: "drift", text: "ayyoo" },
  { id: "poli-vibe", label: "Poli Vibe", category: "Malayalam Troll", face: "spark", token: "[[sticker:poli-vibe]]", mood: "dance", text: "poli" },
  { id: "mass-face", label: "Mass Face", category: "Movie Reactions", face: "star", token: "[[sticker:mass-face]]", mood: "heart", text: "mass" },
  { id: "angry-counter", label: "Angry Counter", category: "Angry", face: "fire", token: "[[sticker:angry-counter]]", mood: "wave", text: "counter ready" },
  { id: "full-chaos", label: "Full Chaos", category: "Malayalam Troll", face: "bolt", token: "[[sticker:full-chaos]]", mood: "dance", text: "chaos mode" },
];
const GAMES = [
  {
    id: "ludo",
    label: "Ludo Call",
    sub: "Invite players",
    prompts: [
      "🎲 Ludo call: who is joining this round?",
      "🎲 Ludo call: who is joining this round?",
      "🎲 Ludo squad needed. Tag 3 players.",
      "🎲 Ludo challenge: winner gets bragging rights for 10 minutes.",
    ],
  },
  {
    id: "word",
    label: "Wordgame",
    sub: "Fast words",
    prompts: [
      "🔤 Wordgame: make a Malayalam or English word from VIBE.",
      "🔤 Word chain: next word must start with the last letter.",
      "🔤 Type a Malayalam word that starts with MA.",
    ],
  },
  {
    id: "movie",
    label: "Guess Movie",
    sub: "Clue game",
    prompts: [
      "🎬 Guess the movie: give 3 clean clues, no actor name.",
      "🎬 Guess the movie from one dialogue. Tag someone to answer.",
      "🎬 Guess the movie by emoji: 🌧️❤️🚆",
    ],
  },
  {
    id: "truth",
    label: "Truth or Task",
    sub: "Clean challenges",
    prompts: [
      "🎯 Truth or Task: share a funny school memory or do a voice-note dialogue.",
      "🎯 Truth or Task: tell your funniest food craving or send a sticker.",
      "🎯 Truth or Task: name your comfort movie or tag someone to answer.",
    ],
  },
  {
    id: "rapid",
    label: "Rapid Fire",
    sub: "Quick answers",
    prompts: [
      "⚡ Rapid Fire: tea or coffee?",
      "⚡ Rapid Fire: beach or hill station?",
      "⚡ Rapid Fire: biryani or porotta?",
    ],
  },
];

function specialEmojiForText(value: string) {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (/\b(i love you|love you|luv you|love u|ily)\b/.test(normalized)) return "💖";
  if (/\b(miss you|miss u|missing you|missed you)\b/.test(normalized)) return "💞";
  if (/\b(kiss|mwah|umma|ummaah)\b/.test(normalized)) return "💋";
  if (/\b(hug|hugs|need a hug)\b/.test(normalized)) return "🫶";
  return null;
}

function isTaggedLoveMessage(value?: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return /@\w+/.test(normalized) && /\b(i love you|love you|luv you|love u|ily)\b/.test(normalized);
}

function isMissYouMessage(value?: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return /\b(i miss you|miss you|missing you)\b/.test(normalized);
}

function isNightRainPhrase(value?: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return /\b(miss you da|come back|where are you)\b/.test(normalized);
}

function isLateNightIndia() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour > 22 || (hour === 22 && minute >= 30);
}

function FloatingDustText({ text, rain = false }: { text: string; rain?: boolean }) {
  return (
    <p className={`${rain ? "vibe-night-rain" : "vibe-miss-dust"} text-[14px] font-bold leading-6`}>
      {text.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          className={rain ? "vibe-rain-letter" : "vibe-miss-letter"}
          style={{ "--i": index } as React.CSSProperties}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
      <span className={rain ? "vibe-rain-drops" : "vibe-miss-particles"} aria-hidden="true" />
    </p>
  );
}

function stickerFromText(value?: string | null) {
  if (!value) return null;
  return CHARACTER_STICKERS.find((item) => item.token === value.trim()) ?? null;
}

function gifFromText(value?: string | null) {
  if (!value) return null;
  return GIFS.find((item) => item.token === value.trim()) ?? null;
}

function StickerFace({ sticker }: { sticker: CharacterSticker }) {
  const faceClass = `vibe-character-face vibe-sticker-face vibe-sticker-${sticker.face}`;
  return (
    <span className={faceClass} aria-hidden="true">
      <span />
    </span>
  );
}

function AnimatedCharacterSticker({ text }: { text?: string | null }) {
  const sticker = stickerFromText(text);
  if (!sticker) return null;
  return (
    <div className={`vibe-character-sticker vibe-character-${sticker.mood}`} title={sticker.label}>
      <StickerFace sticker={sticker} />
      <span className="vibe-character-label">{sticker.text}</span>
      <span className="vibe-character-sparkles" aria-hidden="true" />
    </div>
  );
}

function GifMessage({ gif }: { gif: GifItem }) {
  return (
    <button
      type="button"
      onClick={() => window.open(gif.url, "_blank", "noopener,noreferrer")}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-1 text-left shadow-lg shadow-slate-950/20"
      title={`Open ${gif.label}`}
    >
      <img
        src={gif.url}
        alt={`${gif.label} GIF reaction`}
        loading="lazy"
        className="max-h-44 w-full max-w-[240px] rounded-xl object-cover transition duration-200 group-hover:scale-[1.02]"
      />
      <span className="block px-1.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-200">
        GIF
      </span>
    </button>
  );
}

function AvatarCircle({
  profile,
  fallback = "🧑",
  className = "size-9 text-lg",
}: {
  profile?: Partial<Profile> | null;
  fallback?: string;
  className?: string;
}) {
  const label = displayNameFor(profile as Profile | undefined);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white text-slate-950 ${className}`}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={`${label} profile picture`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{profile?.avatar_emoji ?? fallback}</span>
      )}
    </span>
  );
}

function messageSnippet(message?: DbMessage | null) {
  if (!message) return "Message not loaded";
  if (message.kind === "voice") return "Voice note";
  if (message.kind === "gif") return "GIF";
  if (message.kind === "sticker") return "Sticker";
  return cleanMessageText(message.text ?? "", 72) || "Message";
}

function extractMentionNames(value: string) {
  return [...new Set((value.match(/@([a-zA-Z0-9_.-]{2,24})/g) ?? []).map((item) => item.slice(1).toLowerCase()))];
}

function renderMentionedText(
  value: string,
  profilesByUsername: Map<string, Profile>,
  onOpen: (profile: Profile) => void,
  color?: string,
) {
  const parts = value.split(/(@[a-zA-Z0-9_.-]{2,24})/g);
  return parts.map((part, index) => {
    if (!part.startsWith("@")) return <span key={`${part}-${index}`}>{part}</span>;
    const found = profilesByUsername.get(part.slice(1).toLowerCase());
    return (
      <button
        key={`${part}-${index}`}
        type="button"
        onClick={() => found && onOpen(found)}
        className="rounded-md bg-sky-400/15 px-1 font-black text-sky-200 underline-offset-2 hover:underline"
        style={{ color }}
      >
        {part}
      </button>
    );
  });
}

function isBirthday(dob?: unknown) {
  if (typeof dob !== "string" || !dob) return false;
  const today = new Date();
  const born = new Date(dob);
  return born.getMonth() === today.getMonth() && born.getDate() === today.getDate();
}

type DbMessage = {
  id: string;
  room_id: string;
  user_id: string;
  text: string | null;
  kind: string;
  audio_url: string | null;
  duration_ms: number | null;
  reply_to_message_id?: string | null;
  mentions?: string[] | null;
  created_at: string;
};

type DmMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string | null;
  kind: string;
  audio_url: string | null;
  duration_ms: number | null;
  created_at: string;
};

type MenuUser = {
  user_id: string;
  username?: string | null;
  avatar_emoji?: string | null;
  avatar_url?: string | null;
  x: number;
  y: number;
};

type RoomActivityEvent = {
  id: string;
  type: "enter" | "leave";
  room_id: string;
  room_name: string;
  user_id: string;
  username: string;
  createdAt: number;
};

const CHAT_NAME_COLORS = [
  "#38bdf8", "#fb7185", "#34d399", "#fbbf24", "#a78bfa", "#f472b6",
  "#22d3ee", "#c084fc", "#4ade80", "#f97316", "#60a5fa", "#facc15",
];

const CHAT_MESSAGE_COLORS = [
  "#f8fafc", "#e0f2fe", "#fce7f3", "#dcfce7", "#fef3c7", "#ede9fe",
  "#cffafe", "#ffe4e6",
];

const MAX_VOICE_RECORDING_MS = 90_000;
const SLIDE_CANCEL_PX = 86;

function hashUserColor(id: string, palette = CHAT_NAME_COLORS) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 9973;
  return palette[Math.abs(hash) % palette.length];
}

function cleanProfileText(value: string, max = 160) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanMessageText(value: string, max = 1000) {
  return value.replace(/[<>]/g, "").trim().slice(0, max);
}

function displayNameFor(profile?: Profile | null) {
  return profile?.display_name?.trim() || profile?.username || "user";
}

function formatVoiceTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function chatDebug(label: string, value?: unknown) {
  console.info(`[chat:${label}]`, value ?? "");
}

function Chat() {
  const nav = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [active, setActive] = useState(() => {
    const stored = typeof window === "undefined" ? null : localStorage.getItem("vibe-selected-room");
    return ROOMS.find((room) => room.id === stored) ?? ROOMS[0];
  });
  const [inRoom, setInRoom] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(localStorage.getItem("vibe-selected-room"));
  });
  const [msgs, setMsgs] = useState<DbMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number; y: number }[]>(
    [],
  );
  const [presenceCount, setPresenceCount] = useState(1);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [roomActivities, setRoomActivities] = useState<RoomActivityEvent[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<
    { user_id: string; username?: string; avatar_emoji?: string; avatar_url?: string | null; status_text?: string | null }[]
  >([]);
  const [typingUsers, setTypingUsers] = useState<
    Record<string, { username: string; avatar_emoji: string; avatar_url?: string | null; at: number }>
  >({});
  const [cinematic, setCinematic] = useState<{ id: string; emoji: string }[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [roomDrawerOpen, setRoomDrawerOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState<"gif" | "sticker" | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<DbMessage | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemove, setAvatarRemove] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [gifCategory, setGifCategory] = useState<GifCategory>("Reaction");
  const [gifSearch, setGifSearch] = useState("");
  const [stickerCategory, setStickerCategory] = useState<StickerCategory>("Cute");
  const [stickerSearch, setStickerSearch] = useState("");
  const [recentStickerIds, setRecentStickerIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("vibe-recent-stickers") ?? "[]");
    } catch {
      return [];
    }
  });
  const [gamesOpen, setGamesOpen] = useState(false);
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [adminBotOpen, setAdminBotOpen] = useState(false);
  const [adminFeedbackType, setAdminFeedbackType] = useState<"suggestion" | "complaint" | "help">("suggestion");
  const [adminFeedbackText, setAdminFeedbackText] = useState("");
  const [activeMessageActions, setActiveMessageActions] = useState<string | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [lockedNewMessages, setLockedNewMessages] = useState(0);
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameId>("mafia");
  const [gameFeed, setGameFeed] = useState<GameEvent[]>([]);
  const [gameXp, setGameXp] = useState(() => storedNumber("vibe-game-xp"));
  const [winStreak, setWinStreak] = useState(() => storedNumber("vibe-win-streak"));
  const [squadName, setSquadName] = useState(() => storedText("vibe-squad", "Vibe Squad"));
  const [localRole, setLocalRole] = useState<string | null>(null);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState<"radio" | "podcast" | null>(null);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [profileSheetUser, setProfileSheetUser] = useState<
    (Partial<Profile> & { id?: string; user_id?: string; username?: string; avatar_emoji?: string; avatar_url?: string | null }) | null
  >(null);
  const [profileGifts, setProfileGifts] = useState<
    (GiftTransaction & { gift?: GiftCatalogItem; sender?: Profile })[]
  >([]);
  const [userMenu, setUserMenu] = useState<MenuUser | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    display_name: "",
    bio: "",
    status_text: "",
    dm_enabled: true,
    username_color: "",
    message_color: "",
  });
  const [dmPeer, setDmPeer] = useState<Profile | null>(null);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmMinimized, setDmMinimized] = useState(false);
  const [dmExpanded, setDmExpanded] = useState(false);
  const [dmMsgs, setDmMsgs] = useState<DmMessage[]>([]);
  const [dmText, setDmText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dmScrollerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const gameTrayTouchStartRef = useRef<number | null>(null);
  const recorder = useVoiceRecorder();
  const cancelRecordRef = useRef(false);
  const recordStartXRef = useRef(0);
  const recordAutoStopRef = useRef(false);
  const [recordDragX, setRecordDragX] = useState(0);
  const [recordWillCancel, setRecordWillCancel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  function triggerCinematic(emoji: string, id?: string) {
    setCinematic((c) => [...c.slice(-4), { id: id ?? `${Date.now()}-${Math.random()}`, emoji }]);
  }

  function broadcastReaction(emoji: string) {
    const id = `${Date.now()}-${Math.random()}`;
    triggerCinematic(emoji, id);
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { emoji, id } });
  }

  function scrollToLatest(behavior: ScrollBehavior = "smooth") {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior });
  }

  function unlockScrollAndJump() {
    setScrollLocked(false);
    setLockedNewMessages(0);
    setTimeout(() => scrollToLatest(), 30);
  }

  function jumpToMessage(id?: string | null) {
    if (!id) return;
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      toast("Original message is not loaded here");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-sky-300/70");
    setTimeout(() => el.classList.remove("ring-2", "ring-sky-300/70"), 1500);
  }

  async function copyMessage(message: DbMessage) {
    const value = messageSnippet(message);
    await navigator.clipboard?.writeText(value);
    toast.success("Message copied");
  }

  async function reportMessage(message: DbMessage) {
    if (!user) return;
    const { error } = await (supabase as any).from("message_reports").insert({
      message_id: message.id,
      reporter_id: user.id,
      reason: "Reported from chat actions",
      status: "pending",
    });
    if (error) toast.error(error.message);
    else toast.success("Reported to admin");
  }

  function awardGameXp(amount: number, won = false) {
    setGameXp((current) => {
      const next = current + amount;
      localStorage.setItem("vibe-game-xp", String(next));
      return next;
    });
    if (won) {
      setWinStreak((current) => {
        const next = current + 1;
        localStorage.setItem("vibe-win-streak", String(next));
        return next;
      });
      triggerCinematic("🎉", `${Date.now()}-game-win`);
    }
  }

  function pushGameEvent(event: GameEvent) {
    setGameFeed((current) => (
      current.some((item) => item.id === event.id) ? current : [event, ...current].slice(0, 50)
    ));
  }

  function sendGameEvent(
    game: MiniGameId,
    textValue: string,
    kind: GameEvent["kind"] = "round",
    extra: Partial<GameEvent> = {},
  ) {
    const event: GameEvent = {
      id: `${Date.now()}-${Math.random()}`,
      game,
      user: profile?.username ?? "you",
      avatar: profile?.avatar_emoji ?? "🧑",
      text: textValue,
      kind,
      createdAt: Date.now(),
      ...extra,
    };
    pushGameEvent(event);
    awardGameXp(kind === "win" ? 35 : 8, kind === "win");
    channelRef.current?.send({ type: "broadcast", event: "game_event", payload: event });
  }

  function randomFrom<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)];
  }

  useEffect(() => {
    setMutedUsers(JSON.parse(localStorage.getItem("vibe-muted-users") ?? "[]"));
    setBlockedUsers(JSON.parse(localStorage.getItem("vibe-blocked-users") ?? "[]"));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const localBlocks = JSON.parse(localStorage.getItem("vibe-blocked-users") ?? "[]") as string[];
      const { data } = await (supabase as any)
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      if (cancelled) return;
      const dbBlocks = ((data ?? []) as { blocked_id: string }[]).map((row) => row.blocked_id);
      setBlockedUsers([...new Set([...localBlocks, ...dbBlocks])]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!userMenu) return;
    const close = () => setUserMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [userMenu]);

  function toggleMutedUser(id: string) {
    setMutedUsers((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      localStorage.setItem("vibe-muted-users", JSON.stringify(next));
      toast(next.includes(id) ? "User muted" : "User unmuted");
      return next;
    });
  }

  async function toggleBlockedUser(id: string) {
    if (!user) return;
    if (id === user.id) {
      toast.error("You cannot block yourself");
      return;
    }
    const isBlocked = blockedUsers.includes(id);
    const next = isBlocked ? blockedUsers.filter((x) => x !== id) : [...blockedUsers, id];
    setBlockedUsers(next);
    localStorage.setItem("vibe-blocked-users", JSON.stringify(next));

    const query = (supabase as any).from("blocked_users");
    const { error } = isBlocked
      ? await query.delete().eq("blocker_id", user.id).eq("blocked_id", id)
      : await query.insert({ blocker_id: user.id, blocked_id: id });

    if (error) {
      toast("Block saved on this device. Apply the database update for permanent blocks.");
    } else {
      toast(isBlocked ? "User unblocked" : "User blocked");
    }
  }

  function openUserProfile(
    userId: string,
    info?: { username?: string | null; avatar_emoji?: string | null; avatar_url?: string | null },
  ) {
    setProfileSheetUser({
      user_id: userId,
      username: info?.username ?? profiles[userId]?.username ?? "user",
      avatar_emoji: info?.avatar_emoji ?? profiles[userId]?.avatar_emoji ?? "🧑",
      avatar_url: info?.avatar_url ?? profiles[userId]?.avatar_url ?? null,
    });
  }

  function pokeUser(target?: { user_id: string; username?: string }) {
    if (!target) return;
    postToolMessage(`@${target.username ?? "user"} poke poke 👋`);
    toast.success("Poke sent");
    setProfileSheetUser(null);
  }

  function messageUser(target?: { user_id: string }) {
    if (!target) return;
    if (isGuestAccount) {
      toast("Register to unlock full private messaging.");
      return;
    }
    setProfileSheetUser(null);
    nav({ to: "/dm/$userId", params: { userId: target.user_id } });
  }

  function openUserMenu(
    event: React.MouseEvent,
    target: { user_id: string; username?: string | null; avatar_emoji?: string | null; avatar_url?: string | null },
  ) {
    event.stopPropagation();
    if (target.user_id === user?.id) return;
    const maxX = typeof window === "undefined" ? event.clientX : window.innerWidth - 190;
    const maxY = typeof window === "undefined" ? event.clientY : window.innerHeight - 170;
    setUserMenu({
      ...target,
      x: Math.max(10, Math.min(event.clientX, maxX)),
      y: Math.max(10, Math.min(event.clientY, maxY)),
    });
  }

  // redirect if not signed in
  useEffect(() => {
    if (loading || user) return;
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.auth.getSession();
      chatDebug("auth-confirm-before-redirect", {
        hasSession: Boolean(data.session),
        userId: data.session?.user?.id ?? null,
        error: error?.message ?? null,
      });
      if (!data.session) nav({ to: "/login" });
    }, 1200);
    return () => clearTimeout(timeout);
  }, [loading, user, nav]);

  // Load history + subscribe to realtime
  useEffect(() => {
    if (!user || !inRoom) {
      setMsgs([]);
      setOnlineUsers([]);
      setPresenceCount(0);
      return;
    }
    let cancelled = false;

    async function load() {
      chatDebug("fetch-history:start", { room: active.id, userId: user.id });
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", active.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      chatDebug("fetch-history:result", {
        room: active.id,
        count: data?.length ?? 0,
        error: error?.message ?? null,
        newest: data?.[0]?.created_at ?? null,
        oldest: data?.[data.length - 1]?.created_at ?? null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (cancelled) return;
      const ordered = [...(data ?? [])].reverse();
      setMsgs(ordered);
      hydrateProfiles((data ?? []).map((m) => m.user_id));
    }
    load();

    const channel = supabase
      .channel(`room:${active.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${active.id}` },
        (payload) => {
          const m = payload.new as DbMessage;
          chatDebug("realtime-insert", {
            id: m.id,
            room: m.room_id,
            userId: m.user_id,
            createdAt: m.created_at,
          });
          setMsgs((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          hydrateProfiles([m.user_id]);
          const keywordEmoji = m.text ? specialEmojiForText(m.text) : null;
          if (m.text && m.user_id !== user?.id && !blockedUsers.includes(m.user_id)) {
            if (keywordEmoji) triggerCinematic(keywordEmoji, `${m.id}-keyword`);
            if (isSpecialEmoji(m.text)) triggerCinematic(m.text.trim(), m.id);
            if ((m.mentions ?? []).includes(user.id)) {
              toast(`${profiles[m.user_id]?.username ?? "Someone"} mentioned you`);
              triggerCinematic("✨", `${m.id}-mention`);
            }
          }
        },
      )
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        if (payload?.emoji) triggerCinematic(payload.emoji as string, payload.id as string);
      })
      .on("broadcast", { event: "game_event" }, ({ payload }) => {
        const event = payload as GameEvent | undefined;
        if (!event?.id || !event.game) return;
        pushGameEvent(event);
        if (event.kind === "win") triggerCinematic("🎉", `${event.id}-confetti`);
        if (event.kind === "vote") triggerCinematic("👀", `${event.id}-vote`);
      })
      .on("broadcast", { event: "room_activity" }, ({ payload }) => {
        const event = payload as RoomActivityEvent | undefined;
        if (!event?.id || event.user_id === user.id || event.room_id !== active.id) return;
        setRoomActivities((current) => (
          current.some((item) => item.id === event.id) ? current : [...current.slice(-8), event]
        ));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.user_id || payload.user_id === user?.id) return;
        setTypingUsers((prev) => ({
          ...prev,
          [payload.user_id]: {
            username: payload.username ?? "someone",
            avatar_emoji: payload.avatar_emoji ?? "🧑",
            avatar_url: payload.avatar_url ?? null,
            at: Date.now(),
          },
        }));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          { user_id: string; username?: string; avatar_emoji?: string; avatar_url?: string | null; status_text?: string | null; account_type?: string | null; guest_expires_at?: string | null }[]
        >;
        const flat = Object.values(state).flat();
        const unique = Array.from(new Map(flat.map((p) => [p.user_id, p])).values())
          .filter((p) => p.account_type !== "guest" || !p.guest_expires_at || new Date(p.guest_expires_at).getTime() > Date.now());
        setOnlineUsers(unique);
        setPresenceCount(unique.length || 1);
      })
      .subscribe(async (status) => {
        chatDebug("realtime-status", { room: active.id, status });
        if (status === "SUBSCRIBED" && user) {
          await channel.track({
            user_id: user.id,
            username: profile?.username ?? "you",
            avatar_emoji: profile?.avatar_emoji ?? "🧑",
            avatar_url: profile?.avatar_url ?? null,
            status_text: profile?.status_text ?? null,
            account_type: profile?.account_type ?? (profile?.is_guest ? "guest" : "registered"),
            guest_expires_at: profile?.guest_expires_at ?? null,
            online_at: new Date().toISOString(),
          });
          const activityKey = `vibe-room-join-${active.id}-${user.id}`;
          const lastJoin = Number(sessionStorage.getItem(activityKey) ?? 0);
          if (Date.now() - lastJoin > 12000) {
            sessionStorage.setItem(activityKey, String(Date.now()));
            const event: RoomActivityEvent = {
              id: `${active.id}-${user.id}-enter-${Date.now()}`,
              type: "enter",
              room_id: active.id,
              room_name: active.name,
              user_id: user.id,
              username: displayNameFor(profile) || profile?.username || "Someone",
              createdAt: Date.now(),
            };
            setRoomActivities((current) => [...current.slice(-8), event]);
            channel.send({ type: "broadcast", event: "room_activity", payload: event });
          }
        }
      });
    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (user && inRoom) {
        channel.send({
          type: "broadcast",
          event: "room_activity",
          payload: {
            id: `${active.id}-${user.id}-leave-${Date.now()}`,
            type: "leave",
            room_id: active.id,
            room_name: active.name,
            user_id: user.id,
            username: displayNameFor(profile) || profile?.username || "Someone",
            createdAt: Date.now(),
          } satisfies RoomActivityEvent,
        });
      }
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [active.id, inRoom, user?.id, profile?.username, profile?.avatar_emoji, profile?.avatar_url, profile?.status_text]);

  async function hydrateProfiles(ids: string[]) {
    const need = [...new Set(ids)].filter((id) => !profiles[id]);
    if (need.length === 0) return;
    const { data } = await supabase.from("profiles").select("*").in("id", need);
    if (data) {
      setProfiles((p) => {
        const next = { ...p };
        for (const pr of data as Profile[]) next[pr.id] = pr;
        return next;
      });
    }
  }

  useEffect(() => {
    if (onlineUsers.length) hydrateProfiles(onlineUsers.map((item) => item.user_id));
  }, [onlineUsers.length]);

  useEffect(() => {
    if (!user || inRoom) return;
    const channels = ROOMS.map((room) => {
      const channel = supabase
        .channel(`room:${room.id}`)
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState() as Record<string, { user_id: string }[]>;
          const unique = new Set(Object.values(state).flat().map((item) => item.user_id));
          setRoomCounts((current) => ({ ...current, [room.id]: unique.size }));
        })
        .subscribe();
      return channel;
    });
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, inRoom]);

  useEffect(() => {
    const targetId = profileSheetUser?.id ?? profileSheetUser?.user_id ?? "";
    if (!targetId) {
      setProfileGifts([]);
      return;
    }
    loadProfileGifts(targetId);
  }, [profileSheetUser?.id, profileSheetUser?.user_id]);

  async function loadProfileGifts(targetId: string) {
    const { data, error } = await (supabase as any)
      .from("gift_transactions")
      .select("*")
      .eq("receiver_id", targetId)
      .eq("removed_by_admin", false)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error || !data) {
      setProfileGifts([]);
      return;
    }

    const rows = data as GiftTransaction[];
    const [catalogResult, senderResult] = await Promise.all([
      rows.length
        ? (supabase as any).from("gift_catalog").select("*").in("id", [...new Set(rows.map((item) => item.gift_id))])
        : Promise.resolve({ data: [] }),
      rows.length
        ? (supabase as any).from("profiles").select("*").in("id", [...new Set(rows.map((item) => item.sender_id))])
        : Promise.resolve({ data: [] }),
    ]);

    const catalogMap = new Map(((catalogResult.data ?? []) as GiftCatalogItem[]).map((item) => [item.id, item]));
    const senderMap = new Map(((senderResult.data ?? []) as Profile[]).map((item) => [item.id, item]));
    setProfileGifts(rows.map((item) => ({ ...item, gift: catalogMap.get(item.gift_id), sender: senderMap.get(item.sender_id) })));
  }

  async function featureGift(transactionId: string) {
    const { error } = await setFeaturedGift(transactionId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Featured gift updated");
    if (user?.id) {
      setProfiles((current) => ({
        ...current,
        [user.id]: {
          ...(current[user.id] ?? profile),
          id: user.id,
          featured_gift_transaction_id: transactionId,
        } as Profile,
      }));
    }
  }

  function beginEditProfile() {
    const own = profile ?? profiles[user?.id ?? ""];
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(null);
    setAvatarFile(null);
    setAvatarRemove(false);
    setProfileDraft({
      display_name: own?.display_name ?? own?.username ?? "",
      bio: own?.bio ?? "",
      status_text: own?.status_text ?? "",
      dm_enabled: own?.dm_enabled !== false,
      username_color: own?.username_color ?? hashUserColor(user?.id ?? "me"),
      message_color: own?.message_color ?? CHAT_MESSAGE_COLORS[0],
    });
    setEditingProfile(true);
  }

  function openOwnProfileSettings() {
    if (!user) return;
    const own = profile ?? profiles[user.id];
    setProfileSheetUser({
      ...(own ?? {}),
      id: user.id,
      user_id: user.id,
      username: own?.username ?? profile?.username ?? "you",
      avatar_emoji: own?.avatar_emoji ?? profile?.avatar_emoji ?? "🧑",
      avatar_url: own?.avatar_url ?? profile?.avatar_url ?? null,
    });
    beginEditProfile();
  }

  function pickAvatarFile(file?: File | null) {
    if (!file) return;
    if (isGuestAccount) {
      toast("Register to upload a permanent profile picture.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Upload JPG, PNG, or WEBP only");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile picture must be under 2 MB");
      return;
    }
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(file);
    setAvatarRemove(false);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadAvatarIfNeeded() {
    if (!user) return {};
    if (avatarRemove) {
      const current = (profile ?? profiles[user.id])?.avatar_path;
      if (current) await supabase.storage.from("avatars").remove([current]);
      return { avatar_url: null, avatar_path: null };
    }
    if (!avatarFile) return {};
    const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
    const safeName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(safeName, avatarFile, {
      contentType: avatarFile.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("avatars").getPublicUrl(safeName);
    return { avatar_url: data.publicUrl, avatar_path: safeName };
  }

  async function saveProfileSettings() {
    if (!user) return;
    setProfileSaving(true);
    try {
      const baseUpdates = {
        display_name: cleanProfileText(profileDraft.display_name, 40),
        bio: cleanProfileText(profileDraft.bio, 180),
        status_text: isGuestAccount ? ((profile ?? profiles[user.id])?.status_text ?? "") : cleanProfileText(profileDraft.status_text, 80),
        dm_enabled: isGuestAccount ? false : profileDraft.dm_enabled,
        username_color: isGuestAccount ? ((profile ?? profiles[user.id])?.username_color ?? hashUserColor(user.id)) : (profileDraft.username_color || hashUserColor(user.id)),
        message_color: isGuestAccount ? ((profile ?? profiles[user.id])?.message_color ?? CHAT_MESSAGE_COLORS[0]) : (profileDraft.message_color || CHAT_MESSAGE_COLORS[0]),
      };
      const { error } = await (supabase as any).from("profiles").update(baseUpdates).eq("id", user.id);
      if (error) {
        toast.error(error.message);
        return;
      }

      let avatarUpdates = {};
      if (!isGuestAccount && (avatarFile || avatarRemove)) {
        try {
          avatarUpdates = await uploadAvatarIfNeeded();
          const { error: avatarSaveError } = await (supabase as any).from("profiles").update(avatarUpdates).eq("id", user.id);
          if (avatarSaveError) throw avatarSaveError;
        } catch (avatarError) {
          toast.error(avatarError instanceof Error ? avatarError.message : "Avatar upload failed");
        }
      }

      const next = { ...(profile ?? profiles[user.id]), id: user.id, ...baseUpdates, ...avatarUpdates } as Profile;
      setProfiles((current) => ({ ...current, [user.id]: next }));
      setProfileSheetUser(next);
      setEditingProfile(false);
      setAvatarFile(null);
      setAvatarRemove(false);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
      const awarded = isGuestAccount ? false : await claimProfileCompletionReward();
      if (awarded) toast.success("Profile completed: +100 coins");
      if (isGuestAccount) toast("Guest profile saved. Register to unlock status, colors, DM, and permanent avatar.");
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Avatar upload failed");
    } finally {
      setProfileSaving(false);
    }
  }

  function profileFromMenu(target: { user_id: string; username?: string | null; avatar_emoji?: string | null; avatar_url?: string | null }) {
    return profiles[target.user_id] ?? ({
      id: target.user_id,
      username: target.username ?? "user",
      avatar_emoji: target.avatar_emoji ?? "🧑",
      avatar_url: target.avatar_url ?? null,
      is_guest: false,
      dm_enabled: true,
    } as Profile);
  }

  function openDmWindow(target?: Profile | null) {
    if (!target || !user) return;
    if (isGuestAccount) {
      toast("Register to unlock full private messaging.");
      return;
    }
    if (target.id === user.id) {
      toast.error("You cannot send a DM to yourself");
      return;
    }
    if (blockedUsers.includes(target.id)) {
      toast.error("Unblock this user before sending a DM");
      return;
    }
    if (target.dm_enabled === false) {
      toast("This user is not open for private messages.");
      return;
    }
    setDmPeer(target);
    setDmOpen(true);
    setDmMinimized(false);
    setProfileSheetUser(null);
    setUserMenu(null);
  }

  useEffect(() => {
    const previous = previousMessageCountRef.current;
    if (scrollLocked && msgs.length > previous) {
      setLockedNewMessages((count) => count + msgs.length - previous);
    }
    previousMessageCountRef.current = msgs.length;
  }, [msgs.length, scrollLocked]);

  useEffect(() => {
    if (scrollLocked) return;
    setLockedNewMessages(0);
    scrollToLatest();
  }, [msgs, typingUsers, scrollLocked]);

  useEffect(() => {
    if (!user || !dmPeer || !dmOpen) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${dmPeer.id}),and(sender_id.eq.${dmPeer.id},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!cancelled) setDmMsgs((data ?? []) as DmMessage[]);
    })();

    const channel = supabase
      .channel(`chat-dm:${[user.id, dmPeer.id].sort().join(":")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (payload) => {
        const item = payload.new as DmMessage;
        const inThread =
          (item.sender_id === user.id && item.recipient_id === dmPeer.id) ||
          (item.sender_id === dmPeer.id && item.recipient_id === user.id);
        if (!inThread) return;
        setDmMsgs((current) => (current.some((m) => m.id === item.id) ? current : [...current, item]));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, dmPeer, dmOpen]);

  useEffect(() => {
    dmScrollerRef.current?.scrollTo({ top: dmScrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [dmMsgs, dmMinimized]);

  // Expire stale typing indicators every second
  useEffect(() => {
    const t = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.at < 3500) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Reset typing state when switching rooms
  useEffect(() => {
    setTypingUsers({});
  }, [active.id, inRoom]);

  useEffect(() => {
    if (user && isBirthday(user.user_metadata?.dob)) {
      triggerCinematic("🎂", "birthday-today");
    }
  }, [user]);

  useEffect(() => {
    if (recorder.state !== "recording") return;
    if (recorder.elapsedMs < MAX_VOICE_RECORDING_MS) return;
    recordAutoStopRef.current = true;
    endRec();
  }, [recorder.elapsedMs, recorder.state]);

  function emitTyping() {
    if (!user || !channelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: user.id,
          username: profile?.username ?? "you",
          avatar_emoji: profile?.avatar_emoji ?? "🧑",
          avatar_url: profile?.avatar_url ?? null,
        },
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
    }, 2000);
  }

  async function sendDmMessage() {
    if (!user || !dmPeer || !dmText.trim()) return;
    if (dmPeer.id === user.id) {
      toast.error("You cannot send a DM to yourself");
      return;
    }
    if (blockedUsers.includes(dmPeer.id)) {
      toast.error("Unblock this user before sending a DM");
      return;
    }
    if (dmPeer.dm_enabled === false) {
      toast("This user is not open for private messages.");
      return;
    }
    const body = cleanMessageText(dmText);
    if (!body) return;
    setDmText("");
    const { error } = await supabase.from("dm_messages").insert({
      sender_id: user.id,
      recipient_id: dmPeer.id,
      text: body,
      kind: "text",
    });
    if (error) {
      toast.error(error.message);
      setDmText(body);
    }
  }

  function insertMention(target: Profile) {
    setText((current) => {
      const base = current.replace(/(?:^|\s)@[a-zA-Z0-9_.-]{0,24}$/, (match) => {
        const prefix = match.startsWith(" ") ? " " : "";
        return `${prefix}@${target.username} `;
      });
      return base === current ? `${current}@${target.username} ` : base;
    });
    setMentionOpen(false);
  }

  function mentionedProfileIds(body: string) {
    const names = extractMentionNames(body).slice(0, 5);
    return names
      .map((name) => profilesByUsername.get(name))
      .filter((item): item is Profile => Boolean(item))
      .filter((item) => item.id !== user?.id && !blockedUsers.includes(item.id))
      .map((item) => item.id);
  }

  async function insertRoomMessage(
    textValue: string | null,
    extra: Partial<Pick<DbMessage, "kind" | "audio_url" | "duration_ms" | "reply_to_message_id" | "mentions">> = {},
  ) {
    if (!user || !inRoom) return null;
    const payload = {
      room_id: active.id,
      user_id: user.id,
      text: textValue,
      reply_to_message_id: replyTo?.id ?? null,
      mentions: textValue ? mentionedProfileIds(textValue) : [],
      ...extra,
    };
    chatDebug("send:start", {
      room: active.id,
      userId: user.id,
      kind: payload.kind ?? "text",
      hasText: Boolean(textValue),
    });
    let { data, error } = await (supabase as any)
      .from("messages")
      .insert(payload)
      .select("*")
      .single();
    if (error?.message?.includes("reply_to_message_id") || error?.message?.includes("mentions")) {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as Partial<DbMessage>).reply_to_message_id;
      delete (fallbackPayload as Partial<DbMessage>).mentions;
      const retry = await (supabase as any).from("messages").insert(fallbackPayload).select("*").single();
      data = retry.data;
      error = retry.error;
      if (!retry.error) toast("Reply/mention fields need the latest Supabase SQL to persist.");
    }
    chatDebug("send:db-result", {
      room: active.id,
      id: data?.id ?? null,
      createdAt: data?.created_at ?? null,
      error: error?.message ?? null,
    });
    if (error) {
      toast.error(`Message not saved: ${error.message}`);
      return null;
    }
    if (data) {
      const saved = data as DbMessage;
      setMsgs((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      hydrateProfiles([saved.user_id]);
      return saved;
    }
    return null;
  }

  async function send() {
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    setEmojiOpen(false);
    setMentionOpen(false);
    if (isSpecialEmoji(body)) {
      triggerCinematic(body, `${Date.now()}-${Math.random()}`);
    }
    const keywordEmoji = specialEmojiForText(body);
    if (keywordEmoji) {
      triggerCinematic(keywordEmoji, `${Date.now()}-${Math.random()}`);
    }
    const saved = await insertRoomMessage(body);
    if (!saved) {
      setText(body);
    } else {
      setReplyTo(null);
    }
  }

  function rememberSticker(id: string) {
    setRecentStickerIds((current) => {
      const next = [id, ...current.filter((item) => item !== id)].slice(0, 6);
      localStorage.setItem("vibe-recent-stickers", JSON.stringify(next));
      return next;
    });
  }

  async function sendMediaMessage(token: string, kind: "gif" | "sticker") {
    if (!user) return;
    setEmojiOpen(false);
    setToolsOpen(false);
    setMediaOpen(null);
    if (kind === "sticker") {
      const sticker = stickerFromText(token);
      if (sticker) rememberSticker(sticker.id);
    }
    const saved = await insertRoomMessage(token, { kind });
    if (!saved) {
      toast.error(`${kind === "gif" ? "GIF" : "Sticker"} not sent`);
    } else {
      setReplyTo(null);
    }
  }

  async function sendQuizPrompt() {
    if (!user) return;
    const prompt = QUIZ_PROMPTS[Math.floor(Math.random() * QUIZ_PROMPTS.length)];
    const saved = await insertRoomMessage(prompt);
    if (saved) toast.success("Quiz posted");
  }

  async function postToolMessage(message: string) {
    if (!user) return;
    await insertRoomMessage(message);
  }

  async function sendAdminBotFeedback() {
    if (!user) return;
    const body = adminFeedbackText.trim();
    if (body.length < 5) {
      toast.error("Please type a little more detail");
      return;
    }
    const { error } = await supabase.from("messages").insert({
      room_id: "admin-feedback",
      user_id: user.id,
      text: `[${adminFeedbackType.toUpperCase()}] ${body}\nRoom: ${active.name}`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdminFeedbackText("");
    setAdminBotOpen(false);
    toast.success("Admin Bot received your message");
  }

  function postGame(game: (typeof GAMES)[number], target?: string) {
    const prompt = game.prompts[Math.floor(Math.random() * game.prompts.length)];
    const tag = target ? ` @${target}` : "";
    postToolMessage(`${prompt}${tag}`);
    setGamesOpen(false);
  }

  function runMiniGameAction(action: string, target?: string) {
    const tag = target ? ` @${target}` : "";
    if (activeMiniGame === "mafia") {
      if (action === "role") {
        const role = randomFrom(["Villager", "Mafia", "Doctor", "Detective"]);
        setLocalRole(role);
        sendGameEvent("mafia", "Anonymous roles are assigned. Keep your role secret.", "join");
        return;
      }
      sendGameEvent("mafia", action === "night" ? "Night phase started. Mafia, choose silently." : `Voting opened. Who looks suspicious?${tag}`, "vote", { target });
      return;
    }
    if (activeMiniGame === "truth") {
      sendGameEvent("truth", `${randomFrom(TRUTH_DARES)}${tag}`, "round", { target });
      return;
    }
    if (activeMiniGame === "song") {
      const category = action as keyof typeof SONG_HINTS;
      sendGameEvent("song", `${category} hint: ${randomFrom(SONG_HINTS[category])}. Guess the song in chat.`, "hint");
      return;
    }
    if (activeMiniGame === "story") {
      sendGameEvent("story", `Emoji story battle: ${randomFrom(EMOJI_STORIES)} Vote with heart, laugh, or fire.`, "round");
      return;
    }
    if (activeMiniGame === "voice") {
      sendGameEvent("voice", `${randomFrom(VOICE_CHALLENGES)}${tag}`, "round", { target });
      return;
    }
    if (activeMiniGame === "quiz") {
      sendGameEvent("quiz", `${randomFrom(QUIZ_PROMPTS)}${tag}`, "hint", { target });
    }
  }
  function completeMiniGame() {
    sendGameEvent(activeMiniGame, "Round completed. Play again?", "win");
  }

  function addDrawPoint(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
    };
    setDrawPoints((current) => [...current.slice(-70), point]);
  }

  function broadcastDrawing() {
    if (drawPoints.length < 2) return;
    sendGameEvent("scribble", "New scribble posted. Guess it in chat.", "draw", { points: drawPoints });
  }

  function enterRoom(room: (typeof ROOMS)[number]) {
    setActive(room);
    localStorage.setItem("vibe-selected-room", room.id);
    setInRoom(true);
    setRoomDrawerOpen(false);
    setRoomActivities([]);
    toast.success(`Entering ${room.name}`);
  }

  function exitRoom() {
    const ok = window.confirm(`Exit ${active.name}?`);
    if (!ok) return;
    toast("We will miss your vibing");
    localStorage.removeItem("vibe-selected-room");
    setInRoom(false);
    setRoomDrawerOpen(false);
    setMsgs([]);
    setTypingUsers({});
    setRoomActivities([]);
  }

  async function startRec(clientX = 0) {
    if (recorder.state !== "idle" || uploading) return;
    if (isGuestAccount) {
      const used = Number(localStorage.getItem(guestVoiceCountKey(user.id)) ?? "0");
      if (used >= GUEST_DAILY_VOICE_LIMIT) {
        toast("Guest voice note limit reached. Register for unlimited voice notes.");
        return;
      }
    }
    cancelRecordRef.current = false;
    recordAutoStopRef.current = false;
    recordStartXRef.current = clientX;
    setRecordDragX(0);
    setRecordWillCancel(false);

    try {
      await recorder.start();
    } catch {
      toast.error(
        navigator.mediaDevices?.getUserMedia
          ? "Mic permission denied"
          : "Voice recording is not supported in this browser",
      );
    }
  }

  function updateRecordDrag(clientX: number) {
    if (recorder.state !== "recording") return;
    const delta = Math.min(0, clientX - recordStartXRef.current);
    setRecordDragX(delta);
    const shouldCancel = Math.abs(delta) >= SLIDE_CANCEL_PX;
    setRecordWillCancel(shouldCancel);
    cancelRecordRef.current = shouldCancel;
  }

  async function endRec(options: { cancel?: boolean } = {}) {
    if (recorder.state !== "recording") return;
    const shouldCancel = options.cancel || cancelRecordRef.current;
    if (shouldCancel) {
      cancelRec();
      return;
    }
    const result = await recorder.stop();
    if (!result || !user) return;
    setRecordDragX(0);
    setRecordWillCancel(false);
    if (result.durationMs < 500) {
      toast("Hold to record", { description: "Press and hold the mic." });
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      const ext = result.blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/${Date.now()}.${ext}`;
      setUploadProgress(35);
      const { error: upErr } = await supabase.storage
        .from("voice-notes")
        .upload(path, result.blob, { contentType: result.blob.type, upsert: false });
      if (upErr) throw upErr;
      setUploadProgress(72);
      const { data: pub } = supabase.storage.from("voice-notes").getPublicUrl(path);
      const saved = await insertRoomMessage(null, {
        kind: "voice",
        audio_url: pub.publicUrl,
        duration_ms: result.durationMs,
      });
      if (!saved) throw new Error("Voice message was not saved");
      if (isGuestAccount) {
        const key = guestVoiceCountKey(user.id);
        const used = Number(localStorage.getItem(key) ?? "0");
        localStorage.setItem(key, String(used + 1));
      }
      setReplyTo(null);
      setUploadProgress(100);
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      if (recordAutoStopRef.current) toast.success("Voice note sent at 1:30 limit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      recordAutoStopRef.current = false;
    }
  }

  function cancelRec() {
    cancelRecordRef.current = true;
    setRecordDragX(0);
    setRecordWillCancel(false);
    recordAutoStopRef.current = false;
    recorder.cancel();
    if (navigator.vibrate) navigator.vibrate(12);
  }

  function react(emoji: string, e: React.MouseEvent) {
    if (isSpecialEmoji(emoji)) {
      broadcastReaction(emoji);
      return;
    }
    const id = Date.now() + Math.random();
    setReactions((r) => [...r, { id, emoji, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2500);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
  }

  if (loading || !user) {
    return (
      <div className="relative min-h-screen grid-bg flex items-center justify-center">
        <AmbientOrbs />
        <p className="text-sm text-muted-foreground animate-pulse">Loading vibe...</p>
      </div>
    );
  }

  const birthdayToday = isBirthday(user.user_metadata?.dob);
  const myDisplayName = birthdayToday
    ? `🎂 ${profile?.username ?? "you"} 🎉`
    : profile?.username ?? "you";
  const myAccountType = accountTypeForProfile(profile);
  const isGuestAccount = myAccountType === "guest";
  const myAccountBadge = accountBadge(profile);
  const visibleGifs = GIFS.filter((item) => {
    const q = gifSearch.trim().toLowerCase();
    return item.category === gifCategory && (!q || `${item.label} ${item.category}`.toLowerCase().includes(q));
  });
  const visibleStickers = CHARACTER_STICKERS.filter((item) => {
    const q = stickerSearch.trim().toLowerCase();
    return item.category === stickerCategory && (!q || `${item.label} ${item.text} ${item.category}`.toLowerCase().includes(q));
  });
  const recentStickers = recentStickerIds
    .map((id) => CHARACTER_STICKERS.find((item) => item.id === id))
    .filter((item): item is CharacterSticker => Boolean(item));
  const profilesByUsername = new Map(
    Object.values(profiles)
      .filter((item) => item.username)
      .map((item) => [item.username.toLowerCase(), item] as const),
  );
  const mentionQuery = (() => {
    const match = text.match(/(?:^|\s)@([a-zA-Z0-9_.-]{0,24})$/);
    return match?.[1].toLowerCase() ?? "";
  })();
  const mentionSuggestions = Object.values(profiles)
    .filter((item) => item.id !== user?.id && !blockedUsers.includes(item.id))
    .filter((item) => {
      if (!mentionOpen) return false;
      const name = `${item.username ?? ""} ${item.display_name ?? ""}`.toLowerCase();
      return !mentionQuery || name.includes(mentionQuery);
    })
    .slice(0, 6);

  if (!inRoom) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#050814] px-4 py-5 text-white">
        <AmbientOrbs />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(236,72,153,0.16),transparent_32%)]" />
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Room Selection</p>
              <h1 className="mt-2 text-3xl font-black">Choose your vibe</h1>
            </div>
            <button
              type="button"
              onClick={() => void signOut().then(() => nav({ to: "/" }))}
              className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-slate-200"
            >
              Sign out
            </button>
          </header>

          <section className="mt-8 grid gap-4 md:grid-cols-2">
            {ROOMS.map((room) => (
              <article key={room.id} className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-slate-950/25 backdrop-blur">
                <div className="flex items-start gap-4">
                  <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-3xl">{room.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-black">{room.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-300">{room.label} · Room</p>
                    <p className="mt-3 text-xs font-black text-emerald-300">{roomCounts[room.id] ?? 0} live</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => enterRoom(room)}
                  className="mt-5 h-12 w-full rounded-2xl bg-sky-500 text-sm font-black text-white shadow-lg shadow-sky-500/20"
                >
                  Enter Room
                </button>
              </article>
            ))}
          </section>

          <section className="mt-5 rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-lg font-black">Claim Daily Coins</p>
            <p className="mt-1 text-sm font-bold text-amber-100">Daily login rewards, voice note rewards, streaks, and gifts continue inside rooms.</p>
            <div className="mt-3">
              <GuestExpiryNotice profile={profile} compact />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#080a0f] text-slate-100 lg:pl-[72px] lg:pr-[280px] flex-col">
      <AmbientOrbs />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_82%_14%,rgba(20,184,166,0.13),transparent_30%)]" />

      <div className="pointer-events-none fixed inset-0 z-50">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="absolute animate-float-up text-4xl"
            style={{
              left: r.x - 20,
              top: r.y - 20,
              filter: "drop-shadow(0 0 12px rgba(255,80,180,0.7))",
            }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      <header className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-slate-950/78 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-1.5 lg:max-w-none lg:px-4">
          <div className={`size-2.5 rounded-full ${active.accent}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black tracking-tight lg:text-base">
              {active.emoji} {active.name}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              <span className="font-bold text-emerald-400">{presenceCount} live</span> ·{" "}
              {active.label} · Room
            </p>
          </div>
          <button type="button" onClick={openOwnProfileSettings} className="hidden min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-2 py-1 text-left transition hover:bg-white/10 sm:flex" title="Edit profile">
            <AvatarCircle profile={(profile ?? profiles[user.id]) as Partial<Profile>} className="size-8 text-sm" />
              <span className="min-w-0">
                <span className="block max-w-32 truncate text-xs font-black">{myDisplayName}</span>
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-black ${myAccountBadge.className}`}>
                  {myAccountBadge.icon} {myAccountBadge.label}
                </span>
                {isGuestAccount && (
                  <span className="block max-w-32 truncate text-[9px] font-bold text-amber-200">
                    {guestExpiryText(profile)}
                  </span>
                )}
                <span className="block max-w-32 truncate text-[10px] font-semibold text-slate-400">{profile?.status_text || CURRENT_RADIO_SONG}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={openOwnProfileSettings}
            className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/6 text-slate-100 transition hover:bg-white/10 sm:hidden"
            title="Edit profile"
          >
            <AvatarCircle profile={(profile ?? profiles[user.id]) as Partial<Profile>} className="size-7 text-sm" />
            {!(profile ?? profiles[user.id])?.avatar_url && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-300 px-1 text-[8px] font-black text-slate-950">Set</span>
            )}
          </button>
          <button
            onClick={exitRoom}
            className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/6 text-slate-100 transition hover:bg-white/10"
            title="Exit room"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="hidden lg:fixed lg:left-2 lg:top-24 lg:z-40 lg:flex lg:flex-col lg:items-center lg:gap-2">
        <button
          type="button"
          onClick={() => setRoomDrawerOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/78 text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-white/10"
          title="Room options"
        >
          {roomDrawerOpen ? <ChevronLeft size={18} /> : <ChevronsRight size={18} />}
        </button>
        <span className={`size-3 rounded-full ${active.accent}`} title={active.name} />
        <button
          type="button"
          onClick={() => setBroadcastMode((mode) => mode === "radio" ? null : "radio")}
          className={`grid size-11 place-items-center rounded-2xl border border-white/10 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-white/10 ${
            broadcastMode === "radio" ? "bg-sky-500 text-white" : "bg-slate-950/78 text-slate-100"
          }`}
          title="Radio"
        >
          <Radio size={17} />
        </button>
        <button
          type="button"
          onClick={() => nav({ to: "/podcasts" })}
          className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/78 text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-white/10"
          title="Podcast"
        >
          <Anchor size={17} />
        </button>
        <button
          type="button"
          onClick={() => setVoiceMuted((muted) => !muted)}
          className={`grid size-11 place-items-center rounded-2xl border border-white/10 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-white/10 ${
            voiceMuted ? "bg-rose-500 text-white" : "bg-slate-950/78 text-slate-100"
          }`}
          title={voiceMuted ? "Unmute sound" : "Mute sound"}
        >
          {voiceMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button
          onClick={exitRoom}
          className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/78 text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-white/10"
          title="Exit room"
        >
          <LogOut size={17} />
        </button>
      </div>

      {roomDrawerOpen && (
        <div className="fixed left-2 top-14 z-40 w-56 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur lg:left-[76px] lg:top-24">
          <p className="px-2 py-1 text-xs font-black text-slate-200">Current Room</p>
          <div className="mb-2 rounded-xl bg-sky-500 px-3 py-3 text-xs font-black text-white shadow-lg shadow-sky-500/20">
            {active.emoji} {active.name}
          </div>
          <p className="px-2 text-[11px] font-semibold leading-5 text-slate-400">
            To change rooms, exit this room first. Then choose Friends Vibing or Romance Vibes from room selection.
          </p>
          <button
            type="button"
            onClick={exitRoom}
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 text-xs font-black text-white"
          >
            <LogOut size={14} /> Exit Room
          </button>
        </div>
      )}

      <aside className="fixed right-0 top-0 z-20 hidden h-full w-[280px] border-l border-white/10 bg-slate-950/72 pt-[env(safe-area-inset-top)] backdrop-blur-2xl lg:block">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
            </span>
            <p className="truncate text-sm font-black">Online in {active.name}</p>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-300">{presenceCount}</span>
        </div>
        <div className="h-[calc(100%-3.25rem)] overflow-y-auto px-2 py-2">
          {onlineUsers.length === 0 && (
            <div className="grid place-items-center gap-2 py-12 text-center text-xs text-slate-400">
              <Users size={28} className="opacity-50" />
              <p>No one else online yet</p>
            </div>
          )}
          {onlineUsers
            .filter((member) => !blockedUsers.includes(member.user_id))
            .map((member) => {
              const memberProfile = profiles[member.user_id] ?? member;
              const isMe = member.user_id === user.id;
              return (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => openUserProfile(member.user_id, member)}
                  className={`mb-1 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition ${
                    isMe ? "bg-sky-500/15" : "hover:bg-white/7"
                  }`}
                >
                  <div className="relative shrink-0">
                    <AvatarCircle profile={memberProfile as Partial<Profile>} className="size-9 text-lg" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">
                      {displayNameFor(memberProfile as Profile)} {isMe ? <span className="text-[9px] text-slate-400">(you)</span> : null}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-emerald-300">{member.status_text || (isMe ? profile?.status_text : "") || "online"}</p>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      {profileSheetUser && (() => {
        const targetId = profileSheetUser.id ?? profileSheetUser.user_id ?? "";
        const loadedProfile = profiles[targetId] ?? profileSheetUser;
        const isOwnProfile = targetId === user?.id;
        const isOnline = onlineUsers.some((u) => u.user_id === targetId) || isOwnProfile;
        const usernameColor = loadedProfile.username_color ?? hashUserColor(targetId);
        const messageColor = loadedProfile.message_color ?? CHAT_MESSAGE_COLORS[0];
        return (
          <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/42 px-3 pb-2 backdrop-blur-[2px] sm:pb-3 lg:items-start lg:justify-end lg:bg-transparent lg:px-4 lg:pb-0 lg:pt-16 lg:backdrop-blur-none">
            <div className="profile-sheet-slide pointer-events-auto flex max-h-[60dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.5rem] border border-white/10 bg-slate-950/96 shadow-2xl shadow-slate-950/70 sm:max-h-[60dvh] lg:max-h-[80vh] lg:w-[400px] lg:max-w-[400px] lg:rounded-3xl">
              <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-white/20 lg:hidden" />
              <div className="relative shrink-0 bg-gradient-to-br from-sky-500/25 via-fuchsia-500/15 to-amber-300/15 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setProfileSheetUser(null);
                    setEditingProfile(false);
                  }}
                  className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/10 text-slate-200"
                  title="Close"
                >
                  <X size={15} />
                </button>
                <div className="flex items-center gap-3 pr-10">
                  <AvatarCircle profile={loadedProfile as Profile} className="avatar-glow size-12 text-2xl" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black" style={{ color: usernameColor }}>
                      {displayNameFor(loadedProfile as Profile)}
                    </p>
                    <p className="truncate text-xs font-bold text-slate-300">@{loadedProfile.username ?? "user"}</p>
                    <p className={`mt-1 text-xs font-bold ${isOnline ? "text-emerald-300" : "text-slate-400"}`}>
                      {isOnline ? "online now" : "offline"} · {loadedProfile.dm_enabled === false ? "DM closed" : "Open for DM"}
                    </p>
                  </div>
                </div>
              </div>
              {!editingProfile ? (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 no-scrollbar">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wide text-amber-200">Coins</p>
                      <p className="mt-1 text-lg font-black text-white">{(loadedProfile.coins ?? 0).toLocaleString("en-IN")}</p>
                      <p className="text-[10px] font-bold text-slate-400">{formatCouponValue(loadedProfile.coins ?? 0)} coupon value</p>
                    </div>
                    <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wide text-sky-200">Streak</p>
                      <p className="mt-1 text-lg font-black text-white">🔥 {loadedProfile.daily_streak ?? 0} days</p>
                      <p className="text-[10px] font-bold text-slate-400">Night: {loadedProfile.night_streak ?? 0}</p>
                    </div>
                  </div>
                  {isOwnProfile && <GuestExpiryNotice profile={profile} />}
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-black text-white">
                      {loadedProfile.reward_rank ?? "🌱 Fresh Joiner"}
                    </span>
                    {loadedProfile.rj_tag && (
                      <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1.5 text-[11px] font-black text-pink-100">
                        {loadedProfile.rj_tag}
                      </span>
                    )}
                  </div>
                  <div className="rounded-2xl border border-amber-200/15 bg-amber-300/8 p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-amber-200">
                        <Gift size={13} /> Received gifts
                      </p>
                      {loadedProfile.featured_gift_transaction_id && (
                        <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black text-slate-950">
                          Featured
                        </span>
                      )}
                    </div>
                    {profileGifts.length === 0 ? (
                      <p className="text-xs font-bold text-slate-400">No gifts yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {profileGifts.slice(0, 4).map((item) => {
                          const featured = loadedProfile.featured_gift_transaction_id === item.id;
                          return (
                            <div key={item.id} className={`rounded-xl border px-3 py-2 ${featured ? "border-amber-200/40 bg-amber-300/15" : "border-white/10 bg-slate-950/45"}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{item.gift?.emoji ?? "🎁"}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-black text-white">{item.gift?.name ?? item.gift_id}</p>
                                  <p className="truncate text-[10px] font-bold text-slate-400">
                                    from {displayNameFor(item.sender)} · {new Date(item.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                {isOwnProfile && !featured && (
                                  <button
                                    type="button"
                                    onClick={() => featureGift(item.id)}
                                    className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-amber-100"
                                  >
                                    Feature
                                  </button>
                                )}
                              </div>
                              {item.message && <p className="mt-1 text-[11px] font-semibold text-slate-300">{item.message}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-2.5">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-bold text-slate-100">{loadedProfile.status_text || "Vibing quietly"}</p>
                    <p className="mt-2 text-sm leading-5" style={{ color: messageColor }}>
                      {loadedProfile.bio || "No bio added yet."}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-500">
                      Joined {loadedProfile.created_at ? new Date(loadedProfile.created_at).toLocaleDateString() : "recently"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {!isOwnProfile && (
                      <button type="button" onClick={() => openDmWindow(loadedProfile as Profile)} className="rounded-2xl bg-sky-500 px-3 py-3 text-xs font-black text-white">
                        DM
                      </button>
                    )}
                    <button type="button" onClick={() => pokeUser({ user_id: targetId, username: loadedProfile.username })} className="rounded-2xl bg-amber-300 px-3 py-3 text-xs font-black text-slate-950">
                      Poke
                    </button>
                    {!isOwnProfile && (
                      <>
                        <button type="button" onClick={() => toggleMutedUser(targetId)} className="rounded-2xl bg-white/8 px-3 py-3 text-xs font-black text-slate-100">
                          {mutedUsers.includes(targetId) ? "Unmute" : "Mute"}
                        </button>
                        <button type="button" onClick={() => toggleBlockedUser(targetId)} className="rounded-2xl bg-rose-500/20 px-3 py-3 text-xs font-black text-rose-100">
                          {blockedUsers.includes(targetId) ? "Unblock" : "Block"}
                        </button>
                      </>
                    )}
                    {isOwnProfile && (
                      <button type="button" onClick={beginEditProfile} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-xs font-black text-slate-100">
                        <Palette size={14} /> Edit profile
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 no-scrollbar">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-2.5">
                    {isGuestAccount && (
                      <p className="mb-2 rounded-xl border border-amber-300/15 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-100">
                        Register to unlock permanent photo, mood, DM & colors.
                      </p>
                    )}
                    {isOwnProfile && <GuestExpiryNotice profile={profile} compact />}
                    <div className="mt-2 flex items-center gap-3">
                      <AvatarCircle
                        profile={{
                          ...(profile ?? profiles[user.id]),
                          avatar_url: avatarRemove ? null : avatarPreviewUrl ?? (profile ?? profiles[user.id])?.avatar_url,
                        } as Profile}
                        className="size-12 text-2xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white">Profile picture</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">JPG, PNG, WEBP. Max 2 MB.</p>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          <label className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black text-white ${isGuestAccount ? "cursor-not-allowed bg-white/10 text-slate-500" : "cursor-pointer bg-sky-500"}`}>
                            <Camera size={12} /> Upload
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={isGuestAccount}
                              onChange={(event) => pickAvatarFile(event.target.files?.[0])}
                            />
                          </label>
                          <button
                            type="button"
                            disabled={isGuestAccount}
                            onClick={() => {
                              if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                              setAvatarPreviewUrl(null);
                              setAvatarFile(null);
                              setAvatarRemove(true);
                            }}
                            className="rounded-full bg-white/8 px-2.5 py-1.5 text-[10px] font-black text-slate-200 disabled:cursor-not-allowed disabled:text-slate-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <input value={profileDraft.display_name} onChange={(e) => setProfileDraft((d) => ({ ...d, display_name: e.target.value }))} placeholder="Display name" className="h-10 w-full rounded-xl border border-white/10 bg-white/8 px-3 text-sm text-white outline-none focus:border-sky-400" />
                  <input value={profileDraft.status_text} disabled={isGuestAccount} onChange={(e) => setProfileDraft((d) => ({ ...d, status_text: e.target.value }))} placeholder={isGuestAccount ? "Register to set mood/status" : "Mood / status"} className="h-10 w-full rounded-xl border border-white/10 bg-white/8 px-3 text-sm text-white outline-none focus:border-sky-400 disabled:text-slate-500" />
                  {broadcastMode === "radio" && !isGuestAccount && (
                    <button
                      type="button"
                      onClick={() => setProfileDraft((d) => ({ ...d, status_text: `🎵 Listening to: ${CURRENT_RADIO_SONG}` }))}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-2.5 text-xs font-black text-sky-100"
                    >
                      <Radio size={14} /> Set current radio as status
                    </button>
                  )}
                  <textarea value={profileDraft.bio} onChange={(e) => setProfileDraft((d) => ({ ...d, bio: e.target.value }))} placeholder="Short bio" rows={2} className="min-h-16 w-full resize-none rounded-xl border border-white/10 bg-white/8 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400" />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex min-h-10 items-center justify-between rounded-xl bg-white/8 px-3 text-xs font-bold text-slate-100">
                      Open for DM
                      <input type="checkbox" disabled={isGuestAccount} checked={!isGuestAccount && profileDraft.dm_enabled} onChange={(e) => setProfileDraft((d) => ({ ...d, dm_enabled: e.target.checked }))} className="size-4 accent-sky-400 disabled:opacity-50" />
                    </label>
                    <div className="rounded-xl bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Mood
                      <p className="truncate pt-0.5 text-xs normal-case tracking-normal text-slate-200">{profileDraft.status_text || "Vibing"}</p>
                    </div>
                    <label className="space-y-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Name color
                      <input type="color" disabled={isGuestAccount} value={profileDraft.username_color} onChange={(e) => setProfileDraft((d) => ({ ...d, username_color: e.target.value }))} className="h-9 w-full rounded-xl border border-white/10 bg-white/8 p-1 disabled:opacity-50" />
                    </label>
                    <label className="space-y-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Message color
                      <input type="color" disabled={isGuestAccount} value={profileDraft.message_color} onChange={(e) => setProfileDraft((d) => ({ ...d, message_color: e.target.value }))} className="h-9 w-full rounded-xl border border-white/10 bg-white/8 p-1 disabled:opacity-50" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setEditingProfile(false)} className="rounded-xl bg-white/8 px-3 py-2.5 text-xs font-black text-slate-100">Cancel</button>
                    <button type="button" onClick={saveProfileSettings} disabled={profileSaving} className="rounded-xl bg-sky-500 px-3 py-2.5 text-xs font-black text-white disabled:opacity-60">
                      {profileSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {false && profileSheetUser && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/62 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="game-panel-slide w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-950/96 shadow-2xl shadow-slate-950/70">
            <div className="relative bg-gradient-to-br from-sky-500/25 via-fuchsia-500/15 to-amber-300/15 p-4">
              <button
                type="button"
                onClick={() => setProfileSheetUser(null)}
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/10 text-slate-200"
                title="Close"
              >
                <X size={15} />
              </button>
              <div className="flex items-center gap-3">
                <div className="avatar-glow grid size-16 place-items-center rounded-full bg-white text-3xl text-slate-950">
                  {profileSheetUser.avatar_emoji ?? "🧑"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black">{profileSheetUser.username ?? "user"}</p>
                  <p className="text-xs font-bold text-emerald-300">
                    {onlineUsers.some((u) => u.user_id === profileSheetUser.user_id) ? "online now" : "chat member"}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              <button
                type="button"
                onClick={() => messageUser(profileSheetUser)}
                className="rounded-2xl bg-sky-500 px-3 py-3 text-xs font-black text-white"
              >
                Message
              </button>
              <button
                type="button"
                onClick={() => pokeUser(profileSheetUser)}
                className="rounded-2xl bg-amber-300 px-3 py-3 text-xs font-black text-slate-950"
              >
                Poke
              </button>
              <button
                type="button"
                onClick={() => toggleMutedUser(profileSheetUser.user_id)}
                className="rounded-2xl bg-white/8 px-3 py-3 text-xs font-black text-slate-100"
              >
                {mutedUsers.includes(profileSheetUser.user_id) ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={() => toggleBlockedUser(profileSheetUser.user_id)}
                className="rounded-2xl bg-rose-500/20 px-3 py-3 text-xs font-black text-rose-100"
              >
                {blockedUsers.includes(profileSheetUser.user_id) ? "Unblock" : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {userMenu && (
        <div
          className="fixed z-[80] w-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/96 p-1.5 shadow-2xl shadow-slate-950/60 backdrop-blur-xl"
          style={{ left: userMenu.x, top: userMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => openUserProfile(userMenu.user_id, userMenu)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-black text-slate-100 hover:bg-white/10"
          >
            <UserRound size={14} /> Profile
          </button>
          <button
            type="button"
            onClick={() => openDmWindow(profileFromMenu(userMenu))}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-black text-sky-200 hover:bg-sky-500/15"
          >
            <MessageCircle size={14} /> DM
          </button>
          <button
            type="button"
            onClick={() => {
              toggleBlockedUser(userMenu.user_id);
              setUserMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-black text-rose-200 hover:bg-rose-500/15"
          >
            <Ban size={14} /> {blockedUsers.includes(userMenu.user_id) ? "Unblock" : "Block"}
          </button>
        </div>
      )}

      {dmPeer && dmOpen && dmMinimized && (
        <button
          type="button"
          onClick={() => setDmMinimized(false)}
          className="fixed bottom-20 right-3 z-[75] flex max-w-[220px] items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950 px-3 py-2 text-xs font-black text-sky-100 shadow-2xl shadow-slate-950/50"
        >
          <AvatarCircle profile={dmPeer} className="size-8 text-base" />
          <span className="truncate">DM · {displayNameFor(dmPeer)}</span>
        </button>
      )}

      {dmPeer && dmOpen && !dmMinimized && (
        <div className={`fixed z-[72] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/96 shadow-2xl shadow-slate-950/70 backdrop-blur-xl ${
          dmExpanded
            ? "inset-x-2 bottom-3 top-16 sm:left-auto sm:right-4 sm:w-[440px]"
            : "inset-x-2 bottom-20 h-[410px] sm:left-auto sm:right-4 sm:w-80"
        }`}>
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/6 px-3 py-2.5">
            <AvatarCircle profile={dmPeer} className="size-9 text-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{displayNameFor(dmPeer)}</p>
              <p className="text-[10px] font-bold text-slate-400">Private DM</p>
            </div>
            <button type="button" onClick={() => setDmExpanded((v) => !v)} className="grid size-8 place-items-center rounded-full bg-white/8 text-slate-200" title={dmExpanded ? "Shrink" : "Expand"}>
              <Maximize2 size={14} />
            </button>
            <button type="button" onClick={() => setDmMinimized(true)} className="grid size-8 place-items-center rounded-full bg-white/8 text-slate-200" title="Minimize">
              <Minimize2 size={14} />
            </button>
            <button type="button" onClick={() => setDmOpen(false)} className="grid size-8 place-items-center rounded-full bg-white/8 text-slate-200" title="Close">
              <X size={14} />
            </button>
          </div>
          <div ref={dmScrollerRef} className="h-[calc(100%-104px)] space-y-2 overflow-y-auto px-3 py-3">
            {dmMsgs.length === 0 && (
              <p className="py-10 text-center text-xs font-bold text-slate-500">Private chat starts here.</p>
            )}
            {dmMsgs.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-md bg-sky-500 text-white" : "rounded-bl-md bg-white/8 text-slate-100"}`}>
                    {m.text}
                    <p className="mt-1 text-right text-[9px] opacity-65">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 p-2">
            <input
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendDmMessage()}
              placeholder="Private message..."
              className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-white/8 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
            />
            <button type="button" onClick={sendDmMessage} className="grid size-10 place-items-center rounded-full bg-sky-500 text-white">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {adminBotOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/62 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="game-panel-slide w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-950/96 shadow-2xl shadow-slate-950/70">
            <div className="relative bg-gradient-to-br from-sky-500/25 via-emerald-400/12 to-amber-300/15 p-4">
              <button
                type="button"
                onClick={() => setAdminBotOpen(false)}
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/10 text-slate-200"
                title="Close"
              >
                <X size={15} />
              </button>
              <div className="flex items-center gap-3">
                <div className="avatar-glow grid size-14 place-items-center rounded-2xl bg-sky-400 text-slate-950">
                  <Bot size={28} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black">Admin Bot</p>
                  <p className="text-xs font-bold text-slate-300">Suggestions, complaints, help requests</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-3">
              <div className="grid grid-cols-3 gap-2">
                {(["suggestion", "complaint", "help"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdminFeedbackType(type)}
                    className={`rounded-2xl px-2 py-3 text-xs font-black capitalize ${
                      adminFeedbackType === type
                        ? "bg-sky-500 text-white"
                        : "bg-white/8 text-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <textarea
                value={adminFeedbackText}
                onChange={(e) => setAdminFeedbackText(e.target.value)}
                rows={5}
                placeholder="Tell admin what happened or what you want to improve..."
                className="min-h-32 resize-none rounded-2xl border border-white/10 bg-white/8 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/80"
              />
              <button
                type="button"
                onClick={sendAdminBotFeedback}
                className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20"
              >
                Send to Admin
              </button>
              <p className="px-1 text-[10px] text-slate-400">
                This goes to admin feedback, not the public chat room.
              </p>
            </div>
          </div>
        </div>
      )}

      {gamesOpen && (
        <div
          className="game-panel-slide fixed inset-x-2 bottom-[4.9rem] z-50 mx-auto flex max-h-[40vh] max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/96 shadow-2xl shadow-slate-950/55 backdrop-blur-2xl lg:bottom-5 lg:right-5 lg:left-auto lg:w-[420px] lg:max-h-[45vh]"
          onPointerDown={(e) => {
            gameTrayTouchStartRef.current = e.clientY;
          }}
          onPointerUp={(e) => {
            const startY = gameTrayTouchStartRef.current;
            gameTrayTouchStartRef.current = null;
            if (startY !== null && e.clientY - startY > 42) setGamesOpen(false);
          }}
        >
          <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-black">Mini Games</p>
              <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black">
                <span className="rounded-full bg-white/8 px-2 py-1 text-amber-200">XP {gameXp}</span>
                <span className="rounded-full bg-white/8 px-2 py-1 text-orange-200">{winStreak} streak</span>
                <button type="button" onClick={() => awardGameXp(20)} className="rounded-full bg-emerald-400 px-2 py-1 text-slate-950">Daily</button>
                <button onClick={() => setGamesOpen(false)} className="rounded-full bg-white/8 px-2 py-1 text-slate-300">Close</button>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-2.5 no-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              {MINI_GAMES.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setActiveMiniGame(game.id);
                    setGameModalOpen(true);
                    sendGameEvent(game.id, `${game.label} is ready. Start a round when the room is ready.`, "join");
                  }}
                  className={`rounded-xl border px-2.5 py-2 text-left transition hover:-translate-y-0.5 ${
                    activeMiniGame === game.id
                      ? "border-sky-300/50 bg-sky-500/18 shadow-lg shadow-sky-500/10"
                      : "border-white/10 bg-white/6 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black text-sky-100">{game.emoji}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-black text-white">{game.label}</span>
                      <span className="block truncate text-[9px] font-bold text-slate-400">{game.sub}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameModalOpen && (
        <div className="game-panel-slide fixed inset-x-2 bottom-[5rem] z-[60] mx-auto max-h-[56vh] max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/98 shadow-2xl shadow-slate-950/65 backdrop-blur-2xl lg:inset-x-auto lg:bottom-5 lg:right-[456px] lg:w-[360px]">
          <div className={`bg-gradient-to-br ${MINI_GAMES.find((g) => g.id === activeMiniGame)?.color} p-[1px]`}>
            <div className="rounded-2xl bg-slate-950/90">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
                <p className="truncate text-sm font-black">
                  {MINI_GAMES.find((g) => g.id === activeMiniGame)?.emoji} {MINI_GAMES.find((g) => g.id === activeMiniGame)?.label}
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={completeMiniGame} className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black text-slate-950">Winner</button>
                  <button onClick={() => setGameModalOpen(false)} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-slate-200">Minimize</button>
                </div>
              </div>

              <div className="max-h-[calc(56vh-3rem)] overflow-y-auto p-3 no-scrollbar">
                <button
                  type="button"
                  onClick={() => sendGameEvent(activeMiniGame, `${MINI_GAMES.find((g) => g.id === activeMiniGame)?.label} round started in ${active.name}.`, "round")}
                  className="mb-2 w-full rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white shadow-lg shadow-sky-500/20"
                >
                  Start Round
                </button>

                {activeMiniGame === "mafia" && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => runMiniGameAction("role")} className="rounded-xl bg-white/10 p-2 text-xs font-bold">Roles</button>
                    <button onClick={() => runMiniGameAction("night")} className="rounded-xl bg-white/10 p-2 text-xs font-bold">Night</button>
                    <button onClick={() => runMiniGameAction("vote")} className="game-shake rounded-xl bg-rose-500/25 p-2 text-xs font-bold">Vote</button>
                    {localRole && <p className="col-span-3 rounded-xl bg-violet-500/20 p-2 text-xs font-bold">Your secret role: {localRole}</p>}
                  </div>
                )}

                {activeMiniGame === "truth" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runMiniGameAction("truth")} className="rounded-xl bg-white/10 p-3 text-xs font-bold">Random card</button>
                    <button onClick={() => sendGameEvent("truth", "Task completed", "complete")} className="rounded-xl bg-emerald-400 p-3 text-xs font-black text-slate-950">Complete</button>
                  </div>
                )}

                {activeMiniGame === "song" && (
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(SONG_HINTS).map((category) => (
                      <button key={category} onClick={() => runMiniGameAction(category)} className="rounded-xl bg-white/10 p-3 text-xs font-bold">
                        {category}
                      </button>
                    ))}
                  </div>
                )}

                {activeMiniGame === "scribble" && (
                  <div className="grid gap-2">
                    <div
                      onPointerDown={addDrawPoint}
                      onPointerMove={(e) => e.buttons === 1 && addDrawPoint(e)}
                      className="relative h-32 touch-none overflow-hidden rounded-xl bg-white"
                    >
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polyline points={drawPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0284c7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDrawPoints([])} className="rounded-xl bg-white/10 p-2 text-xs font-bold">Clear</button>
                      <button onClick={broadcastDrawing} className="rounded-xl bg-sky-500 p-2 text-xs font-black">Post drawing</button>
                    </div>
                  </div>
                )}

                {activeMiniGame === "story" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runMiniGameAction("story")} className="rounded-xl bg-white/10 p-3 text-xs font-bold">Story card</button>
                    <button onClick={() => sendGameEvent("story", "Voting opened. Best emoji story wins.", "vote")} className="rounded-xl bg-amber-300 p-3 text-xs font-black text-slate-950">Vote</button>
                  </div>
                )}

                {activeMiniGame === "voice" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runMiniGameAction("voice")} className="rounded-xl bg-white/10 p-3 text-xs font-bold">Prompt</button>
                    <button onClick={() => sendGameEvent("voice", "Voice challenge completed", "complete")} className="rounded-xl bg-emerald-400 p-3 text-xs font-black text-slate-950">Complete</button>
                  </div>
                )}

                {activeMiniGame === "quiz" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runMiniGameAction("quiz")} className="rounded-xl bg-white/10 p-3 text-xs font-bold">Ask quiz</button>
                    <button onClick={() => sendQuizPrompt()} className="rounded-xl bg-amber-300 p-3 text-xs font-black text-slate-950">Post to chat</button>
                  </div>
                )}

                <div className="mt-2 flex gap-1 overflow-x-auto no-scrollbar">
                  {onlineUsers.filter((u) => !blockedUsers.includes(u.user_id)).slice(0, 8).map((u) => (
                    <button
                      key={`${activeMiniGame}-${u.user_id}`}
                      onClick={() => runMiniGameAction("tag", u.username ?? "user")}
                      className="avatar-glow shrink-0 rounded-full bg-sky-500/20 px-2 py-1 text-[10px] font-bold text-sky-100"
                    >
                      @{u.username ?? "user"}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {gameFeed.filter((event) => event.game === activeMiniGame).slice(0, 5).map((event) => (
                    <div key={event.id} className={`rounded-xl border border-white/10 bg-white/7 p-2 text-xs ${event.kind === "win" ? "game-confetti" : ""}`}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-200">{event.avatar} {event.user}</span>
                        <span>{event.kind}</span>
                      </div>
                      <p className="leading-5">{event.text}</p>
                      {event.points && (
                        <div className="relative mt-2 h-20 rounded-lg bg-white">
                          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polyline points={event.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  {gameFeed.filter((event) => event.game === activeMiniGame).length === 0 && (
                    <p className="rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-slate-400">
                      Start a round. Chat stays visible behind the mini-game sheet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden px-1 py-0 lg:max-w-none lg:px-0 lg:py-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/6 shadow-xl shadow-slate-950/20 backdrop-blur lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
          <div className="hidden">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`size-3 rounded-full ${active.accent}`} />
              <div className="min-w-0">
                <h2 className="truncate text-base font-black tracking-tight">{active.name}</h2>
                <p className="truncate text-xs text-slate-400">
                  {presenceCount} online · {active.label}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(ev) => react("❤️", ev)}
                className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/6 text-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/10"
                title="React"
              >
                <Smile size={18} />
              </button>
              <button
                className="hidden min-h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/10 sm:inline-flex"
                title="Online members"
              >
                <Users size={17} />
                {presenceCount}
              </button>
            </div>
          </div>

          <div className="hidden">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
                <span className="mr-1 shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Group
                </span>
                {onlineUsers
                  .filter((u) => !blockedUsers.includes(u.user_id))
                  .slice(0, 8)
                  .map((u) => (
                    <span
                      key={u.user_id}
                      title={u.username ?? "user"}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[10px] font-bold text-slate-200"
                    >
                      <AvatarCircle profile={u as Partial<Profile>} className="size-5 text-[10px]" />
                      <span className="max-w-16 truncate">{u.username ?? "user"}</span>
                    </span>
                  ))}
              </div>
              <button
                type="button"
                onClick={sendQuizPrompt}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950"
                title="Post a quiz in this room"
              >
                <HelpCircle size={14} /> Quiz
              </button>
            </div>
          </div>

          <div ref={scrollerRef} className="min-h-[58vh] flex-1 space-y-1 overflow-y-auto px-2 py-1.5 sm:min-h-[64vh] sm:px-4 lg:min-h-0 lg:px-5 lg:py-3">
            <div className="sticky top-1 z-20 mb-1 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (scrollLocked) unlockScrollAndJump();
                  else setScrollLocked(true);
                }}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black shadow-lg backdrop-blur ${
                  scrollLocked
                    ? "border-amber-300/30 bg-amber-300 text-slate-950"
                    : "border-white/10 bg-slate-950/70 text-slate-100"
                }`}
                title={scrollLocked ? "Unlock and jump to latest" : "Lock scroll to read earlier messages"}
              >
                {scrollLocked ? <Unlock size={13} /> : <Lock size={13} />}
                {scrollLocked ? "Unlock" : "Lock"}
                {scrollLocked && lockedNewMessages > 0 && (
                  <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-[9px] text-amber-200">
                    {lockedNewMessages} new
                  </span>
                )}
              </button>
            </div>
            {scrollLocked && lockedNewMessages > 0 && (
              <button
                type="button"
                onClick={unlockScrollAndJump}
                className="sticky top-10 z-20 mx-auto mb-2 flex min-h-8 items-center gap-1.5 rounded-full bg-sky-500 px-3 text-[11px] font-black text-white shadow-lg shadow-sky-500/20"
              >
                <ArrowDown size={13} /> Jump to latest
              </button>
            )}
            {msgs.filter((m) => !blockedUsers.includes(m.user_id)).length === 0 && (
              <div className="grid place-items-center rounded-[1.25rem] border border-dashed border-white/15 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-sky-500/10 text-sky-400">
                  <MessageCircle />
                </span>
                <h3 className="mt-3 text-lg font-black tracking-tight">No messages yet</h3>
                <p className="mt-1 max-w-md text-xs leading-5 text-slate-400 font-mal">
                  ഈ room-ൽ ആദ്യത്തെ message നിങ്ങൾ അയക്കൂ ✨
                </p>
              </div>
            )}
            {roomActivities.slice(-5).map((event) => (
              <div key={event.id} className="mx-auto my-2 w-fit rounded-full border border-white/10 bg-white/7 px-3 py-1 text-center text-[11px] font-bold text-slate-300">
                {event.type === "enter" ? "✨" : "👋"} {event.username} {event.type === "enter" ? "entered" : "left"} {event.room_name}
              </div>
            ))}
            {msgs.filter((m) => !blockedUsers.includes(m.user_id)).map((m) => {
              const me = m.user_id === user.id;
              const p = profiles[m.user_id];
              const isVoice = m.kind === "voice" && !!m.audio_url;
              const muted = !me && mutedUsers.includes(m.user_id);
              const replySource = m.reply_to_message_id ? msgs.find((item) => item.id === m.reply_to_message_id) : null;
              const replyProfile = replySource ? profiles[replySource.user_id] : null;
              const usernameColor = p?.username_color ?? hashUserColor(m.user_id);
              const senderBadge = accountBadge(p);
              const messageColor = me
                ? (profile?.message_color ?? CHAT_MESSAGE_COLORS[0])
                : (p?.message_color ?? CHAT_MESSAGE_COLORS[0]);
              return (
                <div
                  id={`msg-${m.id}`}
                  key={m.id}
                  className={`group flex gap-2 ${me ? "justify-end" : "justify-start"}`}
                  onClick={() => setActiveMessageActions((current) => current === m.id ? null : m.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setActiveMessageActions(m.id);
                  }}
                >
                  {!me && (
                    <button
                      type="button"
                      onClick={() => openUserProfile(m.user_id, p)}
                      className="mt-0.5 transition hover:scale-105"
                      title="Open profile"
                    >
                      <AvatarCircle profile={p} className="size-7 text-sm" />
                    </button>
                  )}
                  <div
                    className={`relative max-w-[84%] sm:max-w-[68%] ${me ? "items-end" : "items-start"} flex flex-col`}
                  >
                    <div
                      className={`absolute -top-2 z-10 flex gap-1 rounded-full border border-white/10 bg-slate-950/92 p-1 shadow-xl shadow-slate-950/35 backdrop-blur transition ${
                        activeMessageActions === m.id ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                      } ${me ? "right-1" : "left-1"}`}
                    >
                      <button onClick={(e) => { e.stopPropagation(); setReplyTo(m); }} className="grid size-7 place-items-center rounded-full bg-white/8 text-slate-200 hover:bg-white/14" title="Reply">
                        <Reply size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); copyMessage(m); }} className="grid size-7 place-items-center rounded-full bg-white/8 text-slate-200 hover:bg-white/14" title="Copy">
                        <Copy size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); reportMessage(m); }} className="grid size-7 place-items-center rounded-full bg-white/8 text-slate-200 hover:bg-white/14" title="Report">
                        <Flag size={12} />
                      </button>
                      {!me && (
                        <button onClick={(e) => { e.stopPropagation(); toggleBlockedUser(m.user_id); }} className="grid size-7 place-items-center rounded-full bg-rose-500/18 text-rose-100 hover:bg-rose-500/28" title="Block">
                          <Ban size={12} />
                        </button>
                      )}
                    </div>
                    <div
                      onDoubleClick={(e) => !isVoice && react("❤️", e)}
                      className={`rounded-[1.05rem] border px-3 py-1.5 text-xs shadow-sm ${isVoice ? "" : "cursor-pointer"} ${
                        me
                          ? "rounded-br-md border-sky-500/25 bg-sky-500 text-white shadow-sky-500/15"
                          : "rounded-bl-md border-white/10 bg-white/8"
                      }`}
                    >
                      <div
                        className={`mb-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold ${me ? "text-white/75" : "text-slate-400"}`}
                      >
                        <button
                          type="button"
                          onClick={(e) => !me && openUserMenu(e, {
                            user_id: m.user_id,
                            username: p?.username,
                            avatar_emoji: p?.avatar_emoji,
                            avatar_url: p?.avatar_url,
                          })}
                          className={`${me ? "cursor-default" : "hover:text-sky-200"} font-black`}
                          style={{ color: me ? undefined : usernameColor }}
                        >
                          {me ? myDisplayName : displayNameFor(p)}
                        </button>
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black ${senderBadge.className}`}>
                          {senderBadge.icon} {senderBadge.label}
                        </span>
                        {p?.is_anchor && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-300">
                            <Anchor size={8} /> Anchor
                          </span>
                        )}
                        {p?.is_rj && !p?.is_anchor && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-pink-300">
                            <Radio size={8} /> RJ
                          </span>
                        )}
                        {p?.reward_rank && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-400/12 px-1.5 py-0.5 text-[8px] font-bold text-emerald-200">
                            {p.reward_rank.split(" ")[0]}
                          </span>
                        )}
                        {p?.rj_tag && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-fuchsia-400/12 px-1.5 py-0.5 text-[8px] font-bold text-fuchsia-200">
                            {p.rj_tag.split(" ")[0]}
                          </span>
                        )}
                        {(p?.daily_streak ?? 0) >= 3 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-400/15 px-1.5 py-0.5 text-[8px] font-bold text-orange-200">
                            🔥{p?.daily_streak}
                          </span>
                        )}
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!me && false && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleMutedUser(m.user_id)}
                              className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20"
                              title={mutedUsers.includes(m.user_id) ? "Unmute user" : "Mute user"}
                            >
                              <VolumeX size={8} /> {mutedUsers.includes(m.user_id) ? "Unmute" : "Mute"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleBlockedUser(m.user_id)}
                              className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] text-rose-200 hover:bg-rose-500/25"
                              title="Block user"
                            >
                              <Ban size={8} /> Block
                            </button>
                          </>
                        )}
                      </div>
                      {m.reply_to_message_id && (
                        <button
                          type="button"
                          onClick={() => jumpToMessage(m.reply_to_message_id)}
                          className={`mb-1 block w-full rounded-xl border px-2 py-1.5 text-left ${
                            me ? "border-white/20 bg-white/12" : "border-sky-300/20 bg-sky-400/10"
                          }`}
                        >
                          <span className="block truncate text-[10px] font-black text-sky-100">
                            Reply to {replyProfile ? displayNameFor(replyProfile) : "message"}
                          </span>
                          <span className="block truncate text-[10px] font-semibold text-slate-300">
                            {messageSnippet(replySource)}
                          </span>
                        </button>
                      )}
                      {muted ? (
                        <p className="text-[12px] italic leading-5 text-slate-400">Muted message</p>
                      ) : isVoice ? (
                        <VoiceMessage
                          url={m.audio_url!}
                          durationMs={m.duration_ms}
                          mine={me}
                          id={m.id}
                          muted={voiceMuted}
                        />
                      ) : gifFromText(m.text) ? (
                        <GifMessage gif={gifFromText(m.text)!} />
                      ) : stickerFromText(m.text) ? (
                        <AnimatedCharacterSticker text={m.text} />
                      ) : isTaggedLoveMessage(m.text) ? (
                        <p className="vibe-heartbeat-text text-[14px] font-black leading-6" style={{ color: messageColor }}>
                          {m.text}
                        </p>
                      ) : isNightRainPhrase(m.text) && isLateNightIndia() ? (
                        <FloatingDustText text={m.text ?? ""} rain />
                      ) : isMissYouMessage(m.text) ? (
                        <FloatingDustText text={m.text ?? ""} />
                      ) : (
                        <p className="text-[13px] leading-5" style={{ color: me ? undefined : messageColor }}>
                          {renderMentionedText(m.text ?? "", profilesByUsername, (target) => openUserProfile(target.id, target), me ? undefined : messageColor)}
                        </p>
                      )}
                    </div>
                    <div
                      className={`hidden`}
                    >
                      <button
                        onClick={() => setReplyTo(m)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 text-[10px] font-black text-slate-300 shadow-sm transition hover:-translate-y-0.5 hover:text-sky-300"
                        title="Reply"
                      >
                        <Reply size={13} /> Reply
                      </button>
                      <button
                        onClick={() => copyMessage(m)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 text-[10px] font-black text-slate-300 shadow-sm transition hover:-translate-y-0.5"
                        title="Copy"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => reportMessage(m)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 text-[10px] font-black text-slate-300 shadow-sm transition hover:-translate-y-0.5"
                        title="Report"
                      >
                        <Flag size={12} />
                      </button>
                      {!me && (
                        <button
                          onClick={() => toggleBlockedUser(m.user_id)}
                          className="inline-flex min-h-6 items-center gap-1 rounded-full border border-rose-300/20 bg-rose-500/12 px-2 text-[10px] font-black text-rose-100 shadow-sm transition hover:-translate-y-0.5"
                          title="Block"
                        >
                          <Ban size={12} />
                        </button>
                      )}
                      {me && <span className="px-1 text-xs font-bold text-sky-400">Sent</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {Object.entries(typingUsers).filter(([id]) => !blockedUsers.includes(id)).map(([id, t]) => (
              <div key={`typing-${id}`} className="flex gap-2">
                <AvatarCircle profile={{ avatar_emoji: t.avatar_emoji, avatar_url: t.avatar_url } as Profile} className="size-7 text-sm" />
                <div className="flex flex-col items-start">
                  <p className="mb-1 text-[10px] font-semibold text-slate-400">{t.username}</p>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/8 px-3 py-2">
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: "240ms" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative shrink-0 border-t border-white/10 bg-slate-950/35 p-1.5 backdrop-blur">
            {emojiOpen && (
              <div className="absolute bottom-[4.25rem] left-2 right-2 z-20 grid max-h-44 grid-cols-6 gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-xl shadow-slate-950/40 no-scrollbar sm:grid-cols-10">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={(ev) => {
                      setText((current) => `${current}${e}`);
                      react(e, ev);
                    }}
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/8 text-lg shadow-sm transition hover:-translate-y-0.5 hover:bg-white/12"
                    title={`Add ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
            {mediaOpen && (
              <div className="absolute bottom-[4.25rem] left-2 right-2 z-20 max-h-[60vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/96 pb-2 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:left-2 sm:right-2 sm:max-h-[70vh] lg:right-auto lg:w-[560px]">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaOpen(null);
                        setToolsOpen(true);
                      }}
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-white/8 text-slate-200 hover:bg-white/12"
                      title="Back to tools"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="min-w-0">
                    <p className="text-xs font-black text-white">{mediaOpen === "gif" ? "GIFs" : "Stickers"}</p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {mediaOpen === "gif" ? "Animated reactions for the room" : "KC-style sticker pack"}
                    </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaOpen(null)}
                    className="grid size-8 place-items-center rounded-full bg-white/8 text-slate-200 hover:bg-white/12"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
                {mediaOpen === "gif" ? (
                  <div className="max-h-[calc(60vh-4.5rem)] overflow-y-auto p-3 pb-5 no-scrollbar sm:max-h-[calc(70vh-4.5rem)]">
                    <input
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                      placeholder="Search GIFs"
                      className="mb-2 h-9 w-full rounded-2xl border border-white/10 bg-white/8 px-3 text-xs font-semibold text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
                    />
                    <div className="mb-3 flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                      {GIF_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setGifCategory(category)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black transition ${
                            gifCategory === category ? "bg-sky-500 text-white" : "bg-white/8 text-slate-300 hover:bg-white/12"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {visibleGifs.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => sendMediaMessage(item.token, "gif")}
                          className="group overflow-hidden rounded-2xl border border-white/10 bg-white/6 p-1 text-left transition hover:-translate-y-0.5 hover:border-sky-300/50 hover:bg-white/10"
                        >
                          <img src={item.url} alt={`${item.label} GIF`} loading="lazy" className="aspect-video w-full rounded-xl object-cover" />
                          <span className="block truncate px-1 py-1 text-[10px] font-black text-slate-100">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[calc(60vh-4.5rem)] overflow-y-auto p-3 pb-5 no-scrollbar sm:max-h-[calc(70vh-4.5rem)]">
                    <input
                      value={stickerSearch}
                      onChange={(e) => setStickerSearch(e.target.value)}
                      placeholder="Search stickers"
                      className="mb-2 h-9 w-full rounded-2xl border border-white/10 bg-white/8 px-3 text-xs font-semibold text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
                    />
                    {recentStickers.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Recent</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {recentStickers.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => sendMediaMessage(item.token, "sticker")}
                              className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/8 transition hover:-translate-y-0.5 hover:bg-white/12"
                              title={item.label}
                            >
                              <span className={`vibe-character-sticker vibe-character-${item.mood} scale-[0.62]`}>
                                <StickerFace sticker={item} />
                                <span className="vibe-character-label">{item.text}</span>
                                <span className="vibe-character-sparkles" aria-hidden="true" />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mb-3 flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                      {STICKER_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setStickerCategory(category)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black transition ${
                            stickerCategory === category ? "bg-fuchsia-500 text-white" : "bg-white/8 text-slate-300 hover:bg-white/12"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {visibleStickers.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => sendMediaMessage(item.token, "sticker")}
                          className="group grid min-h-24 place-items-center rounded-2xl border border-white/10 bg-white/6 p-1.5 transition hover:-translate-y-1 hover:border-fuchsia-300/50 hover:bg-white/10"
                          title={item.label}
                        >
                          <span className={`vibe-character-sticker vibe-character-${item.mood} scale-75 transition group-hover:scale-[0.82]`}>
                            <StickerFace sticker={item} />
                            <span className="vibe-character-label">{item.text}</span>
                            <span className="vibe-character-sparkles" aria-hidden="true" />
                          </span>
                          <span className="-mt-2 block max-w-full truncate text-[10px] font-black text-slate-100">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {toolsOpen && (
              <div className="absolute bottom-[4.25rem] left-2 right-2 z-20 max-h-[60vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/96 p-3 pb-5 shadow-2xl shadow-slate-950/50 backdrop-blur-xl no-scrollbar sm:left-2 sm:right-auto sm:max-h-[70vh] sm:w-80">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-white">Tools</p>
                    <p className="text-[10px] font-semibold text-slate-400">More room features, away from typing</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToolsOpen(false)}
                    className="grid size-8 place-items-center rounded-full bg-white/8 text-slate-200 hover:bg-white/12"
                    title="Close tools"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setMediaOpen((open) => open === "gif" ? null : "gif");
                    setToolsOpen(false);
                  }}
                  className="grid min-h-14 place-items-center rounded-2xl bg-white/8 text-xs font-black text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/12"
                >
                  <Clapperboard size={18} /> GIF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaOpen((open) => open === "sticker" ? null : "sticker");
                    setToolsOpen(false);
                  }}
                  className="grid min-h-14 place-items-center rounded-2xl bg-white/8 text-xs font-black text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/12"
                >
                  <Sticker size={18} /> Sticker
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGamesOpen((open) => !open);
                    setToolsOpen(false);
                  }}
                  className={`grid min-h-14 place-items-center rounded-2xl text-xs font-black transition hover:-translate-y-0.5 ${
                    gamesOpen ? "bg-sky-500 text-white" : "bg-white/8 text-slate-100"
                  }`}
                >
                  <Gamepad2 size={18} /> Games
                </button>
                <button
                  type="button"
                  onClick={() => {
                    nav({ to: "/gifts" });
                    setToolsOpen(false);
                  }}
                  className="grid min-h-14 place-items-center rounded-2xl bg-white/8 text-xs font-black text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/12"
                >
                  <Gift size={18} /> Gifts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminBotOpen(true);
                    setToolsOpen(false);
                  }}
                  className="grid min-h-14 place-items-center rounded-2xl bg-emerald-400 text-xs font-black text-slate-950 transition hover:-translate-y-0.5"
                >
                  <Bot size={18} /> Support
                </button>
                </div>
              </div>
            )}
            {mentionOpen && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-[4.25rem] left-2 right-2 z-30 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/96 p-2 shadow-2xl shadow-slate-950/50 no-scrollbar sm:right-auto sm:w-80">
                {mentionSuggestions.map((item) => {
                  const online = onlineUsers.some((u) => u.user_id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => insertMention(item)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/8"
                    >
                      <AvatarCircle profile={item} className="size-9 text-base" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-white">{displayNameFor(item)}</span>
                        <span className="block truncate text-[10px] font-semibold text-slate-400">@{item.username}</span>
                      </span>
                      <span className={`size-2 rounded-full ${online ? "bg-emerald-400" : "bg-slate-600"}`} />
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmojiOpen((open) => !open);
                  setToolsOpen(false);
                  setMediaOpen(null);
                }}
                className={`grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm transition hover:-translate-y-0.5 ${
                  emojiOpen ? "bg-sky-500 text-white" : "bg-white/6 text-slate-100 hover:bg-white/10"
                }`}
                title="Emoji"
              >
                <Smile size={18} />
              </button>
              <button
                type="button"
                onClick={() => nav({ to: "/confessions" })}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/6 text-fuchsia-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/10"
                title="Secrets"
              >
                <VenetianMask size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setToolsOpen((open) => !open);
                  setEmojiOpen(false);
                  setMediaOpen(null);
                }}
                className={`grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm transition hover:-translate-y-0.5 ${
                  toolsOpen ? "bg-sky-500 text-white" : "bg-white/6 text-slate-100 hover:bg-white/10"
                }`}
                title="More tools"
              >
                <span className="text-xl font-black leading-none">+</span>
              </button>
              {recorder.state === "recording" ? (
                <div className="min-h-10 min-w-0 flex-1 overflow-hidden rounded-xl border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 shadow-lg shadow-rose-500/10">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/35">
                      <Mic size={14} className="animate-pulse" />
                    </span>
                    <span className="w-11 shrink-0 text-xs font-black tabular-nums text-rose-100">
                      {formatVoiceTime(Math.min(recorder.elapsedMs, MAX_VOICE_RECORDING_MS))}
                    </span>
                    <div className="flex h-7 min-w-0 flex-1 items-center gap-[3px] overflow-hidden px-1">
                      {Array.from({ length: 22 }).map((_, i) => {
                        const phase = (Math.sin(Date.now() / 150 + i * 0.65) + 1) / 2;
                        const h = Math.max(0.18, recorder.level * (0.45 + phase * 0.7));
                        return <span key={i} className="w-[3px] shrink-0 rounded-full bg-sky-300" style={{ height: `${h * 26}px` }} />;
                      })}
                    </div>
                    <span
                      className={`hidden min-w-[92px] shrink-0 text-[10px] font-black transition sm:inline ${recordWillCancel ? "text-rose-200" : "text-slate-300"}`}
                      style={{ transform: `translateX(${Math.max(recordDragX, -50)}px)` }}
                    >
                      {recordWillCancel ? "Release to cancel" : "‹ slide to cancel"}
                    </span>
                    <button type="button" onClick={cancelRec} className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-500/20 text-rose-200" title="Delete recording">
                      <Trash2 size={15} />
                    </button>
                    <button type="button" onClick={() => endRec()} className="grid size-8 shrink-0 place-items-center rounded-xl bg-sky-500 text-white" title="Stop and send">
                      <Square size={12} fill="currentColor" />
                    </button>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${Math.min(100, (recorder.elapsedMs / MAX_VOICE_RECORDING_MS) * 100)}%` }} />
                  </div>
                </div>
              ) : (
              <div className="min-w-0 flex-1">
                {replyTo && (
                  <div className="mb-1 flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-2 py-1.5">
                    <Reply size={13} className="shrink-0 text-sky-200" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-black text-sky-100">
                        Replying to {displayNameFor(profiles[replyTo.user_id])}
                      </p>
                      <p className="truncate text-[10px] font-semibold text-slate-400">{messageSnippet(replyTo)}</p>
                    </div>
                    <button type="button" onClick={() => setReplyTo(null)} className="grid size-6 place-items-center rounded-full bg-white/8 text-slate-200">
                      <X size={12} />
                    </button>
                  </div>
                )}
              <input
                value={text}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setText(nextValue);
                  setMentionOpen(/(?:^|\s)@[a-zA-Z0-9_.-]{0,24}$/.test(nextValue));
                  emitTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setMentionOpen(false);
                  if (e.key === "Enter") send();
                }}
                placeholder={recorder.state === "recording" ? "Recording..." : "Message the room"}
                disabled={uploading}
                className="min-h-10 w-full rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-slate-500 focus:border-sky-400/80 focus:bg-white/10 disabled:opacity-50"
              />
              </div>
              )}
              {text ? (
                <button
                  onClick={send}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400"
                  title="Send"
                >
                  <Send size={18} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              ) : (
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    startRec(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    e.preventDefault();
                    updateRecordDrag(e.clientX);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    endRec();
                  }}
                  onPointerCancel={() => cancelRec()}
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={uploading}
                  className={`grid size-10 shrink-0 touch-none select-none place-items-center rounded-xl text-white shadow-lg transition ${
                    recorder.state === "recording"
                      ? "scale-110 bg-rose-500 shadow-rose-500/20"
                      : uploading
                        ? "bg-slate-600 opacity-60"
                        : "bg-sky-500 shadow-sky-500/20 hover:-translate-y-0.5 hover:bg-sky-400"
                  }`}
                  aria-label="Hold to record voice note"
                >
                  <Mic size={18} />
                </button>
              )}
            </div>
            {!text && recorder.state === "idle" && !uploading && (
              <p className="hidden">
                Hold mic to record · Earn <span className="font-bold text-amber-300">2x coins</span>{" "}
                on voice notes
              </p>
            )}
          </div>
        </div>
      </section>

      {false && recorder.state === "recording" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-end bg-slate-950/70 pb-44 backdrop-blur-sm animate-fade-in lg:pb-32">
          <div className="flex w-[88%] max-w-sm flex-col items-center gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/82 px-6 py-5 shadow-xl shadow-slate-950/30">
            <div className="flex items-center gap-3">
              <span className="size-2.5 animate-pulse rounded-full bg-rose-500" />
              <span className="text-sm font-semibold tabular-nums">
                {Math.floor(recorder.elapsedMs / 60000)}:
                {String(Math.floor((recorder.elapsedMs / 1000) % 60)).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-slate-400">Recording...</span>
            </div>
            <div className="flex h-12 items-end gap-1">
              {Array.from({ length: 28 }).map((_, i) => {
                const phase = (Math.sin(Date.now() / 120 + i * 0.6) + 1) / 2;
                const h = Math.max(0.15, recorder.level * (0.4 + phase * 0.6));
                return (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-sky-400"
                    style={{ height: `${h * 100}%` }}
                  />
                );
              })}
            </div>
            <p className="text-center text-[11px] text-slate-400">
              Release to send · tap trash to cancel
            </p>
            <button
              onClick={cancelRec}
              className="grid size-10 place-items-center rounded-2xl bg-rose-500/20 text-rose-300"
              aria-label="Cancel"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      <CinematicReactions triggers={cinematic} />
    </div>
  );
}





