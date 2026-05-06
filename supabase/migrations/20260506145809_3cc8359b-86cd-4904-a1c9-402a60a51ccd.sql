-- Update the HMD 100 purchase entry from 9 units (₹7,200) to 6 units (₹4,800)
UPDATE public.dealer_transactions
SET amount = 4800,
    description = 'Purchase 6 × Hmd 100 @ ₹800',
    running_balance = running_balance - 2400
WHERE id = '84af7be7-2785-4387-a67b-af5e6f0b3efa';

-- Reduce running_balance by ₹2,400 for all subsequent transactions for this dealer
UPDATE public.dealer_transactions
SET running_balance = running_balance - 2400
WHERE dealer_id = '9505ac74-7383-4131-8871-6fa7a7888efd'
  AND created_at > '2026-04-30 13:55:58.592323+00';

-- Recompute dealer total_credit (sum of purchases minus payments and sale_deductions)
UPDATE public.dealers
SET total_credit = COALESCE((
  SELECT SUM(CASE WHEN type = 'purchase' THEN amount ELSE -amount END)
  FROM public.dealer_transactions
  WHERE dealer_id = '9505ac74-7383-4131-8871-6fa7a7888efd'
), 0)
WHERE id = '9505ac74-7383-4131-8871-6fa7a7888efd';