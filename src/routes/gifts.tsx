import { createFileRoute } from "@tanstack/react-router";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/gifts")({
  head: () => ({ meta: [{ title: "Gift Shop — Vibe Malayali" }] }),
  component: Gifts,
});

const GIFTS = [
  { e:"🌹", name:"Rose", price:10 },
  { e:"❤️", name:"Heart", price:20 },
  { e:"☕", name:"Coffee", price:50 },
  { e:"🎂", name:"Cake", price:100 },
  { e:"👑", name:"Gold Crown", price:500 },
  { e:"💎", name:"Diamond", price:1000 },
  { e:"🚗", name:"Sports Car", price:5000 },
  { e:"🏰", name:"Castle", price:10000 },
  { e:"🦄", name:"Unicorn", price:2500 },
];

function Gifts() {
  return (
    <div className="relative min-h-screen grid-bg lg:pl-[72px]">
      <AmbientOrbs/>
      <div className="mx-auto max-w-md px-4 pt-8 pb-32">
        <p className="text-xs text-muted-foreground">Gift Shop</p>
        <h1 className="font-mal text-3xl font-extrabold mt-1"><span className="text-gradient">സമ്മാനങ്ങൾ</span> അയക്കൂ 🎁</h1>

        <div className="mt-5 flex items-center justify-between rounded-2xl glass-strong p-4 shadow-glow">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your wallet</p>
            <p className="text-2xl font-extrabold text-gradient-gold">2,480 🪙</p>
          </div>
          <button className="btn-neon !px-4 !py-2 text-xs">+ Top up</button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {GIFTS.map((g) => (
            <button key={g.name} className="group glass rounded-2xl p-3 text-center transition-all hover:-translate-y-1 active:scale-95 shadow-glow">
              <div className="text-4xl drop-shadow-[0_0_10px_rgba(255,200,100,0.5)] group-hover:scale-110 transition-transform">{g.e}</div>
              <p className="mt-2 text-[11px] font-semibold">{g.name}</p>
              <p className="text-[10px] text-gradient-gold font-bold">{g.price.toLocaleString()} 🪙</p>
            </button>
          ))}
        </div>
      </div>
      <BottomNav/>
    </div>
  );
}
