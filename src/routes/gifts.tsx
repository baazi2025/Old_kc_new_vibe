import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gift, RefreshCw, Search, Send, Sparkles, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BottomNav } from "@/components/BottomNav";
import { GuestExpiryNotice } from "@/components/GuestExpiryNotice";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { type GiftCatalogItem, type GiftTransaction, sendVirtualGift } from "@/lib/gifts";
import { accountBadge, canSendGift, GUEST_GIFT_LIMIT } from "@/lib/account";
import { formatCouponValue } from "@/lib/rewards";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gifts")({
  head: () =>
    seo({
      title: "Coin Gift Shop | Vibemalayali Virtual Gifts",
      description:
        "Spend Vibemalayali coins on virtual gifts like Rose, Chaya, Crown, Diamond Vibe, Mic Star, and send them to Malayali friends.",
      path: "/gifts",
    }),
  component: Gifts,
});

type GiftWithNames = GiftTransaction & {
  gift?: GiftCatalogItem;
  sender?: Profile;
  receiver?: Profile;
};

function Gifts() {
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const [catalog, setCatalog] = useState<GiftCatalogItem[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [history, setHistory] = useState<GiftWithNames[]>([]);
  const [receiverId, setReceiverId] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [announce, setAnnounce] = useState(true);
  const [busyGift, setBusyGift] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const badge = accountBadge(profile);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users
      .filter((item) => item.id !== user?.id)
      .filter((item) => {
        if (!term) return true;
        return [item.username, item.display_name].filter(Boolean).some((value) => value!.toLowerCase().includes(term));
      })
      .slice(0, 30);
  }, [query, users, user?.id]);

  const receiver = users.find((item) => item.id === receiverId);

  useEffect(() => {
    loadShop();
  }, [user?.id]);

  async function loadShop() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [catalogResult, usersResult, profileResult, historyResult] = await Promise.all([
      (supabase as any)
        .from("gift_catalog")
        .select("*")
        .eq("enabled", true)
        .order("price", { ascending: true }),
      (supabase as any)
        .from("profiles")
        .select("id,username,display_name,avatar_emoji,is_guest,account_type,guest_expires_at,created_at,dm_enabled,coins")
        .order("username", { ascending: true })
        .limit(300),
      (supabase as any)
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .maybeSingle(),
      (supabase as any)
        .from("gift_transactions")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("removed_by_admin", false)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const error = catalogResult.error || usersResult.error || profileResult.error || historyResult.error;
    if (error) {
      toast.error(`${error.message}. Apply the gift shop Supabase migration first.`);
      setLoading(false);
      return;
    }

    const loadedCatalog = (catalogResult.data ?? []) as GiftCatalogItem[];
    const loadedUsers = ((usersResult.data ?? []) as Profile[]).filter(
      (item) => item.account_type !== "guest" || !item.guest_expires_at || new Date(item.guest_expires_at).getTime() > Date.now(),
    );
    const loadedHistory = (historyResult.data ?? []) as GiftTransaction[];
    const catalogMap = new Map(loadedCatalog.map((item) => [item.id, item]));
    const userMap = new Map(loadedUsers.map((item) => [item.id, item]));

    setCatalog(loadedCatalog);
    setUsers(loadedUsers);
    setBalance(profileResult.data?.coins ?? profile?.coins ?? 0);
    setHistory(
      loadedHistory.map((item) => ({
        ...item,
        gift: catalogMap.get(item.gift_id),
        sender: userMap.get(item.sender_id),
        receiver: userMap.get(item.receiver_id),
      })),
    );
    setLoading(false);
  }

  async function sendGift(giftItem: GiftCatalogItem) {
    if (!user) return toast.error("Please sign in first");
    if (!receiverId) return toast.error("Choose a user to receive this gift");
    if (receiverId === user.id) return toast.error("You cannot send a gift to yourself");
    if (!canSendGift(profile, giftItem.price)) {
      return toast.error(`Guests can send gifts up to ${GUEST_GIFT_LIMIT} coins. Register to unlock premium gifts.`);
    }
    if (giftItem.price > balance) return toast.error("Not enough coins");

    setBusyGift(giftItem.id);
    const { error } = await sendVirtualGift({
      receiverId,
      giftId: giftItem.id,
      message,
      announce,
      roomId: "friends",
    });
    setBusyGift(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Gift sent to ${receiver?.display_name || receiver?.username || "friend"}`);
    setMessage("");
    await loadShop();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050814] text-white lg:pl-[72px]">
      <AmbientOrbs />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-slate-200">
            <ArrowLeft size={14} /> Back
          </button>
          <button type="button" onClick={() => nav({ to: "/chat" })} className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200" title="Close">
            <X size={15} />
          </button>
        </div>
        <header className="rounded-[30px] border border-white/10 bg-gradient-to-br from-sky-500/18 via-fuchsia-500/12 to-amber-300/10 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-100">
                <Sparkles size={13} /> Virtual only
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Coin Gift Shop</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                Spend earned Vibemalayali coins on Rose, Chaya, Crown, Mic Star, and nostalgic KC-style gifts for friends.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${badge.className}`}>
                  {badge.icon} {badge.label}
                </span>
                {profile?.is_guest && (
                  <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[10px] font-black text-amber-100">
                    Register to send premium gifts above {GUEST_GIFT_LIMIT} coins
                  </span>
                )}
              </div>
              <div className="mt-3">
                <GuestExpiryNotice profile={profile} compact />
              </div>
            </div>
            <div className="min-w-[190px] rounded-3xl border border-amber-200/20 bg-amber-300/10 p-4">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-amber-200">
                <WalletCards size={14} /> Your coins
              </p>
              <p className="mt-1 text-3xl font-black text-white">{balance.toLocaleString("en-IN")}</p>
              <p className="text-xs font-bold text-slate-300">{formatCouponValue(balance)} coupon value</p>
            </div>
          </div>
        </header>

        {!user ? (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-center">
            <Gift className="mx-auto h-10 w-10 text-amber-200" />
            <h2 className="mt-3 text-2xl font-black">Sign in to send gifts</h2>
            <p className="mt-2 text-sm text-slate-300">Gift sending uses your coin wallet, so we need your account first.</p>
            <Link to="/login" className="mt-5 inline-flex rounded-full bg-sky-500 px-5 py-3 text-sm font-black text-white">
              Go to Login
            </Link>
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black">Send To</h2>
                  <button
                    type="button"
                    onClick={loadShop}
                    className="grid h-9 w-9 place-items-center rounded-2xl bg-white/10 text-slate-200"
                    title="Refresh"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
                <label className="mt-4 flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3">
                  <Search size={16} className="text-slate-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search registered users"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
                  />
                </label>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                  {filteredUsers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setReceiverId(item.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                        receiverId === item.id
                          ? "border-sky-300/50 bg-sky-400/15"
                          : "border-white/10 bg-slate-950/60 hover:bg-white/10"
                      }`}
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-slate-950">
                        {item.avatar_emoji || "🧑"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-white">
                          {item.display_name || item.username}
                        </span>
                        <span className="block truncate text-xs font-bold text-slate-400">@{item.username}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value.slice(0, 120))}
                  placeholder="Optional short gift message"
                  rows={3}
                  className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-sky-300"
                />
                <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm font-bold text-slate-200">
                  Announce in chat room
                  <input
                    type="checkbox"
                    checked={announce}
                    onChange={(event) => setAnnounce(event.target.checked)}
                    className="size-5 accent-sky-400"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {catalog.map((giftItem) => {
                  const giftAllowed = canSendGift(profile, giftItem.price);
                  return (
                  <article
                    key={giftItem.id}
                    className="group rounded-[26px] border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/30 hover:bg-white/[0.09]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-950 text-4xl shadow-[0_0_30px_rgba(251,191,36,0.18)] transition group-hover:scale-105">
                        {giftItem.emoji}
                      </div>
                      <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">
                        {giftItem.price.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-black text-white">{giftItem.name}</h2>
                    <p className="mt-1 min-h-12 text-sm font-semibold leading-5 text-slate-300">{giftItem.meaning}</p>
                    <button
                      type="button"
                      disabled={busyGift === giftItem.id || !receiverId || giftItem.price > balance || !giftAllowed}
                      title={!giftAllowed ? "Register to send premium gifts." : undefined}
                      onClick={() => sendGift(giftItem)}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                    >
                      {busyGift === giftItem.id ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                      {giftAllowed ? "Send Gift" : "Register to send"}
                    </button>
                  </article>
                );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4">
              <h2 className="text-lg font-black">Gift Activity</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-400">No gifts yet. The first one always feels iconic.</p>
                ) : (
                  history.map((item) => {
                    const isSent = item.sender_id === user.id;
                    const other = isSent ? item.receiver : item.sender;
                    return (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/65 p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{item.gift?.emoji ?? "🎁"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white">
                              {isSent ? "Sent" : "Received"} {item.gift?.name ?? item.gift_id}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {isSent ? "to" : "from"} {other?.display_name || other?.username || "user"} · {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {item.message && <p className="mt-2 rounded-xl bg-white/7 px-3 py-2 text-xs text-slate-200">{item.message}</p>}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
