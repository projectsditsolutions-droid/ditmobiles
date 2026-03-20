-- Add billing_logo_url and billing_sub_heading columns to invoices for snapshot
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_logo_url text DEFAULT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_sub_heading text DEFAULT '';