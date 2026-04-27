-- 1. Assign developer role to utcreators@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('ae7e67fa-a9d9-4d63-80c1-850d18890cb1', 'developer')
ON CONFLICT DO NOTHING;

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.is_developer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'developer'
  )
$$;

-- 3. Lock down shop_settings.yearly_maintenance_charge
-- Replace shop_settings UPDATE policy: shop admins can update OTHER fields, but only developer can change yearly_maintenance_charge.
-- Approach: keep admin update policy as-is for general settings, but add a trigger that blocks non-developers from changing yearly_maintenance_charge.
CREATE OR REPLACE FUNCTION public.guard_yearly_maintenance_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.yearly_maintenance_charge IS DISTINCT FROM OLD.yearly_maintenance_charge THEN
    IF NOT public.is_developer(auth.uid()) THEN
      RAISE EXCEPTION 'Only the developer can change yearly maintenance charge';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_maintenance_charge_amount ON public.shop_settings;
CREATE TRIGGER guard_maintenance_charge_amount
BEFORE UPDATE ON public.shop_settings
FOR EACH ROW
EXECUTE FUNCTION public.guard_yearly_maintenance_charge();

-- 4. Lock maintenance_payments insert/update/delete to developer only
DROP POLICY IF EXISTS "Shop admins can insert maintenance payments" ON public.maintenance_payments;
DROP POLICY IF EXISTS "Shop admins can update maintenance payments" ON public.maintenance_payments;
DROP POLICY IF EXISTS "Shop admins can delete maintenance payments" ON public.maintenance_payments;

CREATE POLICY "Only developer can insert maintenance payments"
ON public.maintenance_payments
FOR INSERT TO authenticated
WITH CHECK (public.is_developer(auth.uid()));

CREATE POLICY "Only developer can update maintenance payments"
ON public.maintenance_payments
FOR UPDATE TO authenticated
USING (public.is_developer(auth.uid()));

CREATE POLICY "Only developer can delete maintenance payments"
ON public.maintenance_payments
FOR DELETE TO authenticated
USING (public.is_developer(auth.uid()));