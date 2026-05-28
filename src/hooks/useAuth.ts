import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { claimDailyLoginReward } from "@/lib/rewards";
import { ensureProfileForUser } from "@/lib/authProfile";

export type Profile = {
  id: string;
  username: string;
  avatar_emoji: string;
  avatar_url?: string | null;
  avatar_path?: string | null;
  is_guest: boolean;
  account_type?: "guest" | "registered" | "prime" | "staff" | null;
  guest_created_at?: string | null;
  guest_expires_at?: string | null;
  guest_expired_at?: string | null;
  upgraded_from_guest_at?: string | null;
  created_at?: string;
  display_name?: string | null;
  bio?: string | null;
  status_text?: string | null;
  dm_enabled?: boolean | null;
  dm_disabled_by_admin?: boolean | null;
  role?: "admin" | "moderator" | "user" | null;
  is_banned?: boolean | null;
  muted_until?: string | null;
  banned_until?: string | null;
  mood_text?: string | null;
  username_color?: string | null;
  message_color?: string | null;
  coins?: number;
  voice_notes_count?: number;
  reward_rank?: string | null;
  rj_tag?: string | null;
  daily_streak?: number | null;
  night_streak?: number | null;
  featured_gift_transaction_id?: string | null;
  is_rj?: boolean;
  is_anchor?: boolean;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const debugAuth = (label: string, value?: unknown) => {
      console.info(`[auth:${label}]`, value ?? "");
    };

    const applySession = (s: Session | null, source: string) => {
      if (!alive) return;
      debugAuth(source, {
        hasSession: Boolean(s),
        userId: s?.user?.id ?? null,
        expiresAt: s?.expires_at ?? null,
      });
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer profile fetch to avoid recursive deadlocks
        setTimeout(() => fetchProfile(s.user), 0);
        setTimeout(() => claimDailyLoginReward().then((awarded) => {
          if (awarded) fetchProfile(s.user);
        }), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      debugAuth("state-change", event);
      applySession(s, event);
    });

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session, "initial-session");
    }).catch((error) => {
      console.error("[auth:initial-session-error]", error);
      if (alive) setLoading(false);
    });

    const refreshOnVisible = () => {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data }) => applySession(data.session, "visibility-refresh"));
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", refreshOnVisible);
    }

    return () => {
      alive = false;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", refreshOnVisible);
      }
      sub.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(authUser: User) {
    await (supabase as any).rpc("cleanup_expired_guests");
    const { data: accessValid } = await (supabase as any).rpc("validate_guest_access");
    if (accessValid === false) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    console.info("[auth:profile]", { id: authUser.id, found: Boolean(data), error: error?.message ?? null });
    if (data) {
      setProfile(data as Profile);
      return;
    }
    if (error) return;

    const fallback = await ensureProfileForUser(authUser);
    console.info("[auth:profile-fallback]", {
      id: authUser.id,
      created: fallback.created,
      error: fallback.error?.message ?? null,
    });
    if (fallback.profile) setProfile(fallback.profile);
  }

  return { session, user, profile, loading, signOut: () => supabase.auth.signOut() };
}
