
-- User roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Shops table
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  gst_number TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  terms_and_conditions TEXT[] DEFAULT ARRAY[
    'வாங்கிய பொருள் மாற்றம் / பணம் திருப்பம் இல்லை',
    'பில் இல்லாமல் மாற்றம் செய்ய முடியாது',
    '2 நாட்களுக்குள் மட்டும் மாற்றம்',
    'தொழில்நுட்ப குறைபாடு மட்டும் மாற்றம்',
    'IMEI பொருந்த வேண்டும்',
    'சேதமடைந்த பொருளுக்கு கடை பொறுப்பல்ல'
  ],
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  last_invoice_number INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Shop memberships (user <-> shop with role)
CREATE TABLE public.shop_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_id)
);
ALTER TABLE public.shop_memberships ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 18,
  category TEXT NOT NULL DEFAULT 'mobile' CHECK (category IN ('mobile', 'accessory', 'other')),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- IMEI records
CREATE TABLE public.imei_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imei TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  dealer_id UUID,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned')),
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_date TIMESTAMPTZ,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imei_records ENABLE ROW LEVEL SECURITY;

-- Dealers table
CREATE TABLE public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  brand_name TEXT NOT NULL DEFAULT '',
  dealer_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  total_credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;

-- Dealer transactions
CREATE TABLE public.dealer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'payment', 'sale_deduction', 'stock_return')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  invoice_ref TEXT,
  imei_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_transactions ENABLE ROW LEVEL SECURITY;

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_gst TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  bill_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  bill_discount_type TEXT NOT NULL DEFAULT 'flat' CHECK (bill_discount_type IN ('percentage', 'flat')),
  cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'mixed')),
  payment_details JSONB,
  is_gst_bill BOOLEAN NOT NULL DEFAULT true,
  gst_bearer TEXT NOT NULL DEFAULT 'customer' CHECK (gst_bearer IN ('customer', 'seller')),
  print_type TEXT NOT NULL DEFAULT 'thermal' CHECK (print_type IN ('thermal', 'a4')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Invoice items
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  imei TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'flat' CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Shop settings
CREATE TABLE public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL UNIQUE,
  discount_enabled BOOLEAN NOT NULL DEFAULT true,
  default_gst_percent NUMERIC(5,2) NOT NULL DEFAULT 18,
  thermal_width TEXT NOT NULL DEFAULT '80mm' CHECK (thermal_width IN ('58mm', '80mm')),
  default_print_type TEXT NOT NULL DEFAULT 'thermal' CHECK (default_print_type IN ('thermal', 'a4')),
  pin_code TEXT NOT NULL DEFAULT '1234',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Helper: get user's shop memberships
CREATE OR REPLACE FUNCTION public.get_user_shop_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM public.shop_memberships WHERE user_id = _user_id
$$;

-- Helper: check shop membership
CREATE OR REPLACE FUNCTION public.is_shop_member(_user_id UUID, _shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_memberships
    WHERE user_id = _user_id AND shop_id = _shop_id
  )
$$;

-- Helper: check if user is admin of a shop
CREATE OR REPLACE FUNCTION public.is_shop_admin(_user_id UUID, _shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_memberships
    WHERE user_id = _user_id AND shop_id = _shop_id AND role = 'admin'
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Give first user admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shop_settings_updated_at BEFORE UPDATE ON public.shop_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Shops
CREATE POLICY "Members can view their shops" ON public.shops FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), id) OR created_by = auth.uid());
CREATE POLICY "Admins can create shops" ON public.shops FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Shop admins can update" ON public.shops FOR UPDATE TO authenticated USING (public.is_shop_admin(auth.uid(), id));
CREATE POLICY "Shop admins can delete" ON public.shops FOR DELETE TO authenticated USING (public.is_shop_admin(auth.uid(), id));

-- Shop memberships
CREATE POLICY "Members can view memberships" ON public.shop_memberships FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id) OR user_id = auth.uid());
CREATE POLICY "Admins can manage memberships" ON public.shop_memberships FOR INSERT TO authenticated WITH CHECK (public.is_shop_admin(auth.uid(), shop_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update memberships" ON public.shop_memberships FOR UPDATE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));
CREATE POLICY "Admins can delete memberships" ON public.shop_memberships FOR DELETE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id) OR user_id = auth.uid());

-- Products
CREATE POLICY "Shop members can view products" ON public.products FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));
CREATE POLICY "Shop admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));

-- IMEI records
CREATE POLICY "Shop members can view IMEIs" ON public.imei_records FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can insert IMEIs" ON public.imei_records FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can update IMEIs" ON public.imei_records FOR UPDATE TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can delete IMEIs" ON public.imei_records FOR DELETE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));

-- Dealers
CREATE POLICY "Shop members can view dealers" ON public.dealers FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can insert dealers" ON public.dealers FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can update dealers" ON public.dealers FOR UPDATE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));
CREATE POLICY "Shop admins can delete dealers" ON public.dealers FOR DELETE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));

-- Dealer transactions
CREATE POLICY "Shop members can view txns" ON public.dealer_transactions FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can insert txns" ON public.dealer_transactions FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can update txns" ON public.dealer_transactions FOR UPDATE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));
CREATE POLICY "Shop admins can delete txns" ON public.dealer_transactions FOR DELETE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));

-- Invoices
CREATE POLICY "Shop members can view invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can create invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id) OR user_id = auth.uid());
CREATE POLICY "Shop admins can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));

-- Invoice items
CREATE POLICY "View invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_shop_member(auth.uid(), i.shop_id))
);
CREATE POLICY "Create invoice items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_shop_member(auth.uid(), i.shop_id))
);
CREATE POLICY "Update invoice items" ON public.invoice_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (public.is_shop_admin(auth.uid(), i.shop_id) OR i.user_id = auth.uid()))
);
CREATE POLICY "Delete invoice items" ON public.invoice_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_shop_admin(auth.uid(), i.shop_id))
);

-- Shop settings
CREATE POLICY "Shop members can view settings" ON public.shop_settings FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop admins can insert settings" ON public.shop_settings FOR INSERT TO authenticated WITH CHECK (public.is_shop_admin(auth.uid(), shop_id));
CREATE POLICY "Shop admins can update settings" ON public.shop_settings FOR UPDATE TO authenticated USING (public.is_shop_admin(auth.uid(), shop_id));

-- Indexes for performance
CREATE INDEX idx_products_shop_id ON public.products(shop_id);
CREATE INDEX idx_imei_records_shop_id ON public.imei_records(shop_id);
CREATE INDEX idx_imei_records_imei ON public.imei_records(imei);
CREATE INDEX idx_imei_records_product_id ON public.imei_records(product_id);
CREATE INDEX idx_imei_records_status ON public.imei_records(status);
CREATE INDEX idx_dealers_shop_id ON public.dealers(shop_id);
CREATE INDEX idx_dealer_transactions_dealer_id ON public.dealer_transactions(dealer_id);
CREATE INDEX idx_invoices_shop_id ON public.invoices(shop_id);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_shop_memberships_user_id ON public.shop_memberships(user_id);
CREATE INDEX idx_shop_memberships_shop_id ON public.shop_memberships(shop_id);
