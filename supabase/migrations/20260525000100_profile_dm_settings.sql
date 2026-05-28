ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS status_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS dm_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS username_color text,
  ADD COLUMN IF NOT EXISTS message_color text;

CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own blocks" ON public.blocked_users;
CREATE POLICY "Users read own blocks"
ON public.blocked_users FOR SELECT TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users insert own blocks" ON public.blocked_users;
CREATE POLICY "Users insert own blocks"
ON public.blocked_users FOR INSERT TO authenticated
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users delete own blocks" ON public.blocked_users;
CREATE POLICY "Users delete own blocks"
ON public.blocked_users FOR DELETE TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users send own DMs" ON public.dm_messages;
DROP POLICY IF EXISTS "Users send own DMs respecting privacy" ON public.dm_messages;
CREATE POLICY "Users send own DMs respecting privacy"
ON public.dm_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND sender_id <> recipient_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = recipient_id
      AND COALESCE(p.dm_enabled, true) = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE b.blocker_id = recipient_id
      AND b.blocked_id = sender_id
  )
);
