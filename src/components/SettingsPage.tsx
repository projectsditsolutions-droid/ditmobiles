import React, { useState } from 'react';
import { getShops, saveShops, getSettings, saveSettings, getPIN, setPIN as savePIN } from '@/lib/store';
import { ShopProfile } from '@/types';
import { AppSettings } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export const SettingsPage: React.FC = () => {
  const [shops, setShops] = useState<ShopProfile[]>(getShops());
  const [settings, setSettings] = useState(getSettings());
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [tab, setTab] = useState<'shops' | 'general' | 'pin'>('shops');

  const handleSaveShop = (idx: number, field: keyof ShopProfile, value: string) => {
    const updated = [...shops];
    (updated[idx] as any)[field] = value;
    setShops(updated);
  };

  const handleSaveAllShops = () => {
    saveShops(shops);
    toast.success('Shop profiles saved');
  };

  const addShop = () => {
    const newShop: ShopProfile = {
      id: crypto.randomUUID(),
      name: 'New Shop',
      address: '',
      phone: '',
      gstNumber: '',
      termsAndConditions: [
        'வாங்கிய பொருள் மாற்றம் / பணம் திருப்பம் இல்லை',
        'பில் இல்லாமல் மாற்றம் செய்ய முடியாது',
        '2 நாட்களுக்குள் மட்டும் மாற்றம்',
        'தொழில்நுட்ப குறைபாடு மட்டும் மாற்றம்',
        'IMEI பொருந்த வேண்டும்',
        'சேதமடைந்த பொருளுக்கு கடை பொறுப்பல்ல',
      ],
      invoicePrefix: 'INV',
      lastInvoiceNumber: 0,
    };
    setShops([...shops, newShop]);
  };

  const removeShop = (id: string) => {
    if (shops.length <= 1) { toast.error('Must have at least one shop'); return; }
    setShops(shops.filter(s => s.id !== id));
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
    toast.success('Settings saved');
  };

  const handleChangePin = () => {
    if (newPin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    savePIN(newPin);
    setNewPin('');
    toast.success('PIN updated');
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-4">Settings</h1>

      <div className="flex gap-2 mb-4">
        {(['shops', 'general', 'pin'] as const).map(t => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)} className="capitalize">
            {t === 'shops' ? 'Shop Profiles' : t === 'general' ? 'General' : 'Change PIN'}
          </Button>
        ))}
      </div>

      {tab === 'shops' && (
        <div className="space-y-4">
          {shops.map((shop, idx) => (
            <div key={shop.id} className="bg-card rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">Shop #{idx + 1}</h3>
                <button onClick={() => removeShop(shop.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['name', 'Shop Name'], ['address', 'Address'], ['phone', 'Phone'], ['gstNumber', 'GST Number'],
                  ['invoicePrefix', 'Invoice Prefix'],
                ] as [keyof ShopProfile, string][]).map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <input
                      value={String(shop[field] || '')}
                      onChange={e => handleSaveShop(idx, field, e.target.value)}
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addShop}><Plus className="w-4 h-4 mr-1" /> Add Shop</Button>
            <Button onClick={handleSaveAllShops}><Save className="w-4 h-4 mr-1" /> Save All</Button>
          </div>
        </div>
      )}

      {tab === 'general' && (
        <div className="bg-card rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-medium">Enable Discounts</p>
              <p className="text-xs text-muted-foreground">Allow item and bill-level discounts</p>
            </div>
            <button
              onClick={() => setSettings({...settings, discountEnabled: !settings.discountEnabled})}
              className={`w-12 h-6 rounded-full transition-colors ${settings.discountEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-card shadow transition-transform ${settings.discountEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default GST %</label>
            <input type="number" value={settings.defaultGSTPercent} onChange={e => setSettings({...settings, defaultGSTPercent: Number(e.target.value)})} className="w-24 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Thermal Printer Width</label>
            <select value={settings.thermalWidth} onChange={e => setSettings({...settings, thermalWidth: e.target.value as any})} className="w-32 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default Print Type</label>
            <select value={settings.defaultPrintType} onChange={e => setSettings({...settings, defaultPrintType: e.target.value as any})} className="w-32 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="thermal">Thermal</option>
              <option value="a4">A4</option>
            </select>
          </div>
          <Button onClick={handleSaveSettings}><Save className="w-4 h-4 mr-1" /> Save Settings</Button>
        </div>
      )}

      {tab === 'pin' && (
        <div className="bg-card rounded-xl border p-4 space-y-4 max-w-sm">
          <p className="text-sm text-muted-foreground">Current PIN is set. Enter a new PIN to change it.</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">New PIN (4-6 digits)</label>
            <input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="w-full h-9 px-3 rounded-md border bg-background text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <Button onClick={handleChangePin}>Update PIN</Button>
        </div>
      )}
    </div>
  );
};
