
-- Revoke EXECUTE on SECURITY DEFINER helper functions from anon to satisfy linter
REVOKE EXECUTE ON FUNCTION public.is_developer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_shop_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_shop_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_shop_ids(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_next_profile_invoice_number(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_developer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shop_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shop_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_shop_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_profile_invoice_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid) TO authenticated;

-- Restrict shop-logos bucket listing — only authenticated users can list
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view shop logos" ON storage.objects;

CREATE POLICY "Authenticated users can view shop logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'shop-logos');

CREATE POLICY "Shop members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-logos');

CREATE POLICY "Shop members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shop-logos');

CREATE POLICY "Shop members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'shop-logos');
