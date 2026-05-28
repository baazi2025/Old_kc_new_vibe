import type { Profile } from "@/hooks/useAuth";

export type AccountType = "guest" | "registered" | "prime" | "staff";

export const GUEST_GIFT_LIMIT = 500;
export const GUEST_DAILY_VOICE_LIMIT = 3;

type AccountProfile = Pick<Profile, "is_guest" | "role" | "account_type" | "guest_expires_at" | "guest_expired_at">;

export function accountTypeForProfile(profile?: AccountProfile | null): AccountType {
  if (profile?.role === "admin" || profile?.role === "moderator") return "staff";
  if (profile?.account_type === "prime") return "prime";
  if (profile?.account_type === "staff") return "staff";
  if (profile?.account_type === "guest") return "guest";
  if (profile?.account_type === "registered") return "registered";
  return profile?.is_guest ? "guest" : "registered";
}

export function accountBadge(profile?: AccountProfile | null) {
  const type = accountTypeForProfile(profile);
  if (type === "staff") return { icon: "🛡️", label: "Staff", className: "bg-sky-400/15 text-sky-200" };
  if (type === "prime") return { icon: "💎", label: "Prime", className: "bg-fuchsia-400/15 text-fuchsia-200" };
  if (type === "registered") return { icon: "✅", label: "Registered", className: "bg-emerald-400/15 text-emerald-200" };
  return { icon: "👤", label: "Guest", className: "bg-slate-400/15 text-slate-200" };
}

export function canRedeem(profile?: AccountProfile | null) {
  return accountTypeForProfile(profile) !== "guest";
}

export function canSendGift(profile: AccountProfile | null | undefined, price: number) {
  return accountTypeForProfile(profile) !== "guest" || price <= GUEST_GIFT_LIMIT;
}

export function guestVoiceCountKey(userId: string) {
  return `vibe-guest-voice-${userId}-${new Date().toISOString().slice(0, 10)}`;
}

export function guestExpiresIn(profile?: AccountProfile | null) {
  if (accountTypeForProfile(profile) !== "guest" || !profile?.guest_expires_at) return null;
  return new Date(profile.guest_expires_at).getTime() - Date.now();
}

export function guestExpiryText(profile?: AccountProfile | null) {
  const ms = guestExpiresIn(profile);
  if (ms === null) return null;
  if (ms <= 0 || profile?.guest_expired_at) return "Guest expired";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return days > 0 ? `Guest expires in ${days}d ${restHours}h` : `Guest expires in ${hours}h`;
}

export function guestUpgradeWarning(profile?: AccountProfile | null) {
  const ms = guestExpiresIn(profile);
  if (ms === null || !profile?.guest_expires_at) return null;
  if (ms <= 0 || profile.guest_expired_at) return "Guest access expired. Register to continue.";

  const createdAt = new Date(profile.guest_expires_at).getTime() - 96 * 60 * 60 * 1000;
  const ageHours = (Date.now() - createdAt) / (60 * 60 * 1000);
  const remainingHours = ms / (60 * 60 * 1000);

  if (remainingHours <= 6) {
    return "Guest access expires soon. Register to continue without losing progress.";
  }
  if (ageHours >= 48) {
    return "Your guest profile expires soon. Register now to keep your identity.";
  }
  if (ageHours >= 24) {
    return "Register to save your coins, gifts, and profile.";
  }
  return null;
}
