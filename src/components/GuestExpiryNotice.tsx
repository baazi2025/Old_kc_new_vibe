import { Link } from "@tanstack/react-router";
import type { Profile } from "@/hooks/useAuth";
import { accountTypeForProfile, guestExpiresIn, guestExpiryText, guestUpgradeWarning } from "@/lib/account";

export function GuestExpiryNotice({ profile, compact = false }: { profile?: Profile | null; compact?: boolean }) {
  if (accountTypeForProfile(profile) !== "guest") return null;

  const warning = guestUpgradeWarning(profile);
  const countdown = guestExpiryText(profile);
  const urgent = (guestExpiresIn(profile) ?? Number.POSITIVE_INFINITY) <= 6 * 60 * 60 * 1000;

  return (
    <div className={`rounded-2xl border p-3 ${urgent ? "border-rose-300/30 bg-rose-400/12" : "border-amber-300/25 bg-amber-300/10"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-white">👤 Guest {countdown ? `· ${countdown}` : ""}</p>
          {!compact && warning && <p className="mt-1 text-xs font-bold leading-5 text-amber-100">{warning}</p>}
        </div>
        <Link
          to="/login"
          search={{ upgrade: "1" } as never}
          className="shrink-0 rounded-full bg-sky-500 px-3 py-2 text-[11px] font-black text-white shadow-lg shadow-sky-500/20"
        >
          Register & Save My Profile
        </Link>
      </div>
      {compact && warning && <p className="mt-2 text-[11px] font-bold leading-5 text-amber-100">{warning}</p>}
    </div>
  );
}
