import { createFileRoute } from "@tanstack/react-router";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BottomNav } from "@/components/BottomNav";
import { Flame, Gift, Mic, Trophy, Zap } from "lucide-react";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Vibe Malayali" }] }),
  component: Wallet,
});

const TX = [
  { icon: Mic, label: "Voice note bonus", amt: "+200", time: "2m ago", color: "text-emerald-400" },
  { icon: Gift, label: "Gift to @meera", amt: "-100", time: "1h ago", color: "text-rose-400" },
  { icon: Trophy, label: "Daily streak day 7", amt: "+500", time: "Today", color: "text-emerald-400" },
  { icon: Flame, label: "Quiz winner", amt: "+1,000", time: "Yday", color: "text-emerald-400" },
];

const COUPONS = [
  { brand: "Zomato", v: "₹100", emoji: "🍔", coins: 10000 },
  { brand: "Amazon", v: "₹250", emoji: "📦", coins: 25000 },
  { brand: "Jio", v: "₹50", emoji: "📱", coins: 5000 },
  { brand: "Swiggy", v: "₹100", emoji: "🍕", coins: 10000 },
];

function Wallet() {
  return (
    <div className="relative min-h-screen grid-bg lg:pl-[72px]">
      <AmbientOrbs/>
      <div className="mx-auto max-w-md px-4 pt-8 pb-32">
        <p className="text-xs text-muted-foreground">Coin Wallet</p>
        <h1 className="font-mal text-3xl font-extrabold mt-1"><span className="text-gradient-gold">നാണയങ്ങൾ</span> & rewards</h1>

        <div className="mt-5 relative overflow-hidden rounded-3xl bg-gold p-[1.5px] shadow-neon">
          <div className="rounded-3xl bg-background/85 p-6 backdrop-blur">
            <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Total balance</p>
            <p className="mt-1 text-5xl font-extrabold text-gradient-gold">2,480 🪙</p>
            <p className="text-xs text-muted-foreground mt-1">≈ ₹24.80 · 100 coins = ₹1</p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button className="rounded-2xl glass py-3 text-xs font-semibold flex flex-col items-center gap-1"><Zap size={14}/>Earn</button>
              <button className="rounded-2xl glass py-3 text-xs font-semibold flex flex-col items-center gap-1"><Gift size={14}/>Spend</button>
              <button className="rounded-2xl glass py-3 text-xs font-semibold flex flex-col items-center gap-1"><Trophy size={14}/>Redeem</button>
            </div>
          </div>
        </div>

        {/* Daily streak */}
        <div className="mt-6 glass-strong rounded-3xl p-4 shadow-glow">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold flex items-center gap-1.5"><Flame className="text-orange-400" size={16}/> 7-day streak</p>
            <span className="text-[10px] text-muted-foreground">Day 7 of 30</span>
          </div>
          <div className="mt-3 flex justify-between">
            {[1,2,3,4,5,6,7].map((d)=>(
              <div key={d} className="flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${d<=7?"bg-hero text-white shadow-glow":"glass text-muted-foreground"}`}>
                  {d<=7 ? "✓" : d}
                </div>
                <span className="text-[9px] text-muted-foreground">+{d*10}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coupons */}
        <h2 className="mt-7 text-sm font-bold">Redeem Coupons</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {COUPONS.map((c) => (
            <div key={c.brand} className="glass rounded-2xl p-4 shadow-glow">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{c.emoji}</div>
                <div>
                  <p className="text-sm font-bold">{c.brand}</p>
                  <p className="text-xs text-gradient-gold font-bold">{c.v}</p>
                </div>
              </div>
              <button className="mt-3 w-full rounded-full bg-gold py-1.5 text-[11px] font-bold text-black">{c.coins.toLocaleString()} 🪙</button>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <h2 className="mt-7 text-sm font-bold">Recent Activity</h2>
        <div className="mt-3 glass-strong rounded-2xl divide-y divide-border">
          {TX.map((t,i)=>(
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-xl glass flex items-center justify-center"><t.icon size={16}/></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-[10px] text-muted-foreground">{t.time}</p>
              </div>
              <p className={`font-bold ${t.color}`}>{t.amt}</p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav/>
    </div>
  );
}
