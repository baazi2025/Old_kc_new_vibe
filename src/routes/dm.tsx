import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BottomNav } from "@/components/BottomNav";
import { OnlineMembersPanel } from "@/components/OnlineMembersPanel";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";

export const Route = createFileRoute("/dm")({
  head: () => ({ meta: [{ title: "Direct Messages — Vibe Malayali" }] }),
  component: DMList,
});

type Row = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string | null;
  kind: string;
  created_at: string;
};

function DMList() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [convos, setConvos] = useState<{ peer: Profile; last: Row }[]>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("dm_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      const rows = (data ?? []) as Row[];
      const byPeer = new Map<string, Row>();
      for (const r of rows) {
        const peer = r.sender_id === user.id ? r.recipient_id : r.sender_id;
        if (!byPeer.has(peer)) byPeer.set(peer, r);
      }
      const peerIds = [...byPeer.keys()];
      if (peerIds.length === 0) { setConvos([]); return; }
      const { data: profs } = await supabase.from("profiles").select("*").in("id", peerIds);
      const profMap = new Map((profs ?? []).map((p: Profile) => [p.id, p]));
      setConvos(peerIds.map((id) => ({ peer: profMap.get(id)!, last: byPeer.get(id)! })).filter((x) => x.peer));
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="relative min-h-screen grid-bg lg:pl-[72px]">
      <AmbientOrbs />
      <header className="sticky top-0 z-30 glass-strong">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button onClick={() => history.back()} className="rounded-full glass p-2"><ArrowLeft size={16}/></button>
          <p className="text-sm font-bold flex items-center gap-1.5"><MessageCircle size={16}/> Direct Messages</p>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pt-4 pb-32 lg:pr-[300px]">
        {convos.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-16">
            <p>No private chats yet.</p>
            <p className="mt-1">Tap a member from the online panel to start a DM ✨</p>
          </div>
        ) : (
          <div className="space-y-2">
            {convos.map(({ peer, last }) => (
              <Link
                key={peer.id}
                to="/dm/$userId"
                params={{ userId: peer.id }}
                className="flex items-center gap-3 glass rounded-2xl p-3 active:scale-[0.98] transition"
              >
                <div className="h-11 w-11 rounded-full glass-strong flex items-center justify-center text-xl">{peer.avatar_emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{peer.username}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {last.kind === "voice" ? "🎙️ Voice note" : last.text}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(last.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <OnlineMembersPanel />
      <BottomNav />
    </div>
  );
}
