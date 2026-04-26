import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { AlertTriangle, X, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getCurrentFY, getFYLabel, getFYStartDate } from '@/lib/financialYear';

interface Props {
  onGoToMaintenance: () => void;
}

const SNOOZE_KEY = 'maintenance_snooze_until';

export const MaintenanceReminder: React.FC<Props> = ({ onGoToMaintenance }) => {
  const { activeShopId, isAllShops, shops, settings } = useShop();
  const [pending, setPending] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const currentFY = getCurrentFY();
  const yearlyAmount = Number(settings?.yearly_maintenance_charge ?? 1500);
  const shopId = isAllShops ? (shops[0]?.id ?? null) : activeShopId;

  useEffect(() => {
    if (!shopId) return;
    const check = async () => {
      const { data } = await supabase
        .from('maintenance_payments')
        .select('id')
        .eq('shop_id', shopId)
        .eq('fy_year', currentFY)
        .maybeSingle();
      const isPending = !data && new Date() >= getFYStartDate(currentFY);
      setPending(isPending);

      // Show popup once per day if pending and not snoozed
      if (isPending) {
        const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (!snoozeUntil || snoozeUntil < today) {
          setShowDialog(true);
        }
      }
    };
    check();
  }, [shopId, currentFY]);

  const snoozeForToday = () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    localStorage.setItem(SNOOZE_KEY, today);
    setShowDialog(false);
  };

  const goPay = () => {
    setShowDialog(false);
    onGoToMaintenance();
  };

  if (!pending) return null;

  return (
    <>
      {!bannerDismissed && (
        <div className="bg-warning/10 border-b-2 border-warning/40 px-4 py-2 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <div className="flex-1 font-display">
            <span className="font-bold text-warning">Maintenance charge pending</span>
            <span className="text-foreground/80"> — ₹{yearlyAmount.toLocaleString('en-IN')} for {getFYLabel(currentFY)} is due</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onGoToMaintenance}>
            <Wrench className="w-3 h-3" /> Pay now
          </Button>
          <button onClick={() => setBannerDismissed(true)} className="p-1 rounded hover:bg-warning/20 text-warning" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <DialogTitle className="text-center">Maintenance Charge Due</DialogTitle>
            <DialogDescription className="text-center">
              Your yearly maintenance charge of <strong className="text-foreground">₹{yearlyAmount.toLocaleString('en-IN')}</strong> for <strong className="text-foreground">{getFYLabel(currentFY)}</strong> is pending.
              <br /><br />
              Please pay to continue using the app without interruption.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={snoozeForToday} className="flex-1">Remind me tomorrow</Button>
            <Button onClick={goPay} className="flex-1 gap-1"><Wrench className="w-4 h-4" /> Pay now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
