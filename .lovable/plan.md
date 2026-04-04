

## Problem

The current "Record Payment" flow in the Dealer Ledger only allows settling payments against existing buckets: **Opening Credit** or **Sold Cost**. It enforces maximum limits based on available amounts in those buckets. This means if a dealer has no sales or opening credit, you can't record a direct/advance payment at all.

## Solution

Add a **4th settlement option**: **"Direct Payment"** (or "Custom / Advance") that allows entering any amount without being capped by Opening Credit or Sold Cost balances. This covers scenarios like advance payments, partial settlements, or payments unrelated to specific sales.

## Changes

### 1. Update Payment Form & Settlement Options (`src/components/DealerLedger.tsx`)

**Settlement selector** — Add a 4th option to the existing 3-option grid:
- `opening_credit` — Opening Credit (existing)
- `sold_cost` — Sold Cost (existing)  
- `both` — Split Both (existing)
- **`direct` — Direct Payment (new)** — No max cap, any amount accepted

**Payment handler (`handlePayment`)** — Add a new branch for `settleFrom === 'direct'`:
- Only validate that `totalAmount > 0`
- No upper-bound check against any bucket
- Label the description as "Direct Payment" in the transaction record
- Same balance update logic: `newBalance = total_credit - totalAmount`

**Payment modal UI** — When `direct` is selected:
- Show a simple amount input without a "max" label
- Keep payment method checkboxes and notes as-is

### 2. Layout adjustment

Change the settlement grid from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4` to accommodate the 4th option cleanly.

## No database changes needed

The existing `dealer_transactions` table with `type: 'payment'` handles this — only the description text and validation logic change in the frontend.

