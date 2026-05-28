import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Ban,
  CheckCircle2,
  Gamepad2,
  Gift,
  LockKeyhole,
  MessageSquareWarning,
  Mic,
  Pin,
  Radio,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";
import { formatCouponValue, reviewRedemption } from "@/lib/rewards";
import { adminRemoveGiftTransaction, type GiftCatalogItem, type GiftTransaction } from "@/lib/gifts";

export const Route = createFileRoute("/admin")({
  head: () =>
    seo({
      title: "Admin Panel | Vibemalayali Chat Moderation",
      description: "Protected Vibemalayali Chat admin panel for users, rooms, messages, games, voice notes, reports, and moderation logs.",
      path: "/admin",
    }),
  component: AdminPanel,
});

type AdminRole = "admin" | "moderator" | "user";

type AdminProfile = Profile & {
  role?: AdminRole | null;
  is_banned?: boolean | null;
  muted_until?: string | null;
  banned_until?: string | null;
  dm_disabled_by_admin?: boolean | null;
  mood_text?: string | null;
  guest_created_at?: string | null;
  guest_expires_at?: string | null;
  guest_expired_at?: string | null;
};

type AdminRoom = {
  id: string;
  name: string;
  description: string | null;
  visibility: "public" | "private" | "hidden";
  rules: string | null;
  mini_games_enabled: boolean;
  voice_notes_enabled: boolean;
  is_active: boolean;
};

type AdminMessage = {
  id: string;
  room_id: string;
  user_id: string;
  text: string | null;
  kind: string;
  audio_url: string | null;
  created_at: string;
  is_pinned?: boolean;
  deleted_by_admin?: boolean;
  moderation_status?: string;
};

type ReportRow = {
  id: string;
  message_id: string | null;
  reporter_id: string | null;
  reason: string;
  status: string;
  created_at: string;
};

type LogRow = {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
};

type RedemptionRow = {
  id: string;
  user_id: string;
  coupon_type: string;
  coins_requested: number;
  rupee_value: number;
  status: "pending" | "approved" | "rejected";
  user_note: string | null;
  admin_note: string | null;
  created_at: string;
};

type GiftHistoryRow = GiftTransaction;

const STAFF_ROLES = new Set(["admin", "moderator"]);

