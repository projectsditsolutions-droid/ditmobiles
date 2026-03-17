import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, LogOut, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Shop = Database['public']['Tables']['shops']['Row'];

export const SettingsPage: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { shops, settings, refreshShops, refreshSettings, activeShopId } = useShop();
  const [localShops, setLocalShops] = useState<Shop[]>(shops);
  const [localSettings, setLocalSettings] = useState(settings);
  const [newPin, setNewPin] = useState('');
  const [tab, setTab] = useState<'shops' | 'general' | 'pin' | 'users'>('shops');
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => { setLocalShops(shops); }, [shops]);
  useEffect(() => { setLocalSettings(settings); }, [settings]);

  const fetchMembers = async () => {
    if (!activeShopId) return;
    const { data } = await supabase
      .from('shop_memberships')
      .select('*, profiles(email, full_name)')
      .eq('shop_id', activeShopId);
    if (data) setMembers(data);
  };

  useEffect(() => { if (tab === 'users') fetchMembers(); }, [tab, activeShopId]);

  const handleSaveShop = (idx: number, field: string, value: string) => {
    const updated = [...localShops];
    (updated[idx] as any)[field] = value;
    setLocalShops(updated);
  };

  const handleSaveAllShops = async () => {
    for (const shop of localShops) {
      await supabase.from('shops').update({
        name: shop.name, address: shop.address, phone: shop.phone,
        gst_number: shop.gst_number, invoice_prefix: shop.invoice_prefix,
      }).eq('id', shop.id);
    }
    toast.success('Shop profiles saved');
    refreshShops();
  };

  const addShop = async () => {
    if (!user) return;
    const { data: shop } = await supabase.from('shops').insert({
      name: 'New Shop', created_by: user.id,
    }).select().single();
    if (shop) {
      await supabase.from('shop_memberships').insert({ user_id: user.id, shop_id: shop.id, role: 'admin' as const });
      await supabase.from('shop_settings').insert({ shop_id: shop.id });
      toast.success('Shop created');
      refreshShops();
    }
  };

  const removeShop = async (id: string) => {
    if (localShops.length <= 1) { toast.error('Must have at least one shop'); return; }
    await supabase.from('shops').delete().eq('id', id);
    toast.success('Shop removed');
    refreshShops();
  };

  const handleSaveSettings = async () => {
    if (!localSettings || !activeShopId) return;
    await supabase.from('shop_settings').update({
      discount_enabled: localSettings.discount_enabled,
      default_gst_percent: localSettings.default_gst_percent,
      thermal_width: localSettings.thermal_width,
      default_print_type: localSettings.default_print_type,
    }).eq('shop_id', activeShopId);
    toast.success('Settings saved');
    refreshSettings();
  };

  const handleChangePin = async () => {
    if (newPin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    if (!activeShopId) return;
    await supabase.from('shop_settings').update({ pin_code: newPin }).eq('shop_id', activeShopId);
    setNewPin('');
    toast.success('PIN updated');
    refreshSettings();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-1" /> Sign Out
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['shops', 'general', 'pin', 'users'] as const).map(t => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)} className="capitalize">
            {t === 'shops' ? 'Shop Profiles' : t === 'general' ? 'General' : t === 'pin' ? 'Change PIN' : 'Team'}
          </Button>
        ))}
      </div>

      {tab === 'shops' && (
        <div className="space-y-4">
          {localShops.map((shop, idx) => (
            <div key={shop.id} className="bg-card rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">Shop #{idx + 1}</h3>
                <button onClick={() => removeShop(shop.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['name', 'Shop Name'], ['address', 'Address'], ['phone', 'Phone'], ['gst_number', 'GST Number'], ['invoice_prefix', 'Invoice Prefix']].map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <Input value={String((shop as any)[field] || '')} onChange={e => handleSaveShop(idx, field, e.target.value)} />
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

      {tab === 'general' && localSettings && (
        <div className="bg-card rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-medium">Enable Discounts</p>
              <p className="text-xs text-muted-foreground">Allow item and bill-level discounts</p>
            </div>
            <button onClick={() => setLocalSettings({...localSettings, discount_enabled: !localSettings.discount_enabled})}
              className={`w-12 h-6 rounded-full transition-colors ${localSettings.discount_enabled ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`w-5 h-5 rounded-full bg-card shadow transition-transform ${localSettings.discount_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default GST %</label>
            <Input type="number" value={localSettings.default_gst_percent} onChange={e => setLocalSettings({...localSettings, default_gst_percent: Number(e.target.value)})} className="w-24" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Thermal Printer Width</label>
            <select value={localSettings.thermal_width} onChange={e => setLocalSettings({...localSettings, thermal_width: e.target.value})}
              className="w-32 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="58mm">58mm</option><option value="80mm">80mm</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default Print Type</label>
            <select value={localSettings.default_print_type} onChange={e => setLocalSettings({...localSettings, default_print_type: e.target.value})}
              className="w-32 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="thermal">Thermal</option><option value="a4">A4</option>
            </select>
          </div>
          <Button onClick={handleSaveSettings}><Save className="w-4 h-4 mr-1" /> Save Settings</Button>
        </div>
      )}

      {tab === 'pin' && (
        <div className="bg-card rounded-xl border p-4 space-y-4 max-w-sm">
          <p className="text-sm text-muted-foreground">Enter a new PIN to change it.</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">New PIN (4-6 digits)</label>
            <Input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-widest" />
          </div>
          <Button onClick={handleChangePin}>Update PIN</Button>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-card rounded-xl border p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold">Team Members</h2>
          </div>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                <div>
                  <p className="font-display font-medium text-sm">{(m.profiles as any)?.full_name || (m.profiles as any)?.email || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{(m.profiles as any)?.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-display font-semibold ${
                  m.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                }`}>
                  <Shield className="w-3 h-3 inline mr-1" />{m.role}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Team management features coming soon. Currently, the first user to sign up gets admin access.</p>
        </div>
      )}
    </div>
  );
};
