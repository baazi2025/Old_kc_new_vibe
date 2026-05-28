import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, Gift, Wallet } from "lucide-react";
import { DesktopSidebar } from "./DesktopSidebar";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/gifts", icon: Gift, label: "Gifts" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <>
      <DesktopSidebar />
      <nav className="lg:hidden fixed bottom-3 left-1/2 z-40 -translate-x-1/2 w-[min(480px,calc(100%-1.5rem))]">
        <div className="glass-strong rounded-full px-2 py-2 flex items-center justify-between shadow-glow">
          {items.map(({ to, icon: Icon, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-all ${
                  active ? "bg-hero text-white shadow-neon" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
