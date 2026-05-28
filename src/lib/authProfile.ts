import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";

type ProfileInput = {
  username?: string | null;
  display_name?: string | null;
  avatar_emoji?: string | null;
  gender?: string | null;
  dob?: string | null;
  mood_text?: string | null;
  status_text?: string | null;
  is_guest?: boolean;
};

function metadataFor(user: User): ProfileInput {
  const meta = user.user_metadata ?? {};
  return {
    username: typeof meta.username === "string" ? meta.username : null,
    display_name: typeof meta.display_name === "string" ? meta.display_name : null,
    avatar_emoji: typeof meta.avatar_emoji === "string" ? meta.avatar_emoji : null,
    gender: typeof meta.gender === "string" ? meta.gender : null,
    dob: typeof meta.dob === "string" ? meta.dob : null,
    mood_text: typeof meta.mood_text === "string" ? meta.mood_text : null,
    status_text: typeof meta.status_text === "string" ? meta.status_text : null,
    is_guest: Boolean(user.is_anonymous),
  };
}

export function profilePayloadForUser(user: User, input: ProfileInput = {}) {
  const merged = { ...metadataFor(user), ...input };
  const fallbackName = user.email?.split("@")[0] || `user_${user.id.slice(0, 6)}`;
  const username = (merged.username || merged.display_name || fallbackName).replace(/[<>@]/g, "").replace(/\s+/g, "_").slice(0, 24);
  const isGuest = merged.is_guest ?? Boolean(user.is_anonymous);
  const guestCreatedAt = isGuest ? new Date().toISOString() : null;

  return {
    id: user.id,
    username,
    display_name: merged.display_name || username,
    avatar_emoji: merged.avatar_emoji || "🧑",
    is_guest: isGuest,
    account_type: isGuest ? "guest" : "registered",
    guest_created_at: guestCreatedAt,
    guest_expires_at: isGuest ? new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString() : null,
    mood_text: merged.mood_text || null,
    status_text: merged.status_text || null,
    dm_enabled: true,
  };
}

function isSchemaColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  return message.includes("column") || message.includes("schema cache") || message.includes("could not find");
}

export async function ensureProfileForUser(user: User, input: ProfileInput = {}) {
  const payload = profilePayloadForUser(user, input);
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) return { profile: null, created: false, error: readError };
  if (existing) return { profile: existing as Profile, created: false, error: null };

  const { data, error } = await (supabase as any)
    .from("profiles")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error && isSchemaColumnError(error)) {
    const minimalPayload = {
      id: payload.id,
      username: payload.username,
      avatar_emoji: payload.avatar_emoji,
      is_guest: payload.is_guest,
    };
    const retry = await (supabase as any)
      .from("profiles")
      .insert(minimalPayload)
      .select("*")
      .maybeSingle();

    return {
      profile: (retry.data as Profile | null) ?? null,
      created: Boolean(retry.data && !retry.error),
      error: retry.error,
    };
  }

  return {
    profile: (data as Profile | null) ?? null,
    created: Boolean(data && !error),
    error,
  };
}
