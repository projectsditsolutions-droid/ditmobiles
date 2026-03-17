import React, { useState } from 'react';
import { POSBilling } from '@/components/POSBilling';
import { InventoryManagement } from '@/components/InventoryManagement';
import { DealerLedger } from '@/components/DealerLedger';
import { ReportsPage } from '@/components/ReportsPage';
import { SettingsPage } from '@/components/SettingsPage';
import { PinModal } from '@/components/PinModal';
import { usePinLock } from '@/hooks/use-pin-lock';
import { AppModule } from '@/types';
import {
  Receipt, Package, Users, BarChart3, Settings, Lock, Unlock,
  ChevronLeft, ChevronRight, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const MODULES: { key: AppModule; label: string; icon: React.ElementType; protected: boolean }[] = [
  { key: 'billing', label: 'Billing', icon: Receipt, protected: false },
  { key: 'inventory', label: 'Inventory', icon: Package, protected: true },
  { key: 'dealers', label: 'Dealers', icon: Users, protected: true },
  { key: 'reports', label: 'Reports', icon: BarChart3, protected: true },
  { key: 'settings', label: 'Settings', icon: Settings, protected: true },
];

const Index = () => {
  const [activeModule, setActiveModule] = useState<AppModule>('billing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pin = usePinLock();

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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className={`flex flex-col bg-card border-r transition-all duration-150 ${sidebarOpen ? 'w-48' : 'w-14'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 h-14 border-b">
          <Smartphone className="w-6 h-6 text-primary flex-shrink-0" />
          {sidebarOpen && <span className="font-display font-bold text-sm truncate">MobilePOS</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5">
          {MODULES.map(mod => {
            const isActive = activeModule === mod.key;
            const isLocked = mod.protected && !pin.isUnlocked;
            return (
              <button
                key={mod.key}
                onClick={() => handleModuleSwitch(mod.key)}
                title={mod.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-display transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <mod.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="flex-1 text-left truncate">{mod.label}</span>
                )}
                {sidebarOpen && isLocked && <Lock className="w-3.5 h-3.5 opacity-50" />}
              </button>
            );
          })}
        </nav>

        {/* Lock/Unlock + Collapse */}
        <div className="border-t p-2 space-y-1">
          {pin.isUnlocked && (
            <Button variant="ghost" size="sm" onClick={pin.lockSession} className="w-full justify-start gap-2 text-xs">
              <Unlock className="w-4 h-4" />
              {sidebarOpen && 'Lock'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full justify-start gap-2 text-xs">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {sidebarOpen && 'Collapse'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeModule === 'billing' && <POSBilling />}
        {activeModule === 'inventory' && <InventoryManagement />}
        {activeModule === 'dealers' && <DealerLedger />}
        {activeModule === 'reports' && <ReportsPage />}
        {activeModule === 'settings' && <SettingsPage />}
      </main>

      {/* PIN Modal */}
      <PinModal
        open={pin.showPinModal}
        onClose={() => pin.setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        attempts={pin.attempts}
        locked={pin.locked}
      />
    </div>
  );
};

export default Index;
