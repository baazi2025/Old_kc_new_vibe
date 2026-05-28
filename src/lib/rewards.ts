import { supabase } from "@/integrations/supabase/client";

export const COINS_PER_RUPEE = 500;

export function couponValueFromCoins(coins = 0) {
  return Math.floor(coins / COINS_PER_RUPEE);
}

export function formatCouponValue(coins = 0) {
  return `₹${couponValueFromCoins(coins).toLocaleString("en-IN")}`;
}

export async function claimDailyLoginReward() {
  const { data, error } = await (supabase as any).rpc("claim_daily_login_reward");
  if (error) {
    console.warn("[rewards:daily-login]", error.message);
    return false;
  }
  return Boolean(data);
}

export async function claimProfileCompletionReward() {
  const { data, error } = await (supabase as any).rpc("claim_profile_completion_reward");
  if (error) {
    console.warn("[rewards:profile-completion]", error.message);
    return false;
  }
  return Boolean(data);
}

export async function requestRedemption(coupon: string, coins: number, note = "") {
  return (supabase as any).rpc("request_redemption", {
    coupon,
    coins_value: coins,
    note,
  });
}

export async function reviewRedemption(id: string, status: "approved" | "rejected", note = "") {
  return (supabase as any).rpc("review_redemption", {
    request_id: id,
    next_status: status,
    note,
  });
}
