import React from 'react';
import { useShop } from '@/contexts/ShopContext';
import { Clock, Pause, AlertTriangle } from 'lucide-react';

export const ShopStatusBanner: React.FC = () => {
  const { activeShop } = useShop();
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

  return null;
};