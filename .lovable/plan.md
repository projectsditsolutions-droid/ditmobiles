

## Bug Fix: Opening Balance Edit Should Set New Value Directly

### Problem
The opening balance is **derived** via a reverse formula: `opening = total_credit - purchases + payments + returns - adjustments`. When you edit it, the code stores a **diff** as an `opening_adjustment` transaction and adjusts `total_credit`. This indirect approach is fragile and causes the displayed opening to not reflect edits correctly.

### Solution
Store the opening balance directly on the `dealers` table instead of deriving it.

### Steps

**1. Database Migration — Add `opening_balance` column to `dealers`**
```sql
ALTER TABLE public.dealers ADD COLUMN opening_balance numeric NOT NULL DEFAULT 0;
-- Backfill: derive current opening for existing dealers (one-time)
```

**2. Update `handleEditOpeningCredit` in `DealerLedger.tsx`**
- Simply update `dealers.opening_balance` to the new value
- Still log an `opening_adjustment` transaction for audit history
- No longer manipulate `total_credit` for opening edits

**3. Update `totals` calculation in `DealerLedger.tsx`**
- Replace the derived formula with: `opening = Number(selectedDealer?.opening_balance || 0)`
- Remove the adjustment-based derivation entirely
- Recalculate `current` (total payable) as: `opening_balance + purchases - payments - returns` (or keep using `total_credit` for the purchase-side balance, separate from opening)

**4. Update dealer creation**
- When creating a new dealer with initial credit, store it in both `total_credit` and `opening_balance`

### Technical Details
- The `opening_adjustment` transaction type is kept for audit trail only — it no longer affects the displayed balance
- `total_credit` continues to track the running balance for purchases/payments/returns
- `opening_balance` is the single source of truth for the opening amount, edited directly

