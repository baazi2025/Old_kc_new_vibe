
-- Confessions table
CREATE TABLE public.confessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  mood TEXT NOT NULL DEFAULT 'secret' CHECK (mood IN ('crush','compliment','secret','emotional')),
  reveal_identity BOOLEAN NOT NULL DEFAULT false,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confessions readable by authenticated"
  ON public.confessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own confessions"
  ON public.confessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors delete own confessions"
  ON public.confessions FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE INDEX idx_confessions_created ON public.confessions (created_at DESC);

-- Likes table
CREATE TABLE public.confession_likes (
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (confession_id, user_id)
);

ALTER TABLE public.confession_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes readable by authenticated"
  ON public.confession_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users like as themselves"
  ON public.confession_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unlike own"
  ON public.confession_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Maintain like_count via trigger
CREATE OR REPLACE FUNCTION public.bump_confession_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.confessions SET like_count = like_count + 1 WHERE id = NEW.confession_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.confessions SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.confession_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_confession_likes_count
AFTER INSERT OR DELETE ON public.confession_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_confession_like_count();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.confession_likes;
