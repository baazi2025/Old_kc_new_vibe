import { supabase } from "@/integrations/supabase/client";

export type GiftCatalogItem = {
  id: string;
  emoji: string;
  name: string;
  price: number;
  meaning: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

export type GiftTransaction = {
  id: string;
  gift_id: string;
  sender_id: string;
  receiver_id: string;
  room_id: string;
  message: string;
  public_announce: boolean;
  coins_spent: number;
  removed_by_admin: boolean;
  removed_reason?: string | null;
  created_at: string;
};

export type GiftNotification = {
  id: string;
  gift_transaction_id: string;
  user_id: string;
  read_at?: string | null;
  created_at: string;
};

export function cleanGiftMessage(value: string) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function sendVirtualGift(params: {
  receiverId: string;
  giftId: string;
  message?: string;
  announce?: boolean;
  roomId?: string;
}) {
  return (supabase as any).rpc("send_virtual_gift", {
    receiver: params.receiverId,
    gift: params.giftId,
    gift_message: cleanGiftMessage(params.message ?? ""),
    announce: params.announce ?? true,
    room: params.roomId ?? "friends",
  });
}

export async function setFeaturedGift(transactionId: string) {
  return (supabase as any).rpc("set_featured_gift", {
    transaction_id: transactionId,
  });
}

export async function adminRemoveGiftTransaction(transactionId: string, reason = "") {
  return (supabase as any).rpc("admin_remove_gift_transaction", {
    transaction_id: transactionId,
    reason: cleanGiftMessage(reason),
  });
}
