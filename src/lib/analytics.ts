import { supabase } from "@/integrations/supabase/client";

const VISITOR_ID_KEY = "kc_visitor_id";
const VISIT_THROTTLE_KEY = "kc_last_visit_event";
const VISIT_THROTTLE_MS = 5 * 60 * 1000;

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getVisitorId() {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const visitorId = createVisitorId();
  window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
  return visitorId;
}

function getBrowserRegion() {
  if (typeof window === "undefined") {
    return {
      country: "Unknown",
      region: "Unknown",
      city: null,
      timezone: "Unknown",
      locale: "Unknown",
      userAgent: null,
      referrer: null,
    };
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  const locale = navigator.language || "Unknown";
  const localeCountry = locale.includes("-") ? locale.split("-").pop()?.toUpperCase() : null;
  const timezoneCountry = timezone.includes("/") ? timezone.split("/")[0] : null;

  return {
    country: localeCountry || timezoneCountry || "Unknown",
    region: timezone,
    city: null,
    timezone,
    locale,
    userAgent: navigator.userAgent,
    referrer: document.referrer || null,
  };
}

function shouldTrack(path: string, userId?: string | null) {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const lastRaw = window.sessionStorage.getItem(VISIT_THROTTLE_KEY);
  if (!lastRaw) {
    window.sessionStorage.setItem(
      VISIT_THROTTLE_KEY,
      JSON.stringify({ path, userId, at: now }),
    );
    return true;
  }

  try {
    const last = JSON.parse(lastRaw) as { path?: string; userId?: string | null; at?: number };
    const samePage = last.path === path && last.userId === userId;
    const tooSoon = typeof last.at === "number" && now - last.at < VISIT_THROTTLE_MS;
    if (samePage && tooSoon) return false;
  } catch {
    // Bad session data should not block analytics.
  }

  window.sessionStorage.setItem(
    VISIT_THROTTLE_KEY,
    JSON.stringify({ path, userId, at: now }),
  );
  return true;
}

export async function trackVisit(path: string, userId?: string | null, roomId?: string | null) {
  if (!shouldTrack(path, userId)) return;

  const region = getBrowserRegion();
  const payload = {
    visitor_id: getVisitorId(),
    user_id: userId ?? null,
    path,
    event_type: "page_view",
    room_id: roomId ?? null,
    country: region.country,
    region: region.region,
    city: region.city,
    timezone: region.timezone,
    locale: region.locale,
    user_agent: region.userAgent,
    referrer: region.referrer,
  };

  const { error } = await supabase.from("visitor_events").insert(payload);
  if (error) {
    console.warn("[analytics:visit:error]", error.message);
    return;
  }
  console.info("[analytics:visit]", { path, userId: userId ?? null, roomId: roomId ?? null });
}
