import { supabase } from "@/integrations/supabase/client";

export function cleanUsername(value: string, max = 24) {
  return value.replace(/[<>@]/g, "").replace(/\s+/g, "_").trim().slice(0, max);
}

export async function usernameExists(username: string) {
  const clean = cleanUsername(username).toLowerCase();
  if (!clean) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", clean)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function ensureUsernameAvailable(username: string) {
  const clean = cleanUsername(username);
  if (clean.length < 2) return { ok: false, username: clean, message: "Please enter your name" };
  const exists = await usernameExists(clean);
  if (exists) {
    return {
      ok: false,
      username: clean,
      message: "This user ID is already registered. Please choose another name or add your own suffix.",
    };
  }
  return { ok: true, username: clean, message: "" };
}
