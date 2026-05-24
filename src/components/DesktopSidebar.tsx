import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, VenetianMask, Gift, Wallet, Home, Sparkles } from "lucide-react";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/confessions", icon: VenetianMask, label: "Secrets" },
  { to: "/gifts", icon: Gift, label: "Gifts" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
] as const;

/** Compact glassmorphism left sidebar — desktop only (lg+). */
export function DesktopSidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-full w-[72px] flex-col items-center py-4 gap-2 glass-strong border-r border-white/10">
      <div className="h-10 w-10 rounded-2xl bg-hero shadow-glow flex items-center justify-center mb-2">
        <Sparkles size={18} className="text-white" />
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={`group relative h-11 w-11 rounded-2xl flex items-center justify-center transition-all
                ${active
                  ? "bg-hero text-white shadow-neon"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:shadow-[0_0_18px_rgba(168,85,247,0.35)]"}`}
            >
              <Icon size={18} />
              {active && <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-white shadow-glow" />}
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md glass-strong px-2 py-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
