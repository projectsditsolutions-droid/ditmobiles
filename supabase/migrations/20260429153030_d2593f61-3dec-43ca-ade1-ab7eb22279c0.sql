CREATE TABLE IF NOT EXISTS public.shop_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  paid_method text NOT NULL DEFAULT '',
  paid_notes text NOT NULL DEFAULT '',
  due_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_charges_shop ON public.shop_charges(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_charges_paid ON public.shop_charges(is_paid);

ALTER TABLE public.shop_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view charges"
  ON public.shop_charges FOR SELECT TO authenticated
  USING (is_shop_member(auth.uid(), shop_id) OR is_developer(auth.uid()));

CREATE POLICY "Only developer can insert charges"
  ON public.shop_charges FOR INSERT TO authenticated
  WITH CHECK (is_developer(auth.uid()));

CREATE POLICY "Only developer can update charges"
  ON public.shop_charges FOR UPDATE TO authenticated
  USING (is_developer(auth.uid()));

CREATE POLICY "Only developer can delete charges"
  ON public.shop_charges FOR DELETE TO authenticated
  USING (is_developer(auth.uid()));

CREATE TRIGGER shop_charges_updated_at
  BEFORE UPDATE ON public.shop_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shop_charges REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'shop_charges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_charges;
  END IF;
END $$;