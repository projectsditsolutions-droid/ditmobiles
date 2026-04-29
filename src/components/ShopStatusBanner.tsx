import React, { useEffect, useState } from 'react';
import { useShop } from '@/contexts/ShopContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Pause, AlertTriangle, Tag } from 'lucide-react';

interface ShopCharge {
  id: string; title: string; message: string; amount: number; is_paid: boolean; due_date: string | null;
}

export const ShopStatusBanner: React.FC = () => {
  const { activeShop } = useShop();
  const [pendingCharges, setPendingCharges] = useState<ShopCharge[]>([]);

  useEffect(() => {
    if (!activeShop?.id) { setPendingCharges([]); return; }
    const load = async () => {
      const { data } = await supabase.from('shop_charges')
        .select('id, title, message, amount, is_paid, due_date')
        .eq('shop_id', activeShop.id).eq('is_paid', false)
        .order('created_at', { ascending: false });
      setPendingCharges((data as ShopCharge[]) || []);
    };
    load();
    const channel = supabase.channel('charges-' + activeShop.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_charges', filter: `shop_id=eq.${activeShop.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeShop?.id]);

  if (!activeShop) return null;

  if (activeShop.approval_status === 'pending') {
    return (
      <div className="bg-warning/10 border-b-2 border-warning/40 px-4 py-2 flex items-center gap-3 text-xs">
        <Clock className="w-4 h-4 text-warning flex-shrink-0" />
        <div className="flex-1 font-display">
          <span className="font-bold text-warning">Awaiting approval</span>
          <span className="text-foreground/80"> — Your shop "{activeShop.name}" is pending developer approval. You can explore the app, but data may be reviewed before going live.</span>
        </div>
      </div>
    );
  }

  if (activeShop.approval_status === 'rejected') {
    return (
      <div className="bg-destructive/10 border-b-2 border-destructive/40 px-4 py-2 flex items-center gap-3 text-xs">
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
        <div className="flex-1 font-display">
          <span className="font-bold text-destructive">Shop rejected</span>
          <span className="text-foreground/80"> — Please contact support.</span>
        </div>
      </div>
    );
  }

  if (activeShop.is_suspended) {
    return (
      <div className="bg-destructive/10 border-b-2 border-destructive/40 px-4 py-2 flex items-center gap-3 text-xs">
        <Pause className="w-4 h-4 text-destructive flex-shrink-0" />
        <div className="flex-1 font-display">
          <span className="font-bold text-destructive">Account suspended</span>
          <span className="text-foreground/80"> — {activeShop.suspended_reason || 'Please contact the developer.'}</span>
        </div>
      </div>
    );
  }

  if (pendingCharges.length > 0) {
    return (
      <div className="bg-warning/10 border-b-2 border-warning/40 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <Tag className="w-4 h-4 text-warning flex-shrink-0" />
          <span className="font-display font-bold text-warning">
            {pendingCharges.length} pending charge{pendingCharges.length !== 1 ? 's' : ''} from developer
          </span>
        </div>
        <div className="space-y-1 ml-6">
          {pendingCharges.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <span className="font-display font-bold text-foreground">{c.title}</span>
                {c.message && <span className="text-foreground/70"> — {c.message}</span>}
                {c.due_date && (
                  <span className="text-[10px] text-muted-foreground ml-1">(Due {new Date(c.due_date).toLocaleDateString('en-IN')})</span>
                )}
              </div>
              <span className="font-display font-extrabold text-warning whitespace-nowrap">
                ₹{Number(c.amount).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};