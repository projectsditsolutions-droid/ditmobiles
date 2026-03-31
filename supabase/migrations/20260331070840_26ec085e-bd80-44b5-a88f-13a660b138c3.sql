
-- Add financial year tracking columns
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS last_invoice_fy_start integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_gst_profiles ADD COLUMN IF NOT EXISTS last_invoice_fy_start integer NOT NULL DEFAULT 0;

-- Update get_next_invoice_number to auto-reset on FY change
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_shop_id uuid)
 RETURNS TABLE(invoice_number text, next_num integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next integer;
  v_prefix text;
  v_current_fy integer;
  v_stored_fy integer;
BEGIN
  -- Indian financial year: if month >= April, FY start = current year, else FY start = previous year
  v_current_fy := CASE WHEN EXTRACT(MONTH FROM now()) >= 4 THEN EXTRACT(YEAR FROM now())::integer ELSE (EXTRACT(YEAR FROM now()) - 1)::integer END;

  SELECT last_invoice_fy_start INTO v_stored_fy FROM public.shops WHERE id = p_shop_id;

  IF v_stored_fy IS NULL OR v_stored_fy < v_current_fy THEN
    -- Reset counter for new financial year
    UPDATE public.shops
    SET last_invoice_number = 1, last_invoice_fy_start = v_current_fy
    WHERE id = p_shop_id
    RETURNING last_invoice_number, invoice_prefix INTO v_next, v_prefix;
  ELSE
    UPDATE public.shops
    SET last_invoice_number = last_invoice_number + 1
    WHERE id = p_shop_id
    RETURNING last_invoice_number, invoice_prefix INTO v_next, v_prefix;
  END IF;

  RETURN QUERY SELECT
    (v_prefix || '-' || lpad(v_next::text, 4, '0'))::text AS invoice_number,
    v_next AS next_num;
END;
$function$;

-- Update get_next_profile_invoice_number to auto-reset on FY change
CREATE OR REPLACE FUNCTION public.get_next_profile_invoice_number(p_profile_id uuid)
 RETURNS TABLE(invoice_number text, next_num integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next integer;
  v_prefix text;
  v_type text;
  v_current_fy integer;
  v_stored_fy integer;
BEGIN
  v_current_fy := CASE WHEN EXTRACT(MONTH FROM now()) >= 4 THEN EXTRACT(YEAR FROM now())::integer ELSE (EXTRACT(YEAR FROM now()) - 1)::integer END;

  SELECT last_invoice_fy_start INTO v_stored_fy FROM public.shop_gst_profiles WHERE id = p_profile_id;

  IF v_stored_fy IS NULL OR v_stored_fy < v_current_fy THEN
    UPDATE public.shop_gst_profiles
    SET last_invoice_number = 1, last_invoice_fy_start = v_current_fy
    WHERE id = p_profile_id
    RETURNING last_invoice_number, invoice_prefix, profile_type INTO v_next, v_prefix, v_type;
  ELSE
    UPDATE public.shop_gst_profiles
    SET last_invoice_number = last_invoice_number + 1
    WHERE id = p_profile_id
    RETURNING last_invoice_number, invoice_prefix, profile_type INTO v_next, v_prefix, v_type;
  END IF;

  IF v_prefix = '' OR v_prefix IS NULL THEN
    v_prefix := CASE WHEN v_type = 'wholesale' THEN 'INV-W' ELSE 'INV-R' END;
  END IF;

  RETURN QUERY SELECT
    (v_prefix || '-' || lpad(v_next::text, 4, '0'))::text AS invoice_number,
    v_next AS next_num;
END;
$function$;
