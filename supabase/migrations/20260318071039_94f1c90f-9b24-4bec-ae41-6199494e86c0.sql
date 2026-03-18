
-- Add profile_type (retail/wholesale) and per-profile invoice numbering to shop_gst_profiles
ALTER TABLE public.shop_gst_profiles
  ADD COLUMN IF NOT EXISTS profile_type text NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS invoice_prefix text NOT NULL DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS last_invoice_number integer NOT NULL DEFAULT 0;

-- Add a constraint check for valid profile types
ALTER TABLE public.shop_gst_profiles
  DROP CONSTRAINT IF EXISTS shop_gst_profiles_profile_type_check;
ALTER TABLE public.shop_gst_profiles
  ADD CONSTRAINT shop_gst_profiles_profile_type_check 
  CHECK (profile_type IN ('retail', 'wholesale'));
