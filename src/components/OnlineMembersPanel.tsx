import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users, X, Radio, Anchor, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";

type Presence = {
  user_id: string;
  username: string;
  avatar_emoji: string;
  avatar_url?: string | null;
  is_rj?: boolean;
  is_anchor?: boolean;
  account_type?: string | null;
  guest_expires_at?: string | null;
  online_at: string;
};

/**
 * Global online-members sidebar.
 * - Desktop (lg+): fixed right column.
 * - Mobile: floating toggle + slide-out drawer.
 */
export function OnlineMembersPanel() {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<Presence[]>([]);
  const [open, setOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Presence[]>;
      const flat = Object.values(state).flat();
      const unique = Array.from(new Map(flat.map((p) => [p.user_id, p])).values())
        .filter((p) => p.account_type !== "guest" || !p.guest_expires_at || new Date(p.guest_expires_at).getTime() > Date.now());
      unique.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
      setMembers(unique);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          user_id: user.id,
          username: profile?.username ?? "guest",
          avatar_emoji: profile?.avatar_emoji ?? "🧑",
          avatar_url: profile?.avatar_url ?? null,
          is_rj: (profile as Profile | null)?.is_rj ?? false,
          is_anchor: (profile as Profile | null)?.is_anchor ?? false,
          account_type: profile?.account_type ?? (profile?.is_guest ? "guest" : "registered"),
          guest_expires_at: profile?.guest_expires_at ?? null,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [user, profile]);

  const count = members.length;

  if (!user) return null;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed right-3 top-3 z-40 glass-strong rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-glow text-xs font-semibold"
        aria-label="Open online members"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        {count}
      </button>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel: drawer on mobile, fixed sidebar on desktop */}
      <aside
        className={`fixed top-0 right-0 z-[61] h-full w-[280px] glass-strong border-l border-white/10
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
          lg:translate-x-0 lg:z-30`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
            </span>
            <p className="text-sm font-bold">Online Members <span className="text-emerald-400">({count})</span></p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden glass rounded-full p-1.5"><X size={14}/></button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-3.25rem)] px-2 py-2 space-y-1">
          {count === 0 && (
            <div className="text-center text-xs text-muted-foreground py-10 flex flex-col items-center gap-2">
              <Users size={28} className="opacity-50"/>
              <p>No one else online yet</p>
            </div>
          )}
          {members.map((m) => {
            const isMe = m.user_id === user.id;
            return (
              <Link
                key={m.user_id}
                to="/dm/$userId"
                params={{ userId: m.user_id }}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-2.5 rounded-xl px-2 py-2 transition
                  ${isMe ? "bg-hero/20" : "hover:bg-white/5 active:scale-[0.98]"}`}
              >
                <div className="relative h-9 w-9 shrink-0 rounded-full glass flex items-center justify-center text-lg">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={`${m.username} profile`} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    m.avatar_emoji
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-1">
                    {m.username}{isMe && <span className="text-[9px] text-muted-foreground">(you)</span>}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {m.is_anchor && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 text-amber-300 px-1.5 py-0.5 text-[8px] font-bold uppercase">
                        <Anchor size={7}/> Anchor
                      </span>
                    )}
                    {m.is_rj && !m.is_anchor && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-500/20 text-pink-300 px-1.5 py-0.5 text-[8px] font-bold uppercase">
                        <Radio size={7}/> RJ
                      </span>
                    )}
                    {!m.is_anchor && !m.is_rj && (
                      <span className="text-[10px] text-emerald-400/80">online</span>
                    )}
                  </div>
                </div>
                {!isMe && (
                  <MessageCircle size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition"/>
                )}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}


