-- 1. Create trigger function to auto-sync stock_quantity from actual IMEI count
CREATE OR REPLACE FUNCTION public.sync_product_stock_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_product_id uuid;
BEGIN
  -- Determine which product_id to update
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new product if product_id changed
    IF OLD.product_id IS DISTINCT FROM NEW.product_id THEN
      UPDATE public.products
      SET stock_quantity = (
        SELECT count(*) FROM public.imei_records
        WHERE product_id = OLD.product_id AND status = 'in_stock'
      )
      WHERE id = OLD.product_id;
    END IF;
    target_product_id := NEW.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;

  -- Recount and sync
  UPDATE public.products
  SET stock_quantity = (
    SELECT count(*) FROM public.imei_records
    WHERE product_id = target_product_id AND status = 'in_stock'
  )
  WHERE id = target_product_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 2. Attach trigger to imei_records table
CREATE TRIGGER trg_sync_stock_quantity
AFTER INSERT OR UPDATE OR DELETE ON public.imei_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_quantity();

-- 3. One-time fix: sync all existing products to their actual in-stock IMEI count
UPDATE public.products p
SET stock_quantity = (
  SELECT count(*) FROM public.imei_records ir
  WHERE ir.product_id = p.id AND ir.status = 'in_stock'
);