import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { Wrench, CheckCircle2, AlertCircle, IndianRupee, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCurrentFY, getFYLabel, getFYStartDate, getFYEndDate } from '@/lib/financialYear';
import { BankDetailsCard } from './BankDetailsCard';

interface Payment {
  id: string;
  shop_id: string;
  fy_year: number;
  amount: number;
  payment_method: string;
  paid_at: string;
  notes: string;
}

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export const MaintenanceCharge: React.FC = () => {
  const { activeShopId, settings, refreshSettings, isAllShops, shops } = useShop();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [editAmount, setEditAmount] = useState(false);
  const [newAmount, setNewAmount] = useState<string>('');

  const currentFY = getCurrentFY();
  const yearlyAmount = Number(settings?.yearly_maintenance_charge ?? 1500);

  const shopId = isAllShops ? (shops[0]?.id ?? null) : activeShopId;

  const fetchData = async () => {
    if (!shopId || !user) return;
    setLoading(true);
    const [{ data: payData }, { data: roleData }] = await Promise.all([
      supabase.from('maintenance_payments').select('*').eq('shop_id', shopId).order('fy_year', { ascending: false }),
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'developer').maybeSingle(),
    ]);
    setPayments((payData as Payment[]) || []);
    setIsDeveloper(!!roleData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [shopId, user?.id]);

  const currentFYPayment = useMemo(() => payments.find(p => p.fy_year === currentFY), [payments, currentFY]);
  const isPaid = !!currentFYPayment;
  const dueDate = getFYStartDate(currentFY);
  const isOverdue = !isPaid && new Date() >= dueDate;

  const handleMarkPaid = async () => {
    if (!shopId || !isDeveloper) return;
    setPaying(true);
    const { error } = await supabase.from('maintenance_payments').insert({
      shop_id: shopId,
      fy_year: currentFY,
      amount: yearlyAmount,
      payment_method: paymentMethod,
      notes: notes.trim(),
      paid_by: user?.id,
    });
    setPaying(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Maintenance charge for ${getFYLabel(currentFY)} marked as paid`);
    setNotes('');
    fetchData();
  };

  const handleSaveAmount = async () => {
    const amt = Number(newAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (!shopId || !isDeveloper) return;
    const { error } = await supabase.from('shop_settings').update({ yearly_maintenance_charge: amt }).eq('shop_id', shopId);
    if (error) { toast.error(error.message); return; }
    toast.success('Amount updated');
    setEditAmount(false);
    refreshSettings();
  };

  if (!shopId) {
    return <div className="p-8 text-center text-muted-foreground">Select a shop first</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-display font-extrabold">Yearly Maintenance Charge</h1>
          <p className="text-xs text-muted-foreground">Annual fee due every April 1st</p>
        </div>
        {isDeveloper && (
          <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-display font-bold uppercase tracking-wider">
            Developer
          </span>
        )}
      </div>

      {/* Current FY status */}
      <div className={`rounded-xl border-2 p-5 ${isPaid ? 'border-success/30 bg-success/5' : isOverdue ? 'border-destructive/40 bg-destructive/5' : 'border-warning/30 bg-warning/5'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            {isPaid ? (
              <CheckCircle2 className="w-8 h-8 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className={`w-8 h-8 flex-shrink-0 mt-0.5 ${isOverdue ? 'text-destructive' : 'text-warning'}`} />
            )}
            <div>
              <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Current Period</p>
              <p className="text-lg font-display font-extrabold">{getFYLabel(currentFY)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Due: {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              {isPaid ? (
                <p className="text-sm text-success font-display font-bold mt-2">
                  ✓ Paid {fmt(currentFYPayment.amount)} on {new Date(currentFYPayment.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              ) : (
                <p className={`text-sm font-display font-bold mt-2 ${isOverdue ? 'text-destructive' : 'text-warning'}`}>
                  {isOverdue ? 'OVERDUE' : 'Pending'} — {fmt(yearlyAmount)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pay form */}
        {!isPaid && isDeveloper && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference / receipt no."
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <Button onClick={handleMarkPaid} disabled={paying} className="w-full sm:w-auto gap-2">
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
              Mark as Paid ({fmt(yearlyAmount)})
            </Button>
          </div>
        )}
        {!isPaid && !isDeveloper && (
          <p className="text-xs text-muted-foreground italic mt-3">Payment confirmation is recorded by the app developer once the transfer is received.</p>
        )}
      </div>

      {/* Bank transfer details — always visible so admin can pay */}
      {!isPaid && <BankDetailsCard amount={yearlyAmount} fyLabel={getFYLabel(currentFY)} />}

      {/* Amount setting — developer only */}
      {isDeveloper && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs font-display font-bold">Yearly Charge Amount (Developer)</p>
              <p className="text-xs text-muted-foreground">Only the developer can change this</p>
            </div>
            {!editAmount ? (
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg">{fmt(yearlyAmount)}</span>
                <Button size="sm" variant="outline" onClick={() => { setNewAmount(String(yearlyAmount)); setEditAmount(true); }}>Edit</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                  className="w-32 px-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <Button size="sm" onClick={handleSaveAmount}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditAmount(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-display font-bold">Payment History</h2>
          <span className="text-[10px] text-muted-foreground">({payments.length} {payments.length === 1 ? 'record' : 'records'})</span>
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No payments yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-display font-semibold text-muted-foreground">Period</th>
                  <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Paid On</th>
                  <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Method</th>
                  <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-display font-bold">{getFYLabel(p.fy_year)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(p.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-3 py-2.5 uppercase text-[10px]"><span className="px-2 py-0.5 rounded-full bg-secondary">{p.payment_method}</span></td>
                    <td className="px-3 py-2.5 text-right font-display font-bold text-success">{fmt(p.amount)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
