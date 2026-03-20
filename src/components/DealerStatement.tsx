import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Printer, Download, FileText } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Dealer = Database['public']['Tables']['dealers']['Row'];
type DealerTransaction = Database['public']['Tables']['dealer_transactions']['Row'];

interface Props {
  dealer: Dealer;
  allTxns: DealerTransaction[];
  onClose: () => void;
}

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

const TXN_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  payment: 'Payment',
  stock_return: 'Return',
  sale_deduction: 'Sale (Info)',
  opening_adjustment: 'Adjustment',
};

const triggerStatementPrint = () => {
  document.body.classList.add('printing-invoice');
  window.print();
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-invoice');
  }, { once: true });
};

export const DealerStatement: React.FC<Props> = ({ dealer, allTxns, onClose }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);

  const dealerTxns = useMemo(() => allTxns.filter(t => t.dealer_id === dealer.id), [allTxns, dealer.id]);

  const filtered = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    return dealerTxns
      .filter(t => {
        const d = new Date(t.created_at);
        return d >= from && d <= to;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [dealerTxns, dateFrom, dateTo]);

  // Opening balance = balance of the last transaction BEFORE the date range
  const txnsBefore = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    return dealerTxns
      .filter(t => new Date(t.created_at) < from)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [dealerTxns, dateFrom]);

  const openingBalance = txnsBefore.length > 0 ? Number(txnsBefore[txnsBefore.length - 1].running_balance) : 0;
  const closingBalance = filtered.length > 0 ? Number(filtered[filtered.length - 1].running_balance) : openingBalance;

  const periodPurchase = filtered.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount), 0);
  const periodPayment = filtered.filter(t => t.type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
  const periodReturn = filtered.filter(t => t.type === 'stock_return').reduce((s, t) => s + Number(t.amount), 0);
  const periodSale = filtered.filter(t => t.type === 'sale_deduction').reduce((s, t) => s + Number(t.amount), 0);

  const StatementContent = () => (
    <div className="invoice-page" style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: '10pt', color: '#111', background: '#fff', minWidth: '600px' }}>
      {/* Header */}
      <div style={{ borderBottom: '3px double #222', paddingBottom: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.3px' }}>DEALER ACCOUNT STATEMENT</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              Period: {new Date(dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} → {new Date(dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px' }}>
            <div style={{ fontSize: '9px', color: '#888' }}>Generated on</div>
            <div style={{ fontWeight: 700 }}>{new Date().toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Dealer Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '10px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
          <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '6px', color: '#374151' }}>DEALER DETAILS</div>
          <div><strong>{dealer.dealer_name}</strong></div>
          {dealer.brand_name && <div style={{ color: '#6b7280' }}>{dealer.brand_name}</div>}
          {dealer.phone && <div>Ph: {dealer.phone}</div>}
          {dealer.gstin && <div>GSTIN: {dealer.gstin}</div>}
          {dealer.address && <div style={{ color: '#6b7280', marginTop: '2px' }}>{dealer.address}</div>}
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px' }}>
          <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '6px', color: '#374151' }}>PERIOD SUMMARY</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#6b7280' }}>Opening Balance</span>
            <span style={{ fontWeight: 700 }}>{fmt(openingBalance)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#dc2626' }}>+ Purchases</span>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmt(periodPurchase)}</span>
          </div>
          {periodSale > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ color: '#4f46e5' }}>Sold Cost (Info)</span>
              <span style={{ fontWeight: 700, color: '#4f46e5' }}>{fmt(periodSale)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#059669' }}>− Payments</span>
            <span style={{ fontWeight: 700, color: '#059669' }}>{fmt(periodPayment)}</span>
          </div>
          {periodReturn > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ color: '#d97706' }}>− Returns</span>
              <span style={{ fontWeight: 700, color: '#d97706' }}>{fmt(periodReturn)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #16a34a', marginTop: '6px', paddingTop: '6px' }}>
            <span style={{ fontWeight: 800 }}>Closing Balance</span>
            <span style={{ fontWeight: 900, fontSize: '13px', color: closingBalance > 100000 ? '#dc2626' : closingBalance > 30000 ? '#d97706' : '#059669' }}>{fmt(closingBalance)}</span>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '16px' }}>
        <thead>
          <tr style={{ background: '#1e293b', color: '#fff' }}>
            <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</th>
            <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
            <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Debit (+)</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credit (−)</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {/* Opening row */}
          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '6px 8px', color: '#475569', fontSize: '8.5px' }}>—</td>
            <td style={{ padding: '6px 8px' }}>
              <span style={{ background: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '999px', fontWeight: 700, fontSize: '8px' }}>OPENING</span>
            </td>
            <td style={{ padding: '6px 8px', color: '#475569' }}>Balance brought forward</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>—</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>—</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>{fmt(openingBalance)}</td>
          </tr>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No transactions in this period</td>
            </tr>
          )}
          {filtered.map((txn, idx) => {
            const isDebit = txn.type === 'purchase';
            const isCredit = txn.type === 'payment' || txn.type === 'stock_return';
            const bgColor = idx % 2 === 0 ? '#fff' : '#f9fafb';
            const typeColors: Record<string, { bg: string; color: string }> = {
              purchase: { bg: '#fee2e2', color: '#991b1b' },
              payment: { bg: '#dcfce7', color: '#166534' },
              stock_return: { bg: '#fef3c7', color: '#92400e' },
              sale_deduction: { bg: '#e0e7ff', color: '#3730a3' },
              opening_adjustment: { bg: '#f3f4f6', color: '#374151' },
            };
            const tc = typeColors[txn.type] || { bg: '#f3f4f6', color: '#374151' };
            return (
              <tr key={txn.id} style={{ background: bgColor, borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: '8.5px', whiteSpace: 'nowrap' }}>
                  {new Date(txn.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}<br />
                  <span style={{ fontSize: '7.5px' }}>{new Date(txn.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td style={{ padding: '5px 8px' }}>
                  <span style={{ background: tc.bg, color: tc.color, padding: '1px 7px', borderRadius: '999px', fontWeight: 700, fontSize: '7.5px' }}>
                    {TXN_LABELS[txn.type] || txn.type}
                  </span>
                </td>
                <td style={{ padding: '5px 8px', fontSize: '8.5px', color: '#374151', maxWidth: '200px' }}>
                  <div>{txn.description.split('|')[0].trim()}</div>
                  {txn.imei_ref && <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '7.5px' }}>IMEI: {txn.imei_ref}</div>}
                  {txn.invoice_ref && <div style={{ color: '#9ca3af', fontSize: '7.5px' }}>Inv: {txn.invoice_ref}</div>}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: isDebit ? 700 : 400, color: isDebit ? '#dc2626' : '#6b7280' }}>
                  {isDebit ? fmt(Number(txn.amount)) : '—'}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: isCredit ? 700 : 400, color: isCredit ? '#059669' : '#6b7280' }}>
                  {isCredit ? fmt(Number(txn.amount)) : '—'}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, fontSize: '10px' }}>{fmt(Number(txn.running_balance))}</td>
              </tr>
            );
          })}
          {/* Closing row */}
          <tr style={{ background: '#1e293b', color: '#fff', borderTop: '2px solid #1e293b' }}>
            <td colSpan={5} style={{ padding: '8px', fontWeight: 800, fontSize: '10px', textAlign: 'right' }}>CLOSING BALANCE</td>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: '12px' }}>{fmt(closingBalance)}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer note */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', fontSize: '8.5px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
        <span>Debit = Balance increases (Purchases). Credit = Balance decreases (Payments, Returns).</span>
        <span>This is a computer-generated statement.</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Hidden printable root */}
      <div className="invoice-print-root" style={{ display: 'none' }}>
        <StatementContent />
      </div>

      {/* On-screen modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">Dealer Statement</h2>
                <p className="text-xs text-muted-foreground">{dealer.dealer_name} · {dealer.brand_name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={triggerStatementPrint}>
                <Download className="w-4 h-4 mr-1" /> Save PDF
              </Button>
              <Button variant="default" size="sm" onClick={triggerStatementPrint}>
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Date range picker */}
          <div className="px-5 py-3 border-b bg-secondary/30 flex-shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-display font-semibold text-muted-foreground">Period:</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-40 text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-40 text-xs" />
              </div>
              {/* Quick presets */}
              <div className="flex gap-1 ml-2">
                {[
                  { label: 'This Month', fn: () => { const n = new Date(); setDateFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`); setDateTo(today); } },
                  { label: 'Last 30d', fn: () => { const d = new Date(); d.setDate(d.getDate()-30); setDateFrom(d.toISOString().slice(0,10)); setDateTo(today); } },
                  { label: 'All Time', fn: () => { setDateFrom('2020-01-01'); setDateTo(today); } },
                ].map(p => (
                  <button key={p.label} onClick={p.fn} className="px-2.5 py-1 rounded-lg text-[11px] font-display font-semibold border hover:bg-accent transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto text-xs text-muted-foreground font-display">
                <span className="font-bold text-foreground">{filtered.length}</span> transactions
              </div>
            </div>
          </div>

          {/* Statement preview */}
          <div className="flex-1 overflow-y-auto p-5 pos-scrollable">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              {[
                { label: 'Opening Balance', value: fmt(openingBalance), color: 'text-muted-foreground' },
                { label: 'Purchases', value: `+${fmt(periodPurchase)}`, color: 'text-destructive' },
                { label: 'Payments', value: `-${fmt(periodPayment)}`, color: 'text-success' },
                { label: 'Returns', value: `-${fmt(periodReturn)}`, color: 'text-warning' },
                { label: 'Closing Balance', value: fmt(closingBalance), color: closingBalance > 100000 ? 'text-destructive' : closingBalance > 30000 ? 'text-warning' : 'text-success' },
              ].map(c => (
                <div key={c.label} className="bg-background rounded-xl border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1">{c.label}</p>
                  <p className={`font-display font-extrabold text-sm ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Transactions table */}
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-foreground text-background">
                  <tr>
                    {['Date', 'Type', 'Description', 'Debit (+)', 'Credit (−)', 'Balance'].map(h => (
                      <th key={h} className={`px-3 py-2.5 font-display text-[10px] uppercase tracking-wider ${h.includes('Debit') || h.includes('Credit') || h === 'Balance' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-secondary/60 border-b">
                    <td className="px-3 py-2 text-muted-foreground text-[10px]">—</td>
                    <td className="px-3 py-2"><span className="bg-secondary text-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">OPENING</span></td>
                    <td className="px-3 py-2 text-muted-foreground">Balance b/f</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right font-display font-extrabold">{fmt(openingBalance)}</td>
                  </tr>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No transactions in this period</td></tr>
                  )}
                  {filtered.map((txn, idx) => {
                    const isDebit = txn.type === 'purchase';
                    const isCredit = txn.type === 'payment' || txn.type === 'stock_return';
                    const bgColors: Record<string, string> = {
                      purchase: 'bg-destructive/5',
                      payment: 'bg-success/5',
                      stock_return: 'bg-warning/5',
                      sale_deduction: 'bg-primary/5',
                      opening_adjustment: 'bg-secondary/30',
                    };
                    const labelColors: Record<string, string> = {
                      purchase: 'bg-destructive/10 text-destructive',
                      payment: 'bg-success/10 text-success',
                      stock_return: 'bg-warning/10 text-warning',
                      sale_deduction: 'bg-primary/10 text-primary',
                      opening_adjustment: 'bg-secondary text-muted-foreground',
                    };
                    return (
                      <tr key={txn.id} className={`border-t ${bgColors[txn.type] || ''}`}>
                        <td className="px-3 py-2 text-muted-foreground text-[10px] whitespace-nowrap">
                          {new Date(txn.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          <br /><span className="text-[9px]">{new Date(txn.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${labelColors[txn.type] || 'bg-secondary text-foreground'}`}>
                            {TXN_LABELS[txn.type] || txn.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px] max-w-[200px]">
                          <div className="truncate">{txn.description.split('|')[0].trim()}</div>
                          {txn.imei_ref && <div className="font-mono text-[9px] text-muted-foreground">IMEI: {txn.imei_ref}</div>}
                          {txn.invoice_ref && <div className="text-[9px] text-muted-foreground">Inv: {txn.invoice_ref}</div>}
                        </td>
                        <td className={`px-3 py-2 text-right font-display font-bold ${isDebit ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {isDebit ? fmt(Number(txn.amount)) : '—'}
                        </td>
                        <td className={`px-3 py-2 text-right font-display font-bold ${isCredit ? 'text-success' : 'text-muted-foreground'}`}>
                          {isCredit ? fmt(Number(txn.amount)) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-display font-extrabold text-sm">{fmt(Number(txn.running_balance))}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-foreground text-background">
                    <td colSpan={5} className="px-3 py-2.5 text-right font-display font-bold text-xs">CLOSING BALANCE</td>
                    <td className="px-3 py-2.5 text-right font-display font-extrabold text-sm">{fmt(closingBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
