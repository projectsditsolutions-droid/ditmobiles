-- Atomic invoice number increment for shop (prevents duplicates under concurrent requests)
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_shop_id uuid)
RETURNS TABLE(invoice_number text, next_num integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_prefix text;
BEGIN
  UPDATE public.shops
  SET last_invoice_number = last_invoice_number + 1
  WHERE id = p_shop_id
  RETURNING last_invoice_number, invoice_prefix
    INTO v_next, v_prefix;

  RETURN QUERY SELECT
    (v_prefix || '-' || lpad(v_next::text, 4, '0'))::text AS invoice_number,
    v_next AS next_num;
END;
$$;

-- Atomic invoice number increment for GST profile (prevents duplicates under concurrent requests)
CREATE OR REPLACE FUNCTION public.get_next_profile_invoice_number(p_profile_id uuid)
RETURNS TABLE(invoice_number text, next_num integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_prefix text;
  v_type text;
BEGIN
  UPDATE public.shop_gst_profiles
  SET last_invoice_number = last_invoice_number + 1
  WHERE id = p_profile_id
  RETURNING last_invoice_number, invoice_prefix, profile_type
    INTO v_next, v_prefix, v_type;

  IF v_prefix = '' OR v_prefix IS NULL THEN
    v_prefix := CASE WHEN v_type = 'wholesale' THEN 'INV-W' ELSE 'INV-R' END;
  END IF;

  RETURN QUERY SELECT
    (v_prefix || '-' || lpad(v_next::text, 4, '0'))::text AS invoice_number,
    v_next AS next_num;
END;
$$;
