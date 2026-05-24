
-- Messages: support voice notes
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

ALTER TABLE public.messages
  ALTER COLUMN text DROP NOT NULL;

-- Profiles: coins + badges
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_notes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_rj boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_anchor boolean NOT NULL DEFAULT false;

-- Reward function: 20 coins per voice note + badge unlocks
CREATE OR REPLACE FUNCTION public.reward_voice_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF NEW.kind = 'voice' THEN
    UPDATE public.profiles
       SET coins = coins + 20,
           voice_notes_count = voice_notes_count + 1
     WHERE id = NEW.user_id
     RETURNING voice_notes_count INTO new_count;

    IF new_count >= 10 THEN
      UPDATE public.profiles SET is_rj = true WHERE id = NEW.user_id AND is_rj = false;
    END IF;
    IF new_count >= 50 THEN
      UPDATE public.profiles SET is_anchor = true WHERE id = NEW.user_id AND is_anchor = false;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reward_voice_note ON public.messages;
CREATE TRIGGER trg_reward_voice_note
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.reward_voice_note();

-- Storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Voice notes are publicly readable" ON storage.objects;
CREATE POLICY "Voice notes are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "Users upload own voice notes" ON storage.objects;
CREATE POLICY "Users upload own voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own voice notes" ON storage.objects;
CREATE POLICY "Users delete own voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
