
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS sub_heading text NOT NULL DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS warranty_mobile text NOT NULL DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS warranty_accessories text NOT NULL DEFAULT '';
