import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import Auth from './Auth';
import Onboarding from './Onboarding';
import { POSBilling } from '@/components/POSBilling';
import { InventoryManagement } from '@/components/InventoryManagement';
import { DealerLedger } from '@/components/DealerLedger';
import { PurchaseEntry } from '@/components/PurchaseEntry';
import { CustomerManagement } from '@/components/CustomerManagement';
import { ReportsPage } from '@/components/ReportsPage';
import { SettingsPage } from '@/components/SettingsPage';
import { PinModal } from '@/components/PinModal';
import { usePinLock } from '@/hooks/use-pin-lock';
import {
  Receipt, Package, Users, BarChart3, Settings, Lock, Unlock,
  ChevronLeft, ChevronRight, Loader2, LogOut, Zap, UserCircle, ArrowDownLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import type { InvoiceData } from '@/components/POSBilling';

type AppModule = 'billing' | 'inventory' | 'purchases' | 'dealers' | 'customers' | 'reports' | 'settings';

const MODULES: { key: AppModule; label: string; icon: React.ElementType; protected: boolean; color: string }[] = [
  { key: 'billing', label: 'Billing', icon: Receipt, protected: false, color: 'text-primary' },
  { key: 'inventory', label: 'Inventory', icon: Package, protected: true, color: 'text-warning' },
  { key: 'purchases', label: 'Purchases', icon: ArrowDownLeft, protected: true, color: 'text-success' },
  { key: 'dealers', label: 'Dealers', icon: Users, protected: true, color: 'text-success' },
  { key: 'customers', label: 'Customers', icon: UserCircle, protected: false, color: 'text-primary' },
  { key: 'reports', label: 'Reports', icon: BarChart3, protected: true, color: 'text-destructive' },
  { key: 'settings', label: 'Settings', icon: Settings, protected: true, color: 'text-muted-foreground' },
];

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { shops, loading: shopLoading, refreshShops } = useShop();
  const [activeModule, setActiveModule] = useState<AppModule>('billing');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null);
  const pin = usePinLock();

  const handleEditInvoice = (invoice: InvoiceData) => {
    setEditingInvoice(invoice);
    setActiveModule('billing');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
          <Zap className="w-7 h-7 text-primary-foreground" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-display">Loading MobilePOS...</p>
      </div>
    );
  }

  if (!user) return <Auth />;

  if (!shopLoading && shops.length === 0) {
    return <Onboarding onComplete={refreshShops} />;
  }

  const handleModuleSwitch = (mod: AppModule) => {
    const module = MODULES.find(m => m.key === mod);
    if (module?.protected && !pin.isUnlocked) {
      pin.requestAccess(mod);
      return;
    }
    setActiveModule(mod);
  };

  const handlePinSubmit = (p: string): boolean => {
    const ok = pin.submitPin(p);
    if (ok && pin.pendingModule) {
      setActiveModule(pin.pendingModule as AppModule);
    }
    return ok;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`flex flex-col bg-card border-r transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div className="animate-in">
              <span className="font-display font-extrabold text-base tracking-tight">MobilePOS</span>
              <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">Billing & Inventory</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {MODULES.map(mod => {
            const isActive = activeModule === mod.key;
            const isLocked = mod.protected && !pin.isUnlocked;
            return (
              <button
                key={mod.key}
                onClick={() => handleModuleSwitch(mod.key)}
                title={mod.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <mod.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? mod.color : 'group-hover:text-foreground'}`} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left truncate">{mod.label}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 opacity-40" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-2 space-y-1">
          {pin.isUnlocked && (
            <Button variant="ghost" size="sm" onClick={pin.lockSession} className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Unlock className="w-4 h-4" />{sidebarOpen && 'Lock'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {sidebarOpen && 'Collapse'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {activeModule === 'billing' && <POSBilling editingInvoice={editingInvoice} onCancelEdit={() => setEditingInvoice(null)} />}
        {activeModule === 'inventory' && <InventoryManagement />}
        {activeModule === 'purchases' && <PurchaseEntry />}
        {activeModule === 'dealers' && <DealerLedger />}
        {activeModule === 'customers' && <CustomerManagement onEditInvoice={handleEditInvoice} />}
        {activeModule === 'reports' && <ReportsPage onEditInvoice={handleEditInvoice} />}
        {activeModule === 'settings' && <SettingsPage />}
      </main>

      <PinModal open={pin.showPinModal} onClose={() => pin.setShowPinModal(false)}
        onSubmit={handlePinSubmit} attempts={pin.attempts} locked={pin.locked} />
    </div>
  );
};

export default Index;
