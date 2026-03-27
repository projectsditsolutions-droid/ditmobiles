ALTER TABLE public.dealer_transactions
DROP CONSTRAINT IF EXISTS dealer_transactions_type_check;

ALTER TABLE public.dealer_transactions
ADD CONSTRAINT dealer_transactions_type_check
CHECK (
  type = ANY (
    ARRAY[
      'purchase'::text,
      'payment'::text,
      'sale_deduction'::text,
      'stock_return'::text,
      'opening_adjustment'::text
    ]
  )
);