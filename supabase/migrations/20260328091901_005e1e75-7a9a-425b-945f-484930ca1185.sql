
-- Delete 3 duplicate dealer_transactions (keep only the first one with INV-R-0029)
DELETE FROM public.dealer_transactions 
WHERE id IN (
  'e5c1524b-7e27-4f5f-a7a1-6d0a19bd7cac',
  '1f8f68e4-cff9-47cc-8c8b-ea9fa2e2d136',
  '344104c4-12d1-4ad8-b738-34cdac153081'
);

-- Recalculate running balances for this dealer by replaying transactions in order
WITH ordered_txns AS (
  SELECT id, type, amount,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.dealer_transactions
  WHERE dealer_id = '1403aeed-e18c-4496-b1f0-fe6dbd74133d'
),
running AS (
  SELECT id,
    SUM(
      CASE 
        WHEN type IN ('purchase', 'opening_adjustment', 'return') THEN amount
        WHEN type IN ('payment', 'sale_deduction') THEN -amount
        ELSE 0
      END
    ) OVER (ORDER BY rn) as new_balance
  FROM ordered_txns
)
UPDATE public.dealer_transactions dt
SET running_balance = r.new_balance
FROM running r
WHERE dt.id = r.id;

-- Also update the dealer's total_credit to match the final running balance
UPDATE public.dealers
SET total_credit = (
  SELECT running_balance 
  FROM public.dealer_transactions 
  WHERE dealer_id = '1403aeed-e18c-4496-b1f0-fe6dbd74133d'
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE id = '1403aeed-e18c-4496-b1f0-fe6dbd74133d';
