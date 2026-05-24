CREATE TABLE public.dm_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  text text,
  audio_url text,
  duration_ms integer,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_pair ON public.dm_messages (
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);
CREATE INDEX idx_dm_recipient ON public.dm_messages (recipient_id, created_at DESC);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DMs readable by participants"
ON public.dm_messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users send own DMs"
ON public.dm_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users delete own DMs"
ON public.dm_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark read"
ON public.dm_messages FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;