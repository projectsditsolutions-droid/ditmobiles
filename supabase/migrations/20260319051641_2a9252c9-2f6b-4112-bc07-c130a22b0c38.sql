
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  total_purchases numeric NOT NULL DEFAULT 0,
  last_purchase_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view customers" ON public.customers
  FOR SELECT TO authenticated USING (is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop admins can delete customers" ON public.customers
  FOR DELETE TO authenticated USING (is_shop_admin(auth.uid(), shop_id));

-- Add customer_id to invoices for linking
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

-- Add customer_address to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_address text DEFAULT '';
