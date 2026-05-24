import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { CinematicReactions, isSpecialEmoji } from "@/components/CinematicReactions";
import { OnlineMembersPanel } from "@/components/OnlineMembersPanel";
import { VoiceMessage } from "@/components/VoiceMessage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  Mic,
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
  HelpCircle,
  Sticker,
  Volume2,
  VolumeX,
  Trophy,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat Rooms — Vibe Malayali" }] }),
  component: Chat,
});

const ROOMS = [
  {
    id: "friends",
    emoji: "🎉",
    name: "Friends Vibing",
    label: "Malayalam + English",
    accent: "bg-sky-400",
  },
  {
    id: "romance",
    emoji: "💞",
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

type MiniGameId = "mafia" | "truth" | "ludo" | "song" | "scribble" | "story" | "spy";

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
  { id: "mafia", label: "Mafia", emoji: "🕵️", sub: "Roles, night/day, votes", color: "from-violet-500 to-slate-700" },
  { id: "truth", label: "Truth or Dare", emoji: "🎯", sub: "Funny clean challenges", color: "from-rose-500 to-orange-400" },
  { id: "ludo", label: "Ludo Teams", emoji: "🎲", sub: "2v2 emoji teams", color: "from-sky-500 to-cyan-400" },
  { id: "song", label: "Guess Song", emoji: "🎵", sub: "Malayalam, Tamil, Hindi", color: "from-emerald-500 to-teal-400" },
  { id: "scribble", label: "Scribble Draw", emoji: "✍️", sub: "Draw, others guess", color: "from-fuchsia-500 to-pink-500" },
  { id: "story", label: "Emoji Story", emoji: "😂", sub: "Emoji-only battle", color: "from-amber-400 to-lime-400" },
  { id: "spy", label: "Spy Game", emoji: "🕶️", sub: "Find the spy", color: "from-indigo-500 to-blue-500" },
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
const SPY_TOPICS = ["Kerala foods", "School life", "Movie theatre", "Rainy night", "Family wedding"];

function storedNumber(key: string, fallback = 0) {
  if (typeof window === "undefined") return fallback;
  return Number(localStorage.getItem(key) ?? fallback);
}

function storedText(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

const GIFS = ["✨", "💃", "🎬", "🔥", "💘", "😂"];
const STICKERS = ["Super vibe", "Challenge me", "Onam mood", "Mass entry", "Cute aanu", "Scene set"];
const CHARACTER_STICKERS = [
  { id: "shy-buddy", label: "Shy Buddy", face: "🐻", token: "[[sticker:shy-buddy]]", mood: "blush" },
  { id: "sleepy-cloud", label: "Sleepy Cloud", face: "☁️", token: "[[sticker:sleepy-cloud]]", mood: "float" },
  { id: "tiny-heart", label: "Tiny Heart", face: "🐰", token: "[[sticker:tiny-heart]]", mood: "heart" },
  { id: "dance-pal", label: "Dance Pal", face: "🧸", token: "[[sticker:dance-pal]]", mood: "dance" },
  { id: "wave-cutie", label: "Wave Cutie", face: "🐥", token: "[[sticker:wave-cutie]]", mood: "wave" },
  { id: "sad-moon", label: "Sad Moon", face: "🌙", token: "[[sticker:sad-moon]]", mood: "drift" },
];
const GAMES = [
  {
    id: "ludo",
    label: "Ludo Call",
    sub: "Invite players",
    prompts: [
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

function AnimatedCharacterSticker({ text }: { text?: string | null }) {
  const sticker = stickerFromText(text);
  if (!sticker) return null;
  return (
    <div className={`vibe-character-sticker vibe-character-${sticker.mood}`} title={sticker.label}>
      <span className="vibe-character-face">{sticker.face}</span>
      <span className="vibe-character-sparkles" aria-hidden="true" />
    </div>
  );
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
  created_at: string;
};

function Chat() {
  const nav = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [active, setActive] = useState(ROOMS[0]);
  const [msgs, setMsgs] = useState<DbMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number; y: number }[]>(
    [],
  );
  const [presenceCount, setPresenceCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState<
    { user_id: string; username?: string; avatar_emoji?: string }[]
  >([]);
  const [typingUsers, setTypingUsers] = useState<
    Record<string, { username: string; avatar_emoji: string; at: number }>
  >({});
  const [cinematic, setCinematic] = useState<{ id: string; emoji: string }[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [roomDrawerOpen, setRoomDrawerOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState<"gif" | "sticker" | null>(null);
  const [gamesOpen, setGamesOpen] = useState(false);
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
  const [profileSheetUser, setProfileSheetUser] = useState<{
    user_id: string;
    username?: string;
    avatar_emoji?: string;
  } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const recorder = useVoiceRecorder();
  const cancelRecordRef = useRef(false);
  const [uploading, setUploading] = useState(false);

  function triggerCinematic(emoji: string, id?: string) {
    setCinematic((c) => [...c.slice(-4), { id: id ?? `${Date.now()}-${Math.random()}`, emoji }]);
  }

  function broadcastReaction(emoji: string) {
    const id = `${Date.now()}-${Math.random()}`;
    triggerCinematic(emoji, id);
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { emoji, id } });
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

  function toggleMutedUser(id: string) {
    setMutedUsers((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      localStorage.setItem("vibe-muted-users", JSON.stringify(next));
      toast(next.includes(id) ? "User muted" : "User unmuted");
      return next;
    });
  }

  function toggleBlockedUser(id: string) {
    setBlockedUsers((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      localStorage.setItem("vibe-blocked-users", JSON.stringify(next));
      toast(next.includes(id) ? "User blocked" : "User unblocked");
      return next;
    });
  }

  function openUserProfile(
    userId: string,
    info?: { username?: string | null; avatar_emoji?: string | null },
  ) {
    setProfileSheetUser({
      user_id: userId,
      username: info?.username ?? profiles[userId]?.username ?? "user",
      avatar_emoji: info?.avatar_emoji ?? profiles[userId]?.avatar_emoji ?? "🧑",
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
    setProfileSheetUser(null);
    nav({ to: "/dm/$userId", params: { userId: target.user_id } });
  }

  // redirect if not signed in
  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  // Load history + subscribe to realtime
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", active.id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (cancelled) return;
      setMsgs(data ?? []);
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
          setMsgs((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          hydrateProfiles([m.user_id]);
          const keywordEmoji = m.text ? specialEmojiForText(m.text) : null;
          if (m.text && m.user_id !== user?.id && !blockedUsers.includes(m.user_id)) {
            if (keywordEmoji) triggerCinematic(keywordEmoji, `${m.id}-keyword`);
            if (isSpecialEmoji(m.text)) triggerCinematic(m.text.trim(), m.id);
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
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.user_id || payload.user_id === user?.id) return;
        setTypingUsers((prev) => ({
          ...prev,
          [payload.user_id]: {
            username: payload.username ?? "someone",
            avatar_emoji: payload.avatar_emoji ?? "🧑",
            at: Date.now(),
          },
        }));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          { user_id: string; username?: string; avatar_emoji?: string }[]
        >;
        const flat = Object.values(state).flat();
        const unique = Array.from(new Map(flat.map((p) => [p.user_id, p])).values());
        setOnlineUsers(unique);
        setPresenceCount(unique.length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user) {
          await channel.track({
            user_id: user.id,
            username: profile?.username ?? "you",
            avatar_emoji: profile?.avatar_emoji ?? "🧑",
            online_at: new Date().toISOString(),
          });
        }
      });
    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [active.id, user, blockedUsers]);

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
    scrollerRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [msgs, typingUsers]);

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
  }, [active.id]);

  useEffect(() => {
    if (user && isBirthday(user.user_metadata?.dob)) {
      triggerCinematic("🎂", "birthday-today");
    }
  }, [user]);

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
        },
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
    }, 2000);
  }

  async function send() {
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    setEmojiOpen(false);
    if (isSpecialEmoji(body)) {
      triggerCinematic(body, `${Date.now()}-${Math.random()}`);
    }
    const keywordEmoji = specialEmojiForText(body);
    if (keywordEmoji) {
      triggerCinematic(keywordEmoji, `${Date.now()}-${Math.random()}`);
    }
    const { error } = await supabase.from("messages").insert({
      room_id: active.id,
      user_id: user.id,
      text: body,
    });
    if (error) {
      toast.error(error.message);
      setText(body);
    }
  }

  async function sendQuizPrompt() {
    if (!user) return;
    const prompt = QUIZ_PROMPTS[Math.floor(Math.random() * QUIZ_PROMPTS.length)];
    const { error } = await supabase.from("messages").insert({
      room_id: active.id,
      user_id: user.id,
      text: prompt,
    });
    if (error) toast.error(error.message);
    else toast.success("Quiz posted");
  }

  async function postToolMessage(message: string) {
    if (!user) return;
    const { error } = await supabase.from("messages").insert({
      room_id: active.id,
      user_id: user.id,
      text: message,
    });
    if (error) toast.error(error.message);
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
    if (activeMiniGame === "ludo") {
      const roll = Math.ceil(Math.random() * 6);
      sendGameEvent("ludo", `${randomFrom(["Blue team 🔵", "Purple team 🟣"])} rolled ${roll}. Spectators can react.`, roll === 6 ? "win" : "round");
      return;
    }
    if (activeMiniGame === "song") {
      const category = action as keyof typeof SONG_HINTS;
      sendGameEvent("song", `${category} hint: ${randomFrom(SONG_HINTS[category])}. Guess the song in chat.`, "hint");
      return;
    }
    if (activeMiniGame === "story") {
      sendGameEvent("story", `Emoji story battle: ${randomFrom(EMOJI_STORIES)} Vote with ❤️ 😂 🔥`, "round");
      return;
    }
    if (activeMiniGame === "spy") {
      sendGameEvent("spy", `Topic shared: ${randomFrom(SPY_TOPICS)}. One player is the spy. Ask questions, then vote.${tag}`, "vote", { target });
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

  function exitChat() {
    toast("We will miss your vibing");
    setTimeout(async () => {
      await signOut();
      window.location.href = "/?vibes=1";
    }, 700);
  }

  async function startRec() {
    if (recorder.state !== "idle" || uploading) return;
    cancelRecordRef.current = false;

    try {
      await recorder.start();
    } catch {
      toast.error("Mic permission denied");
    }
  }

  async function endRec() {
    if (recorder.state !== "recording") return;
    const result = await recorder.stop();
    if (!result || !user) return;
    if (cancelRecordRef.current) return;
    if (result.durationMs < 500) {
      toast("Hold to record", { description: "Press and hold the mic." });
      return;
    }

    setUploading(true);
    try {
      const ext = result.blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("voice-notes")
        .upload(path, result.blob, { contentType: result.blob.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("voice-notes").getPublicUrl(path);
      const { error: insErr } = await supabase.from("messages").insert({
        room_id: active.id,
        user_id: user.id,
        kind: "voice",
        audio_url: pub.publicUrl,
        duration_ms: result.durationMs,
        text: null,
      });
      if (insErr) throw insErr;
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice upload failed");
    } finally {
      setUploading(false);
    }
  }

  function cancelRec() {
    cancelRecordRef.current = true;

    recorder.cancel();
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
        <p className="text-sm text-muted-foreground animate-pulse">Loading vibe…</p>
      </div>
    );
  }

  const birthdayToday = isBirthday(user.user_metadata?.dob);
  const myDisplayName = birthdayToday
    ? `🎂 ${profile?.username ?? "you"} 🎉`
    : profile?.username ?? "you";

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

      <header className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-slate-950/72 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-md lg:max-w-none items-center gap-2 px-3 py-1.5 lg:px-4">
          <button
            type="button"
            onClick={() => setRoomDrawerOpen((open) => !open)}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/6 text-slate-100 transition hover:bg-white/10"
            title="Rooms"
          >
            {roomDrawerOpen ? <ChevronLeft size={17} /> : <ChevronsRight size={17} />}
          </button>
          <div className={`size-2.5 rounded-full ${active.accent}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black tracking-tight lg:text-base">
              {active.emoji} {active.name}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              <span className="font-bold text-emerald-400">{presenceCount} live</span> ·{" "}
              {active.label} · {myDisplayName}
            </p>
          </div>
          <div className="hidden">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => setActive(r)}
                className={`min-h-10 rounded-2xl border px-3 text-xs font-black transition hover:-translate-y-0.5 ${
                  active.id === r.id
                    ? "border-sky-400/40 bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                    : "border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
                }`}
              >
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
          <button
            onClick={exitChat}
            className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/6 text-slate-100 transition hover:bg-white/10"
            title="Exit"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="hidden">
          <div className="flex gap-2">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => setActive(r)}
                className={`min-h-9 shrink-0 rounded-2xl border px-3 text-xs font-black transition ${
                  active.id === r.id
                    ? "border-sky-400/40 bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                    : "border-white/10 bg-white/6 text-slate-300"
                }`}
              >
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="hidden lg:fixed lg:left-2 lg:top-24 lg:z-40 lg:flex lg:flex-col lg:items-center lg:gap-2">
        <button
          type="button"
          onClick={() => setRoomDrawerOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/78 text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-white/10"
          title="Rooms"
        >
          {roomDrawerOpen ? <ChevronLeft size={18} /> : <ChevronsRight size={18} />}
        </button>
        <span className={`size-3 rounded-full ${active.accent}`} title={active.name} />
        <button
          onClick={exitChat}
          className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/78 text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-white/10"
          title="Exit"
        >
          <LogOut size={17} />
        </button>
      </div>

      {roomDrawerOpen && (
        <div className="fixed left-2 top-14 z-40 w-56 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur lg:left-[76px] lg:top-24">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setActive(r);
                setRoomDrawerOpen(false);
              }}
              className={`mb-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-black transition ${
                active.id === r.id
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                  : "bg-white/6 text-slate-300 hover:bg-white/10"
              }`}
            >
              <span>{r.emoji}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      {profileSheetUser && (
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

      {gamesOpen && (
        <div className="game-panel-slide fixed inset-x-2 bottom-[4.7rem] z-50 mx-auto max-h-[54vh] max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/96 shadow-2xl shadow-slate-950/60 backdrop-blur-2xl lg:inset-x-auto lg:bottom-4 lg:right-3 lg:top-[4.4rem] lg:w-[264px] lg:max-w-none lg:max-h-none">
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">Game Drawer</p>
                <p className="truncate text-[10px] text-slate-400">Opens over online list, chat stays clear</p>
              </div>
              <button onClick={() => setGamesOpen(false)} className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-slate-300">Close</button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] font-black">
              <div className="rounded-xl bg-white/8 p-2"><Trophy className="mx-auto mb-1 size-4 text-amber-300" />{gameXp} XP</div>
              <div className="rounded-xl bg-white/8 p-2">🔥<span className="block">{winStreak} streak</span></div>
              <button
                type="button"
                onClick={() => {
                  const next = squadName === "Vibe Squad" ? "Prime Squad" : "Vibe Squad";
                  setSquadName(next);
                  localStorage.setItem("vibe-squad", next);
                }}
                className="rounded-xl bg-white/8 p-2"
              >
                🛡️<span className="block truncate">{squadName}</span>
              </button>
              <button type="button" onClick={() => awardGameXp(20)} className="rounded-xl bg-emerald-400 p-2 text-slate-950">
                🎁<span className="block">Daily</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-white/10 p-2 no-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible">
            {MINI_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  setActiveMiniGame(game.id);
                  sendGameEvent(game.id, `${game.label} is ready. Tap Start Round to play.`, "join");
                }}
                className={`min-w-[104px] rounded-xl border px-2 py-2 text-left transition lg:min-w-0 ${
                  activeMiniGame === game.id
                    ? "border-sky-300/50 bg-sky-500/20"
                    : "border-white/10 bg-white/6 hover:bg-white/10"
                }`}
              >
                <span className="block text-base">{game.emoji}</span>
                <span className="block truncate text-[11px] font-black">{game.label}</span>
                <span className="block truncate text-[9px] text-slate-400">{game.sub}</span>
              </button>
            ))}
          </div>

          <div className="max-h-[34vh] overflow-y-auto p-3 no-scrollbar lg:max-h-[calc(100vh-21rem)]">
            <div className={`rounded-2xl bg-gradient-to-br ${MINI_GAMES.find((g) => g.id === activeMiniGame)?.color} p-[1px]`}>
              <div className="rounded-2xl bg-slate-950/88 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-black">
                    {MINI_GAMES.find((g) => g.id === activeMiniGame)?.emoji} {MINI_GAMES.find((g) => g.id === activeMiniGame)?.label}
                  </p>
                  <button onClick={completeMiniGame} className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black text-slate-950">
                    Winner
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => sendGameEvent(activeMiniGame, `${MINI_GAMES.find((g) => g.id === activeMiniGame)?.label} round started in ${active.name}.`, "round")}
                  className="mb-2 w-full rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white shadow-lg shadow-sky-500/20"
                >
                  Start Round
                </button>

                {activeMiniGame === "mafia" && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => runMiniGameAction("role")} className="rounded-xl bg-white/10 p-2 text-xs font-bold">Assign roles</button>
                    <button onClick={() => runMiniGameAction("night")} className="rounded-xl bg-white/10 p-2 text-xs font-bold">Night</button>
                    <button onClick={() => runMiniGameAction("vote")} className="game-shake rounded-xl bg-rose-500/25 p-2 text-xs font-bold">Vote</button>
                    {localRole && <p className="col-span-3 rounded-xl bg-violet-500/20 p-2 text-xs font-bold">Your secret role: {localRole}</p>}
                  </div>
                )}

                {activeMiniGame === "truth" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runMiniGameAction("truth")} className="rounded-xl bg-white/10 p-3 text-xs font-bold">Random card</button>
                    <button onClick={() => sendGameEvent("truth", "Task completed ✅", "complete")} className="rounded-xl bg-emerald-400 p-3 text-xs font-black text-slate-950">Complete</button>
                  </div>
                )}

                {activeMiniGame === "ludo" && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => runMiniGameAction("roll")} className="rounded-xl bg-white/10 p-3 text-xs font-bold">Roll dice</button>
                    <button onClick={() => sendGameEvent("ludo", "Blue team 🔵 needs one player.", "join")} className="rounded-xl bg-sky-500/25 p-3 text-xs font-bold">Blue 2v2</button>
                    <button onClick={() => sendGameEvent("ludo", "Purple team 🟣 needs one player.", "join")} className="rounded-xl bg-fuchsia-500/25 p-3 text-xs font-bold">Purple 2v2</button>
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
                      className="relative h-36 touch-none overflow-hidden rounded-xl bg-white"
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

                {activeMiniGame === "spy" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runMiniGameAction("topic")} className="rounded-xl bg-white/10 p-3 text-xs font-bold">Start topic</button>
                    <button onClick={() => sendGameEvent("spy", "Elimination vote started. Who is the spy?", "vote")} className="game-shake rounded-xl bg-rose-500/25 p-3 text-xs font-bold">Eliminate</button>
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
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {gameFeed.filter((event) => event.game === activeMiniGame).slice(0, 8).map((event) => (
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
                  Start a round. The chat stays open behind this panel.
                </p>
              )}
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
                      <span>{u.avatar_emoji ?? "🧑"}</span>
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
            {msgs.filter((m) => !blockedUsers.includes(m.user_id)).length === 0 && (
              <div className="grid place-items-center rounded-[1.25rem] border border-dashed border-white/15 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-sky-500/10 text-sky-400">
                  <MessageCircle />
                </span>
                <h3 className="mt-3 text-lg font-black tracking-tight">No messages yet</h3>
                <p className="mt-1 max-w-md text-xs leading-5 text-slate-400 font-mal">
                  ഈ room-ൽ ആദ്യത്തെ message നിങ്ങൾ ആവട്ടെ ✨
                </p>
              </div>
            )}
            {msgs.filter((m) => !blockedUsers.includes(m.user_id)).map((m) => {
              const me = m.user_id === user.id;
              const p = profiles[m.user_id];
              const isVoice = m.kind === "voice" && !!m.audio_url;
              const muted = !me && mutedUsers.includes(m.user_id);
              return (
                <div
                  key={m.id}
                  className={`group flex gap-2 ${me ? "justify-end" : "justify-start"}`}
                >
                  {!me && (
                    <button
                      type="button"
                      onClick={() => openUserProfile(m.user_id, p)}
                      className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm text-slate-950 transition hover:scale-105"
                      title="Open profile"
                    >
                      {p?.avatar_emoji ?? "🧑"}
                    </button>
                  )}
                  <div
                    className={`max-w-[84%] sm:max-w-[68%] ${me ? "items-end" : "items-start"} flex flex-col`}
                  >
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
                          onClick={() => !me && openUserProfile(m.user_id, p)}
                          className={`${me ? "cursor-default" : "hover:text-sky-200"} font-black`}
                        >
                          {me ? myDisplayName : (p?.username ?? "user")}
                        </button>
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
                      ) : stickerFromText(m.text) ? (
                        <AnimatedCharacterSticker text={m.text} />
                      ) : isTaggedLoveMessage(m.text) ? (
                        <p className="vibe-heartbeat-text text-[14px] font-black leading-6">
                          {m.text}
                        </p>
                      ) : isNightRainPhrase(m.text) && isLateNightIndia() ? (
                        <FloatingDustText text={m.text ?? ""} rain />
                      ) : isMissYouMessage(m.text) ? (
                        <FloatingDustText text={m.text ?? ""} />
                      ) : (
                        <p className="text-[13px] leading-5">{m.text}</p>
                      )}
                    </div>
                    <div
                      className={`hidden ${me ? "justify-end" : "justify-start"}`}
                    >
                      <button
                        onClick={(e) => react("❤️", e)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 text-[10px] font-black text-slate-300 shadow-sm transition hover:-translate-y-0.5 hover:text-sky-300"
                        title="React"
                      >
                        <Smile size={13} />
                      </button>
                      {me && <span className="px-1 text-xs font-bold text-sky-400">Sent</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {Object.entries(typingUsers).filter(([id]) => !blockedUsers.includes(id)).map(([id, t]) => (
              <div key={`typing-${id}`} className="flex gap-2">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm text-slate-950">
                  {t.avatar_emoji}
                </div>
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
              <div className="absolute bottom-[4.25rem] left-2 right-2 z-20 grid max-h-56 grid-cols-3 gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-xl shadow-slate-950/40 no-scrollbar">
                {mediaOpen === "gif"
                  ? GIFS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setText((current) => `${current}${item}`);
                          setMediaOpen(null);
                        }}
                        className="min-h-10 rounded-xl bg-white/8 px-2 text-xs font-bold text-slate-100 hover:bg-white/12"
                      >
                        {item}
                      </button>
                    ))
                  : CHARACTER_STICKERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setText(item.token);
                          setMediaOpen(null);
                        }}
                        className="min-h-20 rounded-xl bg-white/8 px-2 py-2 text-xs font-bold text-slate-100 hover:bg-white/12"
                      >
                        <span className={`vibe-character-sticker vibe-character-${item.mood} mx-auto scale-75`}>
                          <span className="vibe-character-face">{item.face}</span>
                          <span className="vibe-character-sparkles" aria-hidden="true" />
                        </span>
                        <span className="mt-1 block truncate text-[10px]">{item.label}</span>
                      </button>
                    ))}
              </div>
            )}
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={() => setEmojiOpen((open) => !open)}
                className={`grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm transition hover:-translate-y-0.5 ${
                  emojiOpen ? "bg-sky-500 text-white" : "bg-white/6 text-slate-100 hover:bg-white/10"
                }`}
                title="Emoji"
              >
                <Smile size={18} />
              </button>
              <button
                type="button"
                onClick={() => setMediaOpen((open) => open === "gif" ? null : "gif")}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/6 text-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/10"
                title="GIF"
              >
                <Clapperboard size={18} />
              </button>
              <button
                type="button"
                onClick={() => setMediaOpen((open) => open === "sticker" ? null : "sticker")}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/6 text-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/10"
                title="Sticker"
              >
                <Sticker size={18} />
              </button>
              <button
                type="button"
                onClick={sendQuizPrompt}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300"
                title="Post quiz"
              >
                <HelpCircle size={18} />
              </button>
              <button
                type="button"
                onClick={() => setGamesOpen((open) => !open)}
                className={`grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm transition hover:-translate-y-0.5 ${
                  gamesOpen ? "bg-sky-500 text-white" : "bg-white/6 text-slate-100 hover:bg-white/10"
                }`}
                title="Open game drawer"
              >
                <Gamepad2 size={18} />
              </button>
              <button
                type="button"
                onClick={() => setBroadcastMode((mode) => mode === "radio" ? null : "radio")}
                className={`hidden size-10 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm transition hover:-translate-y-0.5 sm:grid ${
                  broadcastMode === "radio" ? "bg-sky-500 text-white" : "bg-white/6 text-slate-100 hover:bg-white/10"
                }`}
                title="Radio"
              >
                <Radio size={18} />
              </button>
              <button
                type="button"
                onClick={() => setBroadcastMode((mode) => mode === "podcast" ? null : "podcast")}
                className={`hidden size-10 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm transition hover:-translate-y-0.5 sm:grid ${
                  broadcastMode === "podcast" ? "bg-fuchsia-500 text-white" : "bg-white/6 text-slate-100 hover:bg-white/10"
                }`}
                title="Podcast"
              >
                <Volume2 size={18} />
              </button>
              <button
                type="button"
                onClick={() => setVoiceMuted((muted) => !muted)}
                className={`grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm transition hover:-translate-y-0.5 ${
                  voiceMuted ? "bg-rose-500 text-white" : "bg-white/6 text-slate-100 hover:bg-white/10"
                }`}
                title={voiceMuted ? "Unmute voice" : "Mute voice"}
              >
                {voiceMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  emitTyping();
                }}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={recorder.state === "recording" ? "Recording…" : "Message the room"}
                disabled={recorder.state === "recording"}
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-slate-500 focus:border-sky-400/80 focus:bg-white/10 disabled:opacity-50"
              />
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
                    startRec();
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    endRec();
                  }}
                  onPointerLeave={() => {
                    if (recorder.state === "recording") endRec();
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

      {recorder.state === "recording" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-end bg-slate-950/70 pb-44 backdrop-blur-sm animate-fade-in lg:pb-32">
          <div className="flex w-[88%] max-w-sm flex-col items-center gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/82 px-6 py-5 shadow-xl shadow-slate-950/30">
            <div className="flex items-center gap-3">
              <span className="size-2.5 animate-pulse rounded-full bg-rose-500" />
              <span className="text-sm font-semibold tabular-nums">
                {Math.floor(recorder.elapsedMs / 60000)}:
                {String(Math.floor((recorder.elapsedMs / 1000) % 60)).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-slate-400">Recording…</span>
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

      <OnlineMembersPanel />
      <CinematicReactions triggers={cinematic} />
    </div>
  );
}
