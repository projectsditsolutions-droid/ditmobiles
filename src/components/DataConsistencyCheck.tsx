import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2, Wrench, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Severity = 'ok' | 'warn' | 'error';

interface Issue {
  id: string;
  ref?: string;
  detail: string;
}

interface CheckResult {
  key: string;
  label: string;
  description: string;
  severity: Severity;
  issues: Issue[];
  fixable: boolean;
  fixLabel?: string;
  fix?: () => Promise<{ fixed: number; failed: number }>;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const DataConsistencyCheck: React.FC = () => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [running, setRunning] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const shopIds = isAllShops ? allShopIds : activeShopId ? [activeShopId] : [];

  const runChecks = async () => {
    if (!shopIds.length) {
      toast.error('No shop selected');
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      const out: CheckResult[] = [];

      // Load all needed data in parallel
      const [invRes, itemsRes, prodRes, imeiRes, dealersRes, txnsRes, custRes] = await Promise.all([
        supabase.from('invoices').select('id, shop_id, subtotal, grand_total, status, customer_id').in('shop_id', shopIds),
        supabase.from('invoice_items').select('id, invoice_id, total, product_id'),
        supabase.from('products').select('id, shop_id, brand, model, stock_quantity').in('shop_id', shopIds),
        supabase.from('imei_records').select('id, shop_id, imei, status, invoice_id, sold_date, product_id').in('shop_id', shopIds),
        supabase.from('dealers').select('id, shop_id, dealer_name, opening_balance, total_credit').in('shop_id', shopIds),
        supabase.from('dealer_transactions').select('id, shop_id, dealer_id, type, amount, running_balance, created_at').in('shop_id', shopIds).order('created_at', { ascending: true }),
        supabase.from('customers').select('id, shop_id, name, total_purchases, pending_amount').in('shop_id', shopIds),
      ]);

      const invoices = invRes.data || [];
      const allItems = itemsRes.data || [];
      const products = prodRes.data || [];
      const imeis = imeiRes.data || [];
      const dealers = dealersRes.data || [];
      const txns = txnsRes.data || [];
      const customers = custRes.data || [];

      const invoiceIds = new Set(invoices.map(i => i.id));
      const items = allItems.filter(it => invoiceIds.has(it.invoice_id));

      // 1. Invoice subtotal vs sum(items.total)
      {
        const itemsByInvoice = new Map<string, number>();
        items.forEach(it => {
          itemsByInvoice.set(it.invoice_id, (itemsByInvoice.get(it.invoice_id) || 0) + Number(it.total || 0));
        });
        const issues: Issue[] = [];
        invoices.forEach(inv => {
          if (inv.status === 'cancelled') return;
          const sum = itemsByInvoice.get(inv.id) || 0;
          const sub = Number(inv.subtotal || 0);
          if (Math.abs(sum - sub) > 1) {
            issues.push({ id: inv.id, ref: inv.id.slice(0, 8), detail: `Items total ${fmt(sum)} ≠ subtotal ${fmt(sub)}` });
          }
        });
        out.push({
          key: 'invoice_totals',
          label: 'Invoice subtotal vs items',
          description: 'Each invoice subtotal should match the sum of its line items',
          severity: issues.length ? 'warn' : 'ok',
          issues,
          fixable: false,
        });
      }

      // 2. Empty (non-cancelled) invoices
      {
        const itemCount = new Map<string, number>();
        items.forEach(it => itemCount.set(it.invoice_id, (itemCount.get(it.invoice_id) || 0) + 1));
        const empty = invoices.filter(i => i.status !== 'cancelled' && !(itemCount.get(i.id) > 0));
        out.push({
          key: 'empty_invoices',
          label: 'Empty invoices',
          description: 'Invoices with no line items should be cancelled',
          severity: empty.length ? 'warn' : 'ok',
          issues: empty.map(i => ({ id: i.id, ref: i.id.slice(0, 8), detail: `Grand total ${fmt(i.grand_total)} but no items` })),
          fixable: empty.length > 0,
          fixLabel: 'Mark as cancelled',
          fix: async () => {
            let fixed = 0, failed = 0;
            for (const inv of empty) {
              const { error } = await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', inv.id);
              if (error) failed++; else fixed++;
            }
            return { fixed, failed };
          },
        });
      }

      // 3. Orphan invoice_items (item.invoice_id not in invoices). Note: limited to current shop's invoices
      {
        const orphans = allItems.filter(it => {
          // Only consider items whose product belongs to our shop scope (heuristic)
          if (invoiceIds.has(it.invoice_id)) return false;
          // Check if product is in our shop scope
          return products.some(p => p.id === it.product_id);
        });
        out.push({
          key: 'orphan_items',
          label: 'Orphan invoice items',
          description: 'Line items pointing to deleted/missing invoices',
          severity: orphans.length ? 'error' : 'ok',
          issues: orphans.map(o => ({ id: o.id, ref: o.id.slice(0, 8), detail: `Item references missing invoice ${o.invoice_id.slice(0, 8)}` })),
          fixable: orphans.length > 0,
          fixLabel: 'Delete orphans',
          fix: async () => {
            let fixed = 0, failed = 0;
            for (const o of orphans) {
              const { error } = await supabase.from('invoice_items').delete().eq('id', o.id);
              if (error) failed++; else fixed++;
            }
            return { fixed, failed };
          },
        });
      }

      // 4. Product stock_quantity vs in_stock IMEI count
      {
        const inStockByProduct = new Map<string, number>();
        imeis.forEach(im => {
          if (im.status === 'in_stock') inStockByProduct.set(im.product_id, (inStockByProduct.get(im.product_id) || 0) + 1);
        });
        const mismatches = products.filter(p => Number(p.stock_quantity || 0) !== (inStockByProduct.get(p.id) || 0));
        out.push({
          key: 'stock_count',
          label: 'Product stock vs IMEIs',
          description: 'Product stock_quantity should equal count of in-stock IMEIs',
          severity: mismatches.length ? 'warn' : 'ok',
          issues: mismatches.map(p => ({
            id: p.id,
            ref: `${p.brand} ${p.model}`,
            detail: `Stored ${p.stock_quantity}, actual ${inStockByProduct.get(p.id) || 0}`,
          })),
          fixable: mismatches.length > 0,
          fixLabel: 'Recount from IMEIs',
          fix: async () => {
            let fixed = 0, failed = 0;
            for (const p of mismatches) {
              const actual = inStockByProduct.get(p.id) || 0;
              const { error } = await supabase.from('products').update({ stock_quantity: actual }).eq('id', p.id);
              if (error) failed++; else fixed++;
            }
            return { fixed, failed };
          },
        });
      }

      // 5. IMEI status inconsistencies
      {
        const bad: Issue[] = [];
        imeis.forEach(im => {
          if (im.status === 'sold' && !im.invoice_id) {
            bad.push({ id: im.id, ref: im.imei, detail: 'Marked sold but no invoice_id' });
          }
          if (im.status === 'in_stock' && (im.invoice_id || im.sold_date)) {
            bad.push({ id: im.id, ref: im.imei, detail: 'In stock but has invoice/sold_date set' });
          }
        });
        out.push({
          key: 'imei_status',
          label: 'IMEI status integrity',
          description: 'Sold IMEIs need invoice_id; in-stock IMEIs should have none',
          severity: bad.length ? 'warn' : 'ok',
          issues: bad,
          fixable: bad.length > 0,
          fixLabel: 'Auto-correct fields',
          fix: async () => {
            let fixed = 0, failed = 0;
            for (const im of imeis) {
              if (im.status === 'in_stock' && (im.invoice_id || im.sold_date)) {
                const { error } = await supabase.from('imei_records').update({ invoice_id: null, sold_date: null }).eq('id', im.id);
                if (error) failed++; else fixed++;
              }
              // Cannot auto-fix sold-without-invoice (no source of truth) — skip
            }
            return { fixed, failed };
          },
        });
      }

      // 6. Dealer running balance recomputation
      {
        const txnsByDealer = new Map<string, typeof txns>();
        txns.forEach(t => {
          const arr = txnsByDealer.get(t.dealer_id) || [];
          arr.push(t);
          txnsByDealer.set(t.dealer_id, arr);
        });
        const issues: Issue[] = [];
        const dealerFixes: { dealerId: string; total_credit: number; updates: { id: string; running_balance: number }[] }[] = [];
        dealers.forEach(d => {
          const list = (txnsByDealer.get(d.id) || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
          let bal = Number(d.opening_balance || 0);
          const updates: { id: string; running_balance: number }[] = [];
          let hasMismatch = false;
          list.forEach(t => {
            const amt = Number(t.amount || 0);
            // purchase/sale_deduction increase credit (we owe dealer); payment/stock_return decrease
            if (t.type === 'purchase' || t.type === 'sale_deduction') bal += amt;
            else bal -= amt;
            if (Math.abs(Number(t.running_balance || 0) - bal) > 0.5) {
              hasMismatch = true;
              updates.push({ id: t.id, running_balance: bal });
            }
          });
          if (hasMismatch || Math.abs(Number(d.total_credit || 0) - bal) > 0.5) {
            issues.push({
              id: d.id,
              ref: d.dealer_name,
              detail: `Stored credit ${fmt(d.total_credit)}, recomputed ${fmt(bal)} (${updates.length} txn rows off)`,
            });
            dealerFixes.push({ dealerId: d.id, total_credit: bal, updates });
          }
        });
        out.push({
          key: 'dealer_balance',
          label: 'Dealer running balances',
          description: 'Recomputes each dealer\'s credit from chronological transactions',
          severity: issues.length ? 'warn' : 'ok',
          issues,
          fixable: dealerFixes.length > 0,
          fixLabel: 'Recompute & save',
          fix: async () => {
            let fixed = 0, failed = 0;
            for (const df of dealerFixes) {
              for (const u of df.updates) {
                const { error } = await supabase.from('dealer_transactions').update({ running_balance: u.running_balance }).eq('id', u.id);
                if (error) failed++; else fixed++;
              }
              const { error } = await supabase.from('dealers').update({ total_credit: df.total_credit }).eq('id', df.dealerId);
              if (error) failed++; else fixed++;
            }
            return { fixed, failed };
          },
        });
      }

      // 7. Customer total_purchases vs sum of completed invoices
      {
        const purchasesByCust = new Map<string, number>();
        invoices.forEach(i => {
          if (!i.customer_id || i.status === 'cancelled') return;
          purchasesByCust.set(i.customer_id, (purchasesByCust.get(i.customer_id) || 0) + Number(i.grand_total || 0));
        });
        const issues: Issue[] = [];
        const fixes: { id: string; total: number }[] = [];
        customers.forEach(c => {
          const actual = purchasesByCust.get(c.id) || 0;
          if (Math.abs(Number(c.total_purchases || 0) - actual) > 1) {
            issues.push({ id: c.id, ref: c.name, detail: `Stored ${fmt(c.total_purchases)}, actual ${fmt(actual)}` });
            fixes.push({ id: c.id, total: actual });
          }
        });
        out.push({
          key: 'customer_totals',
          label: 'Customer total purchases',
          description: 'Sum of non-cancelled invoices per customer',
          severity: issues.length ? 'warn' : 'ok',
          issues,
          fixable: fixes.length > 0,
          fixLabel: 'Recompute totals',
          fix: async () => {
            let fixed = 0, failed = 0;
            for (const f of fixes) {
              const { error } = await supabase.from('customers').update({ total_purchases: f.total }).eq('id', f.id);
              if (error) failed++; else fixed++;
            }
            return { fixed, failed };
          },
        });
      }

      setResults(out);
      setLastRun(new Date());
      const errCount = out.reduce((a, r) => a + r.issues.length, 0);
      if (errCount === 0) toast.success('All checks passed — your data is consistent');
      else toast.warning(`${errCount} issue${errCount === 1 ? '' : 's'} found across ${out.filter(r => r.issues.length).length} check${out.filter(r => r.issues.length).length === 1 ? '' : 's'}`);
    } catch (err: any) {
      toast.error('Check failed: ' + (err.message || 'unknown error'));
    } finally {
      setRunning(false);
    }
  };

  const runFix = async (r: CheckResult) => {
    if (!r.fix) return;
    setFixing(r.key);
    try {
      const { fixed, failed } = await r.fix();
      if (failed > 0) toast.warning(`Fixed ${fixed}, failed ${failed} (insufficient permissions?)`);
      else toast.success(`Fixed ${fixed} record${fixed === 1 ? '' : 's'}`);
      await runChecks();
    } catch (err: any) {
      toast.error('Fix failed: ' + (err.message || 'unknown'));
    } finally {
      setFixing(null);
    }
  };

  const totalIssues = results.reduce((a, r) => a + r.issues.length, 0);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold">Data Consistency Check</h3>
            <p className="text-xs text-muted-foreground">
              Compare invoices, IMEI records, dealer balances and customer totals against derived values
            </p>
          </div>
          <Button onClick={runChecks} disabled={running} className="gradient-primary border-0 text-primary-foreground">
            {running ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            {running ? 'Scanning...' : results.length ? 'Re-run' : 'Run Check'}
          </Button>
        </div>
        {lastRun && (
          <p className="text-xs text-muted-foreground">
            Last run {lastRun.toLocaleTimeString('en-IN')} · {totalIssues === 0
              ? <span className="text-success font-semibold">All clean</span>
              : <span className="text-warning font-semibold">{totalIssues} issue{totalIssues === 1 ? '' : 's'} found</span>}
          </p>
        )}
      </div>

      {results.map(r => (
        <div key={r.key} className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              r.severity === 'ok' ? 'bg-success/10' : r.severity === 'error' ? 'bg-destructive/10' : 'bg-warning/10'
            }`}>
              {r.severity === 'ok'
                ? <CheckCircle2 className="w-5 h-5 text-success" />
                : <AlertTriangle className={`w-5 h-5 ${r.severity === 'error' ? 'text-destructive' : 'text-warning'}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-display font-bold text-sm">{r.label}</h4>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  r.severity === 'ok'
                    ? 'bg-success/15 text-success'
                    : r.severity === 'error'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-warning/15 text-warning'
                }`}>
                  {r.issues.length === 0 ? 'OK' : `${r.issues.length} issue${r.issues.length === 1 ? '' : 's'}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
            </div>
          </div>

          {r.issues.length > 0 && (
            <>
              <div className="bg-muted/40 rounded-lg p-3 max-h-56 overflow-y-auto space-y-1.5 mb-3">
                {r.issues.slice(0, 50).map((iss, idx) => (
                  <div key={idx} className="text-xs flex gap-2">
                    {iss.ref && <span className="font-mono font-semibold text-foreground/80 flex-shrink-0">{iss.ref}</span>}
                    <span className="text-muted-foreground">{iss.detail}</span>
                  </div>
                ))}
                {r.issues.length > 50 && (
                  <p className="text-xs text-muted-foreground italic pt-1">…and {r.issues.length - 50} more</p>
                )}
              </div>
              {r.fixable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runFix(r)}
                  disabled={fixing === r.key || running}
                  className="text-xs"
                >
                  {fixing === r.key
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <Wrench className="w-3.5 h-3.5 mr-1.5" />}
                  {r.fixLabel || 'Auto-fix'}
                </Button>
              )}
            </>
          )}
        </div>
      ))}

      {!results.length && !running && (
        <div className="bg-muted/30 border border-dashed rounded-xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Click <b>Run Check</b> to scan your data for inconsistencies</p>
        </div>
      )}
    </div>
  );
};