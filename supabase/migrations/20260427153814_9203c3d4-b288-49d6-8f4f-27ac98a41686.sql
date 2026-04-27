-- 1. New shop fields
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS yearly_fee numeric NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS suspended_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- 2. All existing shops -> auto approved
UPDATE public.shops SET approval_status = 'approved', approved_at = now() WHERE approval_status = 'pending';

-- 3. Backfill yearly_fee from shop_settings
UPDATE public.shops s
SET yearly_fee = ss.yearly_maintenance_charge
FROM public.shop_settings ss
WHERE ss.shop_id = s.id AND s.yearly_fee = 1500 AND ss.yearly_maintenance_charge IS NOT NULL;

-- 4. Developer-wide RLS additions

-- Shops: developer sees & manages all
DROP POLICY IF EXISTS "Developer can view all shops" ON public.shops;
CREATE POLICY "Developer can view all shops"
ON public.shops FOR SELECT TO authenticated
USING (public.is_developer(auth.uid()));

DROP POLICY IF EXISTS "Developer can update all shops" ON public.shops;
CREATE POLICY "Developer can update all shops"
ON public.shops FOR UPDATE TO authenticated
USING (public.is_developer(auth.uid()));

DROP POLICY IF EXISTS "Developer can delete all shops" ON public.shops;
CREATE POLICY "Developer can delete all shops"
ON public.shops FOR DELETE TO authenticated
USING (public.is_developer(auth.uid()));

-- Memberships: developer sees & manages all
DROP POLICY IF EXISTS "Developer can view all memberships" ON public.shop_memberships;
CREATE POLICY "Developer can view all memberships"
ON public.shop_memberships FOR SELECT TO authenticated
USING (public.is_developer(auth.uid()));

DROP POLICY IF EXISTS "Developer can manage all memberships" ON public.shop_memberships;
CREATE POLICY "Developer can manage all memberships"
ON public.shop_memberships FOR INSERT TO authenticated
WITH CHECK (public.is_developer(auth.uid()));

DROP POLICY IF EXISTS "Developer can update all memberships" ON public.shop_memberships;
CREATE POLICY "Developer can update all memberships"
ON public.shop_memberships FOR UPDATE TO authenticated
USING (public.is_developer(auth.uid()));

DROP POLICY IF EXISTS "Developer can delete all memberships" ON public.shop_memberships;
CREATE POLICY "Developer can delete all memberships"
ON public.shop_memberships FOR DELETE TO authenticated
USING (public.is_developer(auth.uid()));

-- Profiles: developer sees all
DROP POLICY IF EXISTS "Developer can view all profiles" ON public.profiles;
CREATE POLICY "Developer can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_developer(auth.uid()));

-- User roles: developer can manage all
DROP POLICY IF EXISTS "Developer can manage roles" ON public.user_roles;
CREATE POLICY "Developer can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_developer(auth.uid()))
WITH CHECK (public.is_developer(auth.uid()));

-- Maintenance payments: developer sees ALL shops payments
DROP POLICY IF EXISTS "Developer can view all maintenance payments" ON public.maintenance_payments;
CREATE POLICY "Developer can view all maintenance payments"
ON public.maintenance_payments FOR SELECT TO authenticated
USING (public.is_developer(auth.uid()));

-- 5. Existing shop visibility — pending shops only visible to creator + developer
DROP POLICY IF EXISTS "Members can view their shops" ON public.shops;
CREATE POLICY "Members can view their shops"
ON public.shops FOR SELECT TO authenticated
USING (
  public.is_developer(auth.uid())
  OR (created_by = auth.uid())
  OR (approval_status = 'approved' AND public.is_shop_member(auth.uid(), id))
);

-- 6. Allow any authenticated user to create a shop (will be 'pending')
DROP POLICY IF EXISTS "Admins can create shops" ON public.shops;
CREATE POLICY "Authenticated users can create shops"
ON public.shops FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 7. New approval/suspend trigger guard (only developer can flip status fields)
CREATE OR REPLACE FUNCTION public.guard_shop_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.approval_status IS DISTINCT FROM OLD.approval_status
      OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
      OR NEW.yearly_fee IS DISTINCT FROM OLD.yearly_fee
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by) THEN
    IF NOT public.is_developer(auth.uid()) THEN
      RAISE EXCEPTION 'Only the developer can change shop approval, suspension, or yearly fee';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_shop_admin_changes ON public.shops;
CREATE TRIGGER guard_shop_admin_changes
BEFORE UPDATE ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.guard_shop_admin_fields();

-- 8. Auto-create membership for shop creator (so they see their pending shop)
CREATE OR REPLACE FUNCTION public.auto_membership_on_shop_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.shop_memberships (user_id, shop_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_membership_after_shop_insert ON public.shops;
CREATE TRIGGER auto_membership_after_shop_insert
AFTER INSERT ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.auto_membership_on_shop_create();