function formatTime(value?: string | null) {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function isFuture(value?: string | null) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

function AdminPanel() {
  const { user, profile, loading: authLoading } = useAuth();
  const role = profile?.role ?? "user";
  const canAccess = STAFF_ROLES.has(role);
  const isAdmin = role === "admin";

  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [giftCatalog, setGiftCatalog] = useState<GiftCatalogItem[]>([]);
  const [giftHistory, setGiftHistory] = useState<GiftHistoryRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [displayDrafts, setDisplayDrafts] = useState<Record<string, string>>({});
  const [roomDraft, setRoomDraft] = useState({
    id: "",
    name: "",
    description: "",
    rules: "",
    visibility: "public" as AdminRoom["visibility"],
  });
  const [giftDraft, setGiftDraft] = useState({
    id: "",
    emoji: "🎁",
    name: "",
    price: 250,
    meaning: "",
    enabled: true,
  });

  const staffName = profile?.display_name || profile?.username || "admin";

  const loadAdminData = async () => {
    if (!user || !canAccess) return;
    setLoading(true);
    setError(null);
    const activeSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const today = todayIso();

    const [
      profilesResult,
      roomsResult,
      messagesResult,
      reportsResult,
      redemptionsResult,
      giftCatalogResult,
      giftHistoryResult,
      logsResult,
      onlineResult,
    ] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id,username,display_name,avatar_emoji,avatar_url,avatar_path,is_guest,account_type,created_at,guest_created_at,guest_expires_at,guest_expired_at,bio,status_text,mood_text,dm_enabled,dm_disabled_by_admin,role,is_banned,muted_until,banned_until,coins")
        .order("created_at", { ascending: false })
        .limit(500),
      (supabase as any)
        .from("chat_rooms")
        .select("*")
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("messages")
        .select("id,room_id,user_id,text,kind,audio_url,created_at,is_pinned,deleted_by_admin,moderation_status")
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(150),
      (supabase as any)
        .from("message_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      (supabase as any)
        .from("redemption_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      (supabase as any)
        .from("gift_catalog")
        .select("*")
        .order("price", { ascending: true }),
      (supabase as any)
        .from("gift_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120),
      (supabase as any)
        .from("admin_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      (supabase as any)
        .from("visitor_events")
        .select("user_id")
        .gte("created_at", activeSince)
        .not("user_id", "is", null)
        .limit(1000),
    ]);

    const firstError =
      profilesResult.error ||
      roomsResult.error ||
      messagesResult.error ||
      reportsResult.error ||
      redemptionsResult.error ||
      giftCatalogResult.error ||
      giftHistoryResult.error ||
      logsResult.error ||
      onlineResult.error;

    if (firstError) {
      setError(firstError.message);
    } else {
      const loadedProfiles = (profilesResult.data ?? []) as AdminProfile[];
      setProfiles(loadedProfiles);
      setDisplayDrafts(
        Object.fromEntries(
          loadedProfiles.map((item) => [item.id, item.display_name || item.username]),
        ),
      );
      setRooms((roomsResult.data ?? []) as AdminRoom[]);
      setMessages((messagesResult.data ?? []) as AdminMessage[]);
      setReports((reportsResult.data ?? []) as ReportRow[]);
      setRedemptions((redemptionsResult.data ?? []) as RedemptionRow[]);
      setGiftCatalog((giftCatalogResult.data ?? []) as GiftCatalogItem[]);
      setGiftHistory((giftHistoryResult.data ?? []) as GiftHistoryRow[]);
      setLogs((logsResult.data ?? []) as LogRow[]);
      setOnlineIds([
        ...new Set(((onlineResult.data ?? []) as { user_id: string }[]).map((item) => item.user_id)),
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, [user?.id, canAccess]);

  const profileById = useMemo(() => {
    return new Map(profiles.map((item) => [item.id, item]));
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((item) =>
      [item.username, item.display_name, item.bio, item.status_text]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [profiles, search]);

  const stats = {
    totalUsers: profiles.length,
    onlineUsers: onlineIds.length,
    activeGuests: profiles.filter((item) => item.account_type === "guest" && !item.guest_expired_at && (!item.guest_expires_at || new Date(item.guest_expires_at).getTime() > Date.now())).length,
    expiredGuests: profiles.filter((item) => item.account_type === "guest" && (item.guest_expired_at || (item.guest_expires_at && new Date(item.guest_expires_at).getTime() <= Date.now()))).length,
    activeRooms: rooms.filter((room) => room.is_active).length,
    messagesToday: messages.filter((message) => !message.deleted_by_admin).length,
  };

  async function logAction(action: string, targetType: string, targetId?: string | null, details = {}) {
    if (!user) return;
    await (supabase as any).from("admin_action_logs").insert({
      admin_id: user.id,
      admin_name: staffName,
      action,
      target_type: targetType,
      target_id: targetId ?? null,
      details,
    });
  }

  async function updateUser(target: AdminProfile, updates: Partial<AdminProfile>, action: string) {
    const { error: updateError } = await (supabase as any)
      .from("profiles")
      .update(updates)
      .eq("id", target.id);
    if (updateError) return setError(updateError.message);
    await logAction(action, "user", target.id, updates);
    await loadAdminData();
  }

  async function cleanupExpiredGuests() {
    const { error: cleanupError } = await (supabase as any).rpc("cleanup_expired_guests");
    if (cleanupError) return setError(cleanupError.message);
    await logAction("cleaned expired guests", "guest");
    await loadAdminData();
  }

  async function expireGuest(target: AdminProfile, deleteProfile = false) {
    const { error: expireError } = await (supabase as any).rpc("admin_expire_guest", {
      target_user: target.id,
      delete_profile: deleteProfile,
    });
    if (expireError) return setError(expireError.message);
    await logAction(deleteProfile ? "deleted guest manually" : "expired guest manually", "guest", target.id);
    await loadAdminData();
  }

  async function convertGuestManually(target: AdminProfile) {
    await updateUser(
      target,
      { account_type: "registered", is_guest: false, guest_expires_at: null, guest_expired_at: null } as Partial<AdminProfile>,
      "converted guest manually",
    );
  }

  async function createRoom() {
    if (!roomDraft.id.trim() || !roomDraft.name.trim()) {
      setError("Room id and room name are required.");
      return;
    }
    const payload = {
      ...roomDraft,
      id: roomDraft.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
      name: roomDraft.name.trim(),
      description: roomDraft.description.trim(),
      rules: roomDraft.rules.trim(),
      created_by: user?.id,
    };
    const { error: insertError } = await (supabase as any).from("chat_rooms").insert(payload);
    if (insertError) return setError(insertError.message);
    await logAction("created room", "room", payload.id, payload);
    setRoomDraft({ id: "", name: "", description: "", rules: "", visibility: "public" });
    await loadAdminData();
  }

  async function updateRoom(room: AdminRoom, updates: Partial<AdminRoom>, action = "updated room") {
    const { error: updateError } = await (supabase as any)
      .from("chat_rooms")
      .update(updates)
      .eq("id", room.id);
    if (updateError) return setError(updateError.message);
    await logAction(action, "room", room.id, updates);
    await loadAdminData();
  }

  async function deleteRoom(room: AdminRoom) {
    const { error: deleteError } = await (supabase as any).from("chat_rooms").delete().eq("id", room.id);
    if (deleteError) return setError(deleteError.message);
    await logAction("deleted room", "room", room.id);
    await loadAdminData();
  }

  async function updateMessage(message: AdminMessage, updates: Partial<AdminMessage>, action: string) {
    const { error: updateError } = await (supabase as any)
      .from("messages")
      .update(updates)
      .eq("id", message.id);
    if (updateError) return setError(updateError.message);
    await logAction(action, "message", message.id, updates);
    await loadAdminData();
  }

  async function deleteMessage(message: AdminMessage) {
    const { error: deleteError } = await (supabase as any)
      .from("messages")
      .delete()
      .eq("id", message.id);
    if (deleteError) return setError(deleteError.message);
    await logAction(message.audio_url ? "deleted reported voice note" : "deleted message", "message", message.id, {
      room_id: message.room_id,
      kind: message.kind,
    });
    await loadAdminData();
  }

  async function reviewReport(report: ReportRow, status: string) {
    const { error: updateError } = await (supabase as any)
      .from("message_reports")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", report.id);
    if (updateError) return setError(updateError.message);
    await logAction(`marked report ${status}`, "report", report.id);
    await loadAdminData();
  }

  async function handleRedemption(item: RedemptionRow, status: "approved" | "rejected") {
    const note = window.prompt(status === "approved" ? "Admin note / coupon details" : "Reason for rejection") ?? "";
    const { error: reviewError } = await reviewRedemption(item.id, status, note);
    if (reviewError) return setError(reviewError.message);
    await loadAdminData();
  }

  async function saveGiftCatalogItem(item?: GiftCatalogItem) {
    const source = item ?? giftDraft;
    const id = source.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (!id || !source.name.trim()) {
      setError("Gift id and name are required.");
      return;
    }
    const payload = {
      id,
      emoji: source.emoji.trim() || "🎁",
      name: source.name.trim(),
      price: Math.max(1, Number(source.price) || 1),
      meaning: source.meaning.trim().slice(0, 160),
      enabled: source.enabled,
      updated_at: new Date().toISOString(),
    };
    const { error: upsertError } = await (supabase as any)
      .from("gift_catalog")
      .upsert(payload, { onConflict: "id" });
    if (upsertError) return setError(upsertError.message);
    await logAction(item ? "updated gift" : "created gift", "gift", id, payload);
    setGiftDraft({ id: "", emoji: "🎁", name: "", price: 250, meaning: "", enabled: true });
    await loadAdminData();
  }

  async function toggleGift(item: GiftCatalogItem) {
    const { error: updateError } = await (supabase as any)
      .from("gift_catalog")
      .update({ enabled: !item.enabled, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (updateError) return setError(updateError.message);
    await logAction(item.enabled ? "disabled gift" : "enabled gift", "gift", item.id);
    await loadAdminData();
  }

  async function removeGiftMessage(item: GiftHistoryRow) {
    const reason = window.prompt("Reason for removing this gift message") ?? "";
    const { error: removeError } = await adminRemoveGiftTransaction(item.id, reason);
    if (removeError) return setError(removeError.message);
    await loadAdminData();
  }

  if (authLoading) {
    return <AdminShell>Loading admin session...</AdminShell>;
  }

  if (!user) {
    return (
      <AdminShell>
        <AccessCard icon={<LockKeyhole />} title="Admin Login Needed" body="Sign in with an admin or moderator account to access the protected panel." />
        <Link to="/login" className="mt-4 rounded-full bg-sky-400 px-5 py-2 text-sm font-black text-slate-950">
          Go to Login
        </Link>
      </AdminShell>
    );
  }

  if (!canAccess) {
    return (
      <AdminShell>
        <AccessCard icon={<ShieldCheck />} title="Protected Admin Area" body="This page is only available to users with admin or moderator role." />
      </AdminShell>
    );
  }

  return (
    <AdminShell wide>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-sky-200">
              KC Control Room
            </p>
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Admin Panel</h1>
            <p className="mt-2 text-sm text-slate-300">
              Signed in as {staffName} · {role}
            </p>
          </div>
          <button
            onClick={loadAdminData}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-black text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-semibold text-amber-100">
            {error}. Apply the admin Supabase migration if this table/column is missing.
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Users />} label="Total Users" value={stats.totalUsers} />
          <StatCard icon={<Activity />} label="Online Users" value={stats.onlineUsers} />
          <StatCard icon={<Radio />} label="Active Guests" value={stats.activeGuests} />
          <StatCard icon={<MessageSquareWarning />} label="Expired Guests" value={stats.expiredGuests} />
        </section>

        <Panel title="Guest Expiry" icon={<Users />}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-300">
              Guests expire after 96 hours. Expired guests are anonymized and their coins, rewards, virtual gifts, and presence are cleared.
            </p>
            <ActionButton tone="good" onClick={cleanupExpiredGuests}>Run cleanup</ActionButton>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Active Guests</h3>
              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {profiles.filter((item) => item.account_type === "guest" && !item.guest_expired_at && (!item.guest_expires_at || new Date(item.guest_expires_at).getTime() > Date.now())).map((item) => (
                  <GuestAdminRow key={item.id} item={item} onExpire={() => expireGuest(item, false)} onDelete={() => expireGuest(item, true)} onConvert={() => convertGuestManually(item)} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Expired Guests</h3>
              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {profiles.filter((item) => item.account_type === "guest" && (item.guest_expired_at || (item.guest_expires_at && new Date(item.guest_expires_at).getTime() <= Date.now()))).map((item) => (
                  <GuestAdminRow key={item.id} item={item} onExpire={() => expireGuest(item, false)} onDelete={() => expireGuest(item, true)} onConvert={() => convertGuestManually(item)} />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel title="User Management" icon={<UserCog />}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              className="mb-3 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none focus:border-sky-300"
            />
            <div className="max-h-[620px] space-y-3 overflow-auto pr-1">
              {filteredProfiles.map((item) => {
                const muted = isFuture(item.muted_until);
                const banned = item.is_banned || isFuture(item.banned_until);
                return (
                  <div key={item.id} className="rounded-2xl bg-slate-950/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-lg text-slate-950">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt={`${item.username} profile`} className="h-full w-full object-cover" />
                          ) : (
                            item.avatar_emoji
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-white">{item.username}</p>
                          <p className="text-xs text-slate-400">
                            {item.is_guest ? "Guest" : "Registered"} · {item.role ?? "user"} · Joined {formatTime(item.created_at)}
                          </p>
                          <p className="mt-1 text-xs text-slate-300">
                            {banned ? "Banned" : muted ? `Muted until ${formatTime(item.muted_until)}` : "Active"}
                            {item.dm_disabled_by_admin ? " · DM disabled" : ""}
                          </p>
                        </div>
                      </div>
                      <select
                        disabled={!isAdmin}
                        value={item.role ?? "user"}
                        onChange={(event) => updateUser(item, { role: event.target.value as AdminRole }, "changed role")}
                        className="rounded-xl border border-white/10 bg-white/8 px-2 py-2 text-xs font-bold text-white"
                      >
                        <option value="user">user</option>
                        <option value="moderator">moderator</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={displayDrafts[item.id] ?? ""}
                        onChange={(event) => setDisplayDrafts((draft) => ({ ...draft, [item.id]: event.target.value }))}
                        className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white outline-none"
                        placeholder="Display name"
                      />
                      <button
                        onClick={() => updateUser(item, { display_name: displayDrafts[item.id] ?? item.username }, "edited display name")}
                        className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white"
                      >
                        Save name
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton onClick={() => updateUser(item, { is_banned: !banned, banned_until: null }, banned ? "unbanned user" : "banned user")} tone={banned ? "good" : "bad"}>
                        {banned ? "Unban" : "Ban"}
                      </ActionButton>
                      <ActionButton onClick={() => updateUser(item, { muted_until: muted ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }, muted ? "unmuted user" : "muted user")}>
                        {muted ? "Unmute" : "Mute 24h"}
                      </ActionButton>
                      <ActionButton onClick={() => updateUser(item, { avatar_emoji: "🧑", avatar_url: null, avatar_path: null }, "reset avatar")}>Reset avatar</ActionButton>
                      <ActionButton onClick={() => updateUser(item, { dm_disabled_by_admin: !item.dm_disabled_by_admin }, item.dm_disabled_by_admin ? "enabled DM" : "disabled DM")}>
                        {item.dm_disabled_by_admin ? "Enable DM" : "Disable DM"}
                      </ActionButton>
                      <ActionButton onClick={() => updateUser(item, { bio: "", status_text: "", mood_text: "" }, "cleared profile content")}>
                        Clear bio/mood
                      </ActionButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Chatroom Management" icon={<Radio />}>
            <div className="grid gap-2 rounded-2xl bg-slate-950/70 p-3">
              <input value={roomDraft.id} onChange={(e) => setRoomDraft((d) => ({ ...d, id: e.target.value }))} placeholder="room-id" className="admin-input" />
              <input value={roomDraft.name} onChange={(e) => setRoomDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Room name" className="admin-input" />
              <textarea value={roomDraft.description} onChange={(e) => setRoomDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Description" className="admin-input min-h-20" />
              <textarea value={roomDraft.rules} onChange={(e) => setRoomDraft((d) => ({ ...d, rules: e.target.value }))} placeholder="Room rules" className="admin-input min-h-20" />
              <select value={roomDraft.visibility} onChange={(e) => setRoomDraft((d) => ({ ...d, visibility: e.target.value as AdminRoom["visibility"] }))} className="admin-input">
                <option value="public">public</option>
                <option value="private">private</option>
                <option value="hidden">hidden</option>
              </select>
              <button onClick={createRoom} className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950">
                Create room
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {rooms.map((room) => (
                <div key={room.id} className="rounded-2xl bg-slate-950/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{room.name}</p>
                      <p className="text-xs text-slate-400">{room.id} · {room.visibility}</p>
                    </div>
                    <ActionButton tone="bad" onClick={() => deleteRoom(room)}>
                      Delete
                    </ActionButton>
                  </div>
                  <textarea
                    defaultValue={room.rules ?? ""}
                    onBlur={(event) => updateRoom(room, { rules: event.target.value }, "updated room rules")}
                    className="admin-input mt-3 min-h-20"
                    placeholder="Room rules"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <ToggleButton active={room.is_active} onClick={() => updateRoom(room, { is_active: !room.is_active }, "toggled room active")}>Active</ToggleButton>
                    <ToggleButton active={room.mini_games_enabled} onClick={() => updateRoom(room, { mini_games_enabled: !room.mini_games_enabled }, "toggled mini games")}>
                      <Gamepad2 size={14} /> Mini games
                    </ToggleButton>
                    <ToggleButton active={room.voice_notes_enabled} onClick={() => updateRoom(room, { voice_notes_enabled: !room.voice_notes_enabled }, "toggled voice notes")}>
                      <Mic size={14} /> Voice notes
                    </ToggleButton>
                    <select value={room.visibility} onChange={(event) => updateRoom(room, { visibility: event.target.value as AdminRoom["visibility"] }, "changed room visibility")} className="admin-input">
                      <option value="public">public</option>
                      <option value="private">private</option>
                      <option value="hidden">hidden</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Panel title="Message Moderation" icon={<MessageSquareWarning />}>
            <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
              {messages.map((message) => {
                const author = profileById.get(message.user_id);
                return (
                  <div key={message.id} className="rounded-2xl bg-slate-950/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white">
                          {author?.username ?? message.user_id.slice(0, 8)} · {message.room_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{formatTime(message.created_at)} · {message.kind}</p>
                      </div>
                      {message.is_pinned && <Pin className="h-4 w-4 text-amber-300" />}
                    </div>
                    <p className="mt-3 rounded-xl bg-white/7 px-3 py-2 text-sm text-slate-200">
                      {message.audio_url ? "Voice note message" : message.text || "No text"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton onClick={() => updateMessage(message, { is_pinned: !message.is_pinned }, message.is_pinned ? "unpinned message" : "pinned message")}>
                        {message.is_pinned ? "Unpin" : "Pin"}
                      </ActionButton>
                      <ActionButton
                        tone="bad"
                        onClick={() => deleteMessage(message)}
                      >
                        <Trash2 size={14} /> Delete
                      </ActionButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Reported Messages" icon={<Ban />}>
            <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
              {reports.length === 0 ? (
                <p className="text-sm text-slate-400">No open reports yet.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="font-black text-white">{report.reason}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Message {report.message_id?.slice(0, 8) ?? "unknown"} · {formatTime(report.created_at)} · {report.status}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton onClick={() => reviewReport(report, "reviewed")}>Mark reviewed</ActionButton>
                      <ActionButton tone="good" onClick={() => reviewReport(report, "actioned")}>Actioned</ActionButton>
                      <ActionButton onClick={() => reviewReport(report, "dismissed")}>Dismiss</ActionButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        <Panel title="Coupon Redemptions" icon={<Gift />}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Pending</h3>
              <div className="space-y-3">
                {redemptions.filter((item) => item.status === "pending").length === 0 ? (
                  <p className="text-sm text-slate-400">No pending redemption requests.</p>
                ) : (
                  redemptions.filter((item) => item.status === "pending").map((item) => {
                    const requester = profileById.get(item.user_id);
                    return (
                      <div key={item.id} className="rounded-2xl bg-slate-950/70 p-3">
                        <p className="font-black text-white">{requester?.username ?? item.user_id.slice(0, 8)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.coupon_type} · {item.coins_requested.toLocaleString("en-IN")} coins · {formatCouponValue(item.coins_requested)}
                        </p>
                        {item.user_note && <p className="mt-2 rounded-xl bg-white/8 px-3 py-2 text-xs text-slate-200">{item.user_note}</p>}
                        <div className="mt-3 flex gap-2">
                          <ActionButton tone="good" onClick={() => handleRedemption(item, "approved")}>Approve</ActionButton>
                          <ActionButton tone="bad" onClick={() => handleRedemption(item, "rejected")}>Reject</ActionButton>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">History</h3>
              <div className="max-h-[380px] space-y-3 overflow-auto pr-1">
                {redemptions.filter((item) => item.status !== "pending").map((item) => {
                  const requester = profileById.get(item.user_id);
                  return (
                    <div key={item.id} className="rounded-2xl bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-white">{requester?.username ?? item.user_id.slice(0, 8)}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.status === "approved" ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.coupon_type} · {formatCouponValue(item.coins_requested)} · {formatTime(item.created_at)}
                      </p>
                      {item.admin_note && <p className="mt-2 text-xs text-amber-200">{item.admin_note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Gift Shop Management" icon={<Gift />}>
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl bg-slate-950/70 p-3">
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Create Gift</h3>
              <div className="grid gap-2">
                <input value={giftDraft.id} onChange={(e) => setGiftDraft((d) => ({ ...d, id: e.target.value }))} placeholder="gift_id" className="admin-input" />
                <div className="grid grid-cols-[76px_1fr] gap-2">
                  <input value={giftDraft.emoji} onChange={(e) => setGiftDraft((d) => ({ ...d, emoji: e.target.value }))} placeholder="Emoji" className="admin-input text-center text-xl" />
                  <input value={giftDraft.name} onChange={(e) => setGiftDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Gift name" className="admin-input" />
                </div>
                <input type="number" min={1} value={giftDraft.price} onChange={(e) => setGiftDraft((d) => ({ ...d, price: Number(e.target.value) }))} placeholder="Coin price" className="admin-input" />
                <textarea value={giftDraft.meaning} onChange={(e) => setGiftDraft((d) => ({ ...d, meaning: e.target.value }))} placeholder="Meaning / short message" className="admin-input min-h-20" />
                <ToggleButton active={giftDraft.enabled} onClick={() => setGiftDraft((d) => ({ ...d, enabled: !d.enabled }))}>
                  Enabled
                </ToggleButton>
                <button onClick={() => saveGiftCatalogItem()} className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950">
                  Save gift
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Catalog</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {giftCatalog.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-950/70 p-3">
                    <div className="grid grid-cols-[64px_1fr] gap-2">
                      <input
                        value={item.emoji}
                        onChange={(e) => setGiftCatalog((rows) => rows.map((row) => row.id === item.id ? { ...row, emoji: e.target.value } : row))}
                        className="admin-input text-center text-xl"
                      />
                      <input
                        value={item.name}
                        onChange={(e) => setGiftCatalog((rows) => rows.map((row) => row.id === item.id ? { ...row, name: e.target.value } : row))}
                        className="admin-input"
                      />
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={item.price}
                      onChange={(e) => setGiftCatalog((rows) => rows.map((row) => row.id === item.id ? { ...row, price: Number(e.target.value) } : row))}
                      className="admin-input mt-2"
                    />
                    <textarea
                      value={item.meaning}
                      onChange={(e) => setGiftCatalog((rows) => rows.map((row) => row.id === item.id ? { ...row, meaning: e.target.value } : row))}
                      className="admin-input mt-2 min-h-16"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton tone="good" onClick={() => saveGiftCatalogItem(item)}>Save</ActionButton>
                      <ActionButton onClick={() => toggleGift(item)}>{item.enabled ? "Disable" : "Enable"}</ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Gift Transaction History</h3>
            <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
              {giftHistory.length === 0 ? (
                <p className="text-sm text-slate-400">No gift transactions yet.</p>
              ) : giftHistory.map((item) => {
                const gift = giftCatalog.find((catalogItem) => catalogItem.id === item.gift_id);
                const sender = profileById.get(item.sender_id);
                const receiver = profileById.get(item.receiver_id);
                return (
                  <div key={item.id} className={`rounded-2xl p-3 ${item.removed_by_admin ? "bg-rose-950/30" : "bg-slate-950/70"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-white">
                          {gift?.emoji ?? "🎁"} {gift?.name ?? item.gift_id} · {item.coins_spent.toLocaleString("en-IN")} coins
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {sender?.username ?? item.sender_id.slice(0, 8)} → {receiver?.username ?? item.receiver_id.slice(0, 8)} · {formatTime(item.created_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.removed_by_admin ? "bg-rose-400/20 text-rose-100" : "bg-emerald-400/15 text-emerald-100"}`}>
                        {item.removed_by_admin ? "removed" : "visible"}
                      </span>
                    </div>
                    {item.message && <p className="mt-2 rounded-xl bg-white/8 px-3 py-2 text-xs text-slate-200">{item.message}</p>}
                    {!item.removed_by_admin && (
                      <div className="mt-3">
                        <ActionButton tone="bad" onClick={() => removeGiftMessage(item)}>Remove abusive message</ActionButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel title="Admin Action Logs" icon={<ShieldCheck />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="py-3">Time</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((log) => (
                  <tr key={log.id} className="text-slate-200">
                    <td className="py-3">{formatTime(log.created_at)}</td>
                    <td>{log.admin_name}</td>
                    <td>{log.action}</td>
                    <td>{log.target_type} {log.target_id?.slice(0, 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}

function AdminShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="min-h-screen bg-[#060914] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.18),transparent_32%)]" />
      <div className={`relative min-h-screen ${wide ? "" : "flex flex-col items-center justify-center px-4"}`}>
        {children}
      </div>
    </main>
  );
}

function AccessCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-400/15 text-sky-200">{icon}</div>
      <h1 className="mt-4 text-2xl font-black text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-300">{body}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-white">
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/10 text-sky-200">{icon}</div>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function GuestAdminRow({
  item,
  onExpire,
  onDelete,
  onConvert,
}: {
  item: AdminProfile;
  onExpire: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const expired = Boolean(item.guest_expired_at || (item.guest_expires_at && new Date(item.guest_expires_at).getTime() <= Date.now()));
  return (
    <div className="rounded-2xl bg-slate-950/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{item.display_name || item.username}</p>
          <p className="mt-1 text-xs text-slate-400">
            {expired ? "Expired" : "Active"} · expires {formatTime(item.guest_expires_at)} · coins {(item.coins ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 truncate text-[10px] text-slate-500">{item.id}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${expired ? "bg-rose-400/15 text-rose-100" : "bg-emerald-400/15 text-emerald-100"}`}>
          {expired ? "expired" : "guest"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton tone="good" onClick={onConvert}>Convert manually</ActionButton>
        <ActionButton onClick={onExpire}>Expire now</ActionButton>
        <ActionButton tone="bad" onClick={onDelete}>Delete guest</ActionButton>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.07] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200">
          {icon}
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
      <p className="mt-4 text-sm font-bold text-slate-300">{label}</p>
    </div>
  );
}

function ActionButton({ children, onClick, tone = "neutral" }: { children: React.ReactNode; onClick: () => void; tone?: "neutral" | "bad" | "good" }) {
  const toneClass =
    tone === "bad"
      ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
      : tone === "good"
        ? "bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30"
        : "bg-white/8 text-slate-100 hover:bg-white/12";
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition ${toneClass}`}>
      {children}
    </button>
  );
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
        active ? "bg-emerald-400 text-slate-950" : "bg-white/8 text-slate-300"
      }`}
    >
      {active ? <CheckCircle2 size={14} /> : null}
      {children}
    </button>
  );
}

