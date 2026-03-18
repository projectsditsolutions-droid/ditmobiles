
-- Create shop_gst_profiles table for multiple GST identities per shop
CREATE TABLE public.shop_gst_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL DEFAULT '',
  gst_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_gst_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Shop members can view GST profiles"
  ON public.shop_gst_profiles FOR SELECT TO authenticated
  USING (is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop admins can insert GST profiles"
  ON public.shop_gst_profiles FOR INSERT TO authenticated
  WITH CHECK (is_shop_admin(auth.uid(), shop_id));

CREATE POLICY "Shop admins can update GST profiles"
  ON public.shop_gst_profiles FOR UPDATE TO authenticated
  USING (is_shop_admin(auth.uid(), shop_id));

CREATE POLICY "Shop admins can delete GST profiles"
  ON public.shop_gst_profiles FOR DELETE TO authenticated
  USING (is_shop_admin(auth.uid(), shop_id));

-- Add gst_profile_id to invoices to track which profile was used
ALTER TABLE public.invoices ADD COLUMN gst_profile_id UUID REFERENCES public.shop_gst_profiles(id);

-- Add columns to store the snapshot of profile used at billing time
ALTER TABLE public.invoices ADD COLUMN billing_business_name TEXT;
ALTER TABLE public.invoices ADD COLUMN billing_address TEXT;
ALTER TABLE public.invoices ADD COLUMN billing_phone TEXT;
ALTER TABLE public.invoices ADD COLUMN billing_gst_number TEXT;
