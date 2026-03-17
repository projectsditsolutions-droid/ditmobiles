
-- Create decrement_stock function used by POS billing
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.products 
  SET stock_quantity = GREATEST(0, stock_quantity - 1)
  WHERE id = p_product_id;
END;
$$;

-- Attach handle_new_user trigger to auth.users if not exists
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add unique constraint on imei_records.imei to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'imei_records_imei_key'
  ) THEN
    ALTER TABLE public.imei_records ADD CONSTRAINT imei_records_imei_key UNIQUE (imei);
  END IF;
END$$;
