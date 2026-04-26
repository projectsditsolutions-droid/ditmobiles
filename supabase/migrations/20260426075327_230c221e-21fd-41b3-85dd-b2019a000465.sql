-- 1. Add yearly maintenance charge amount to shop_settings
ALTER TABLE public.shop_settings
ADD COLUMN IF NOT EXISTS yearly_maintenance_charge numeric NOT NULL DEFAULT 1500;

-- 2. Create maintenance payments table
CREATE TABLE IF NOT EXISTS public.maintenance_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL,
  fy_year integer NOT NULL, -- e.g. 2026 means FY Apr 2026 - Mar 2027
  amount numeric NOT NULL DEFAULT 1500,
  payment_method text NOT NULL DEFAULT 'cash',
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text NOT NULL DEFAULT '',
  paid_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, fy_year)
);

ALTER TABLE public.maintenance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view maintenance payments"
ON public.maintenance_payments FOR SELECT TO authenticated
USING (is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop admins can insert maintenance payments"
ON public.maintenance_payments FOR INSERT TO authenticated
WITH CHECK (is_shop_admin(auth.uid(), shop_id));

CREATE POLICY "Shop admins can update maintenance payments"
ON public.maintenance_payments FOR UPDATE TO authenticated
USING (is_shop_admin(auth.uid(), shop_id));

CREATE POLICY "Shop admins can delete maintenance payments"
ON public.maintenance_payments FOR DELETE TO authenticated
USING (is_shop_admin(auth.uid(), shop_id));

CREATE INDEX IF NOT EXISTS idx_maintenance_payments_shop_fy
ON public.maintenance_payments(shop_id, fy_year DESC);