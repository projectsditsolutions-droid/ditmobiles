
UPDATE public.dealer_transactions
SET amount = 4800,
    description = 'Purchase 6 × Hmd 100 @ ₹800',
    imei_ref = '351813217407593,351813217422584,351813217404921,351813217423459,351813217404921,351813214412562,351813217419275',
    running_balance = running_balance - 2400
WHERE id = '84af7be7-2785-4387-a67b-af5e6f0b3efa';

UPDATE public.dealer_transactions
SET running_balance = running_balance - 2400
WHERE dealer_id = '9505ac74-7383-4131-8871-6fa7a7888efd'
  AND shop_id = '82031b0e-e0eb-4874-acb8-88c866e9eb8e'
  AND created_at > '2026-04-30 13:55:58.592323+00';
