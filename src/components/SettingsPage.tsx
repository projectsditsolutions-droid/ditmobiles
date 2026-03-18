import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, LogOut, Users, Shield, Store, Settings2, KeyRound, Printer, Hash, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Shop = Database['public']['Tables']['shops']['Row'];

export const SettingsPage: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { shops, settings, refreshShops, refreshSettings, activeShopId } = useShop();
  const [localShops, setLocalShops] = useState<Shop[]>(shops);
  const [localSettings, setLocalSettings] = useState(settings);
  const [newPin, setNewPin] = useState('');
  const [tab, setTab] = useState<'shops' | 'gst_profiles' | 'general' | 'pin' | 'users'>('shops');
  const [members, setMembers] = useState<any[]>([]);
  const [gstProfiles, setGstProfiles] = useState<any[]>([]);

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

  const fetchGstProfiles = async () => {
    if (!activeShopId) return;
    const { data } = await supabase
      .from('shop_gst_profiles')
      .select('*')
      .eq('shop_id', activeShopId)
      .order('is_default', { ascending: false });
    if (data) setGstProfiles(data);
  };

  useEffect(() => { if (tab === 'gst_profiles') fetchGstProfiles(); }, [tab, activeShopId]);

  const addGstProfile = async () => {
    if (!activeShopId) return;
    const { error } = await supabase.from('shop_gst_profiles').insert({
      shop_id: activeShopId,
      profile_name: 'New Profile',
      business_name: '',
      gst_number: '',
      address: '',
      phone: '',
      is_default: gstProfiles.length === 0,
    } as any);
    if (!error) { toast.success('GST Profile added'); fetchGstProfiles(); }
  };

  const updateGstProfile = (idx: number, field: string, value: any) => {
    const updated = [...gstProfiles];
    updated[idx] = { ...updated[idx], [field]: value };
    setGstProfiles(updated);
  };

  const saveGstProfiles = async () => {
    for (const p of gstProfiles) {
      await supabase.from('shop_gst_profiles').update({
        profile_name: p.profile_name,
        business_name: p.business_name,
        gst_number: p.gst_number,
        address: p.address,
        phone: p.phone,
        is_default: p.is_default,
      } as any).eq('id', p.id);
    }
    toast.success('GST Profiles saved');
    fetchGstProfiles();
  };

  const deleteGstProfile = async (id: string) => {
    await supabase.from('shop_gst_profiles').delete().eq('id', id);
    toast.success('Profile deleted');
    fetchGstProfiles();
  };

  const setDefaultProfile = (idx: number) => {
    setGstProfiles(prev => prev.map((p, i) => ({ ...p, is_default: i === idx })));
  };

  const tabItems = [
    { key: 'shops', icon: Store, label: 'Shop Profiles' },
    { key: 'gst_profiles', icon: Building2, label: 'GST Profiles' },
    { key: 'general', icon: Settings2, label: 'General' },
    { key: 'pin', icon: KeyRound, label: 'PIN Security' },
    { key: 'users', icon: Users, label: 'Team' },
  ] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your shop configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
        </Button>
      </div>

      <div className="flex bg-secondary rounded-lg p-0.5 mb-6 w-fit">
        {tabItems.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'shops' && (
        <div className="space-y-4">
          {localShops.map((shop, idx) => (
            <div key={shop.id} className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <Store className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-bold">Shop #{idx + 1}</h3>
                </div>
                <button onClick={() => removeShop(shop.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['name', 'Shop Name'], ['address', 'Address'], ['phone', 'Phone'], ['gst_number', 'GST Number'], ['invoice_prefix', 'Invoice Prefix']].map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                    <Input value={String((shop as any)[field] || '')} onChange={e => handleSaveShop(idx, field, e.target.value)} className="h-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="outline" onClick={addShop}><Plus className="w-4 h-4 mr-1.5" /> Add Shop</Button>
            <Button onClick={handleSaveAllShops} className="gradient-primary border-0 text-primary-foreground"><Save className="w-4 h-4 mr-1.5" /> Save All</Button>
          </div>
        </div>
      )}

      {tab === 'general' && localSettings && (
        <div className="bg-card rounded-xl border p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-semibold">Enable Discounts</p>
              <p className="text-xs text-muted-foreground mt-0.5">Allow item and bill-level discounts during billing</p>
            </div>
            <button onClick={() => setLocalSettings({...localSettings, discount_enabled: !localSettings.discount_enabled})}
              className={`w-12 h-6 rounded-full transition-colors ${localSettings.discount_enabled ? 'bg-primary' : 'bg-border'}`}>
              <div className={`w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${localSettings.discount_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default GST %</label>
            <Input type="number" value={localSettings.default_gst_percent} onChange={e => setLocalSettings({...localSettings, default_gst_percent: Number(e.target.value)})} className="w-28 h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Thermal Printer Width</label>
            <div className="flex bg-secondary rounded-lg p-0.5 w-fit">
              {['58mm', '80mm'].map(w => (
                <button key={w} onClick={() => setLocalSettings({...localSettings, thermal_width: w})}
                  className={`px-4 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${localSettings.thermal_width === w ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Print Type</label>
            <div className="flex bg-secondary rounded-lg p-0.5 w-fit">
              {[['thermal', 'Thermal'], ['a4', 'A4 Invoice']].map(([v, l]) => (
                <button key={v} onClick={() => setLocalSettings({...localSettings, default_print_type: v})}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${localSettings.default_print_type === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  <Printer className="w-3.5 h-3.5" />{l}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSaveSettings} className="gradient-primary border-0 text-primary-foreground"><Save className="w-4 h-4 mr-1.5" /> Save Settings</Button>
        </div>
      )}

      {tab === 'pin' && (
        <div className="bg-card rounded-xl border p-5 shadow-sm max-w-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-display font-bold">PIN Security</h3>
              <p className="text-xs text-muted-foreground">Protects Inventory, Dealers, Reports & Settings</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New PIN (4-6 digits)</label>
            <Input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-[0.5em] text-center h-12 text-lg" placeholder="••••" />
          </div>
          <Button onClick={handleChangePin} className="w-full gradient-primary border-0 text-primary-foreground">Update PIN</Button>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-card rounded-xl border p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold">Team Members</h3>
              <p className="text-xs text-muted-foreground">People with access to this shop</p>
            </div>
          </div>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/30">
                <div>
                  <p className="font-display font-semibold text-sm">{(m.profiles as any)?.full_name || (m.profiles as any)?.email || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{(m.profiles as any)?.email}</p>
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-display font-bold ${
                  m.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                }`}>
                  <Shield className="w-3 h-3" />{m.role}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground bg-accent/50 p-3 rounded-lg">
            💡 The first user to sign up gets admin access. Team invite features are coming soon.
          </p>
        </div>
      )}
    </div>
  );
};
