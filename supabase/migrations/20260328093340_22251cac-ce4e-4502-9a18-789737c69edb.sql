DO $$
DECLARE
  dealer_rec RECORD;
  txn_rec RECORD;
  v_opening NUMERIC;
  v_balance NUMERIC;
  v_first_rb NUMERIC;
  v_first_amount NUMERIC;
  v_first_type TEXT;
BEGIN
  FOR dealer_rec IN SELECT id FROM dealers ORDER BY id LOOP
    SELECT type, amount, running_balance
    INTO v_first_type, v_first_amount, v_first_rb
    FROM dealer_transactions
    WHERE dealer_id = dealer_rec.id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_first_type IS NULL THEN
      CONTINUE;
    END IF;

    CASE v_first_type
      WHEN 'purchase' THEN v_opening := v_first_rb - v_first_amount;
      WHEN 'payment' THEN v_opening := v_first_rb + v_first_amount;
      WHEN 'stock_return' THEN v_opening := v_first_rb + v_first_amount;
      WHEN 'opening_adjustment' THEN v_opening := 0;
      WHEN 'sale_deduction' THEN v_opening := v_first_rb;
    END CASE;

    v_balance := v_opening;

    FOR txn_rec IN
      SELECT id, type, amount
      FROM dealer_transactions
      WHERE dealer_id = dealer_rec.id
      ORDER BY created_at ASC
    LOOP
      CASE txn_rec.type
        WHEN 'purchase' THEN v_balance := v_balance + txn_rec.amount;
        WHEN 'payment' THEN v_balance := v_balance - txn_rec.amount;
        WHEN 'stock_return' THEN v_balance := v_balance - txn_rec.amount;
        WHEN 'opening_adjustment' THEN v_balance := v_balance + txn_rec.amount;
        WHEN 'sale_deduction' THEN NULL;
      END CASE;

      UPDATE dealer_transactions
      SET running_balance = v_balance
      WHERE id = txn_rec.id;
    END LOOP;

    UPDATE dealers
    SET total_credit = v_balance
    WHERE id = dealer_rec.id;
  END LOOP;
END;
$$