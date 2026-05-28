import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BottomNav } from "@/components/BottomNav";
import { GuestExpiryNotice } from "@/components/GuestExpiryNotice";
import { ArrowLeft, Flame, Gift, Mic, RefreshCw, Trophy, WalletCards, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { accountBadge, canRedeem } from "@/lib/account";
import { formatCouponValue, requestRedemption } from "@/lib/rewards";
import { seo } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({
  head: () =>
    seo({
      title: "Vibemalayali Coins Wallet | Rewards, Streaks & Coupons",
      description:
        "Track Vibemalayali coins, streak rewards, user ranks, RJ tags, and request coupon redemption.",
      path: "/wallet",
    }),
  component: Wallet,
});

type CoinTx = {
  id: string;
  amount: number;
  reason: string;
  source: string;
  created_at: string;
};

type Redemption = {
  id: string;
  coupon_type: string;
  coins_requested: number;
  rupee_value: number;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const COUPONS = [
  { brand: "Amazon", emoji: "📦" },
  { brand: "Swiggy", emoji: "🍕" },
  { brand: "Zomato", emoji: "🍔" },
  { brand: "Myntra", emoji: "🛍️" },
];

function Wallet() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [transactions, setTransactions] = useState<CoinTx[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [coupon, setCoupon] = useState("Amazon");
  const [coins, setCoins] = useState(25000);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  const loadWallet = async () => {
    if (!user) return;
    const [txResult, redemptionResult] = await Promise.all([
      (supabase as any)
        .from("coin_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      (supabase as any)
        .from("redemption_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (!txResult.error) setTransactions(txResult.data ?? []);
    if (!redemptionResult.error) setRedemptions(redemptionResult.data ?? []);
  };

  useEffect(() => {
    loadWallet();
  }, [user?.id]);

  const balance = profile?.coins ?? 0;
  const valueText = useMemo(() => formatCouponValue(balance), [balance]);
  const badge = accountBadge(profile);
  const redeemAllowed = canRedeem(profile);

  async function submitRedemption() {
    if (!user) return;
    if (!redeemAllowed) return toast.error("Register to redeem real rewards.");
    if (coins > balance) return toast.error("Not enough coins");
    setBusy(true);
    const { error } = await requestRedemption(coupon, coins, note);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Redemption request sent for admin approval");
    setNote("");
    await loadWallet();
  }

  return (
    <div className="relative min-h-screen grid-bg lg:pl-[72px]">
      <AmbientOrbs />
      <div className="mx-auto max-w-md px-4 pt-8 pb-32">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-slate-200">
            <ArrowLeft size={14} /> Back
          </button>
          <button type="button" onClick={() => nav({ to: "/chat" })} className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200" title="Close">
            <X size={15} />
          </button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Coin Wallet</p>
            <h1 className="mt-1 text-3xl font-extrabold">
              <span className="text-gradient-gold">Coins</span> & rewards
            </h1>
          </div>
          <button onClick={loadWallet} className="grid size-10 place-items-center rounded-2xl glass">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="mt-5 relative overflow-hidden rounded-3xl bg-gold p-[1.5px] shadow-neon">
          <div className="rounded-3xl bg-background/85 p-6 backdrop-blur">
            <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Total balance</p>
            <p className="mt-1 text-5xl font-extrabold text-gradient-gold">
              {balance.toLocaleString("en-IN")} 🪙
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {valueText} coupon value · 500 coins = ₹1
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${badge.className}`}>
                {badge.icon} {badge.label}
              </span>
              {!redeemAllowed && (
                <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[10px] font-black text-amber-100">
                  Register to redeem real rewards
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <RewardPill icon={<Zap size={14} />} label="+50 login" />
              <RewardPill icon={<Mic size={14} />} label="+25 voice" />
              <RewardPill icon={<Trophy size={14} />} label="+10 message" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <GuestExpiryNotice profile={profile} />
        </div>

        <div className="mt-6 glass-strong rounded-3xl p-4 shadow-glow">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold flex items-center gap-1.5">
              <Flame className="text-orange-400" size={16} /> Daily streak
            </p>
            <span className="text-[10px] text-muted-foreground">Night {profile?.night_streak ?? 0}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-3xl font-black text-white">{profile?.daily_streak ?? 0} days</p>
              <p className="text-xs text-slate-400">{profile?.reward_rank ?? "🌱 Fresh Joiner"}</p>
              {profile?.rj_tag && <p className="mt-1 text-xs font-bold text-pink-200">{profile.rj_tag}</p>}
            </div>
            <div className="rounded-2xl bg-white/8 px-4 py-3 text-right">
              <p className="text-xs font-bold text-slate-400">Voice notes</p>
              <p className="text-xl font-black">{profile?.voice_notes_count ?? 0}</p>
            </div>
          </div>
        </div>

        <h2 className="mt-7 text-sm font-bold">Request Coupon Redemption</h2>
        <div className="mt-3 glass-strong rounded-3xl p-4 shadow-glow">
          <div className="grid grid-cols-2 gap-2">
            {COUPONS.map((item) => (
              <button
                key={item.brand}
                onClick={() => setCoupon(item.brand)}
                className={`rounded-2xl border px-3 py-3 text-left text-sm font-black ${
                  coupon === item.brand ? "border-amber-300 bg-amber-300/20 text-amber-100" : "border-white/10 bg-white/6"
                }`}
              >
                <span className="mr-2">{item.emoji}</span>
                {item.brand}
              </button>
            ))}
          </div>
          <select
            value={coins}
            onChange={(event) => setCoins(Number(event.target.value))}
            className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white"
          >
            {[5000, 10000, 25000, 50000, 100000].map((value) => (
              <option key={value} value={value}>
                {value.toLocaleString("en-IN")} coins = {formatCouponValue(value)}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for admin"
            className="mt-3 min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-white/8 px-3 py-3 text-sm text-white outline-none"
          />
          <button
            onClick={submitRedemption}
            disabled={busy || coins > balance || !redeemAllowed}
            title={!redeemAllowed ? "Register to redeem real rewards." : undefined}
            className="mt-3 w-full rounded-2xl bg-gold py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <WalletCards className="mr-2 inline" size={16} />
            {redeemAllowed ? `Request ${coupon} Coupon` : "Register to redeem real rewards"}
          </button>
          {!redeemAllowed && (
            <p className="mt-2 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">
              Guest users can collect coins and explore rewards, but coupon redemption is unlocked after registration.
            </p>
          )}
          <div className="mt-3">
            <GuestExpiryNotice profile={profile} compact />
          </div>
        </div>

        <h2 className="mt-7 text-sm font-bold">Redemption History</h2>
        <div className="mt-3 glass-strong rounded-2xl divide-y divide-border">
          {redemptions.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">No redemption requests yet.</p>
          ) : redemptions.map((item) => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black">{item.coupon_type} · ₹{Number(item.rupee_value).toLocaleString("en-IN")}</p>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase">{item.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{item.coins_requested.toLocaleString("en-IN")} coins</p>
              {item.admin_note && <p className="mt-1 text-xs text-amber-200">{item.admin_note}</p>}
            </div>
          ))}
        </div>

        <h2 className="mt-7 text-sm font-bold">Recent Activity</h2>
        <div className="mt-3 glass-strong rounded-2xl divide-y divide-border">
          {transactions.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">Coin activity will appear here.</p>
          ) : transactions.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-xl glass flex items-center justify-center">
                {item.amount >= 0 ? <Gift size={16} /> : <WalletCards size={16} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.reason}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <p className={`font-bold ${item.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {item.amount >= 0 ? "+" : ""}
                {item.amount.toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function RewardPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl glass py-3 text-xs font-semibold flex flex-col items-center gap-1">
      {icon}
      {label}
    </div>
  );
}
