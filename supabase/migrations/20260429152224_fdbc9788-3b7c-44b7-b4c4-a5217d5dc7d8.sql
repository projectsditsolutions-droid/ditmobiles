-- invoice_items.product_id: cascade so deleting a product (or its parent shop) doesn't fail
ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- invoices.customer_id: when a customer is deleted, just null it out on the invoice
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- invoices.gst_profile_id: when a GST profile is deleted, null it out on the invoice
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_gst_profile_id_fkey;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_gst_profile_id_fkey
  FOREIGN KEY (gst_profile_id) REFERENCES public.shop_gst_profiles(id) ON DELETE SET NULL;