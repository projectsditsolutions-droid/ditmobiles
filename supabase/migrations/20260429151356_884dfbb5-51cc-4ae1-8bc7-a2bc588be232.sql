UPDATE public.imei_records ir
SET status = 'sold',
    invoice_id = ii.invoice_id,
    sold_date = i.date,
    sale_price = ii.unit_price
FROM public.invoice_items ii
JOIN public.invoices i ON i.id = ii.invoice_id
WHERE ir.imei = ii.imei
  AND ir.status = 'in_stock'
  AND i.status = 'completed';