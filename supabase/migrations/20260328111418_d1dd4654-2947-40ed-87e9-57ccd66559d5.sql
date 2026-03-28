
-- Sync dealers.total_credit to match the last running_balance of each dealer
UPDATE dealers d
SET total_credit = sub.running_balance
FROM (
  SELECT DISTINCT ON (dealer_id) dealer_id, running_balance
  FROM dealer_transactions
  ORDER BY dealer_id, created_at DESC, id DESC
) sub
WHERE d.id = sub.dealer_id;
