
CREATE OR REPLACE FUNCTION public.normalize_product_brand()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.brand := INITCAP(TRIM(NEW.brand));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_product_brand
BEFORE INSERT OR UPDATE OF brand ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.normalize_product_brand();
