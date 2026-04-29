ALTER TABLE public.shops REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_payments REPLICA IDENTITY FULL;
ALTER TABLE public.shop_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'shops'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shops;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'maintenance_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_payments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'shop_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_settings;
  END IF;
END $$;