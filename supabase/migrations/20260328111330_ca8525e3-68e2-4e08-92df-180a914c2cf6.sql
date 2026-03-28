
-- Recalculate running_balance for all dealer_transactions
-- Only purchase, payment, stock_return, and opening_adjustment affect the running balance
-- sale_deduction entries get the same running_balance as the previous balance-affecting transaction

DO $$
DECLARE
  d RECORD;
  t RECORD;
  bal NUMERIC := 0;
BEGIN
  FOR d IN SELECT DISTINCT dealer_id FROM dealer_transactions ORDER BY dealer_id LOOP
    bal := 0;
    FOR t IN 
      SELECT id, type, amount 
      FROM dealer_transactions 
      WHERE dealer_id = d.dealer_id 
      ORDER BY created_at ASC, id ASC
    LOOP
      IF t.type = 'purchase' THEN
        bal := bal + t.amount;
      ELSIF t.type = 'payment' THEN
        bal := bal - t.amount;
      ELSIF t.type = 'stock_return' THEN
        bal := bal - t.amount;
      ELSIF t.type = 'opening_adjustment' THEN
        bal := bal + t.amount;
      END IF;
      -- sale_deduction: bal stays the same
      
      UPDATE dealer_transactions SET running_balance = bal WHERE id = t.id;
    END LOOP;
  END LOOP;
END $$;
