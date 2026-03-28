import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Trash2, Save, LogOut, Users, Shield, Store,
  Settings2, KeyRound, Printer, Building2, Tag, Hash, Star, FileText, Upload, Image, Layout,
  Download, UploadCloud, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Shop = Database['public']['Tables']['shops']['Row'];

interface GSTProfile {
  id: string;
  shop_id: string;
  profile_name: string;
  business_name: string;
  gst_number: string;
  address: string;
  phone: string;
  is_default: boolean;
  profile_type: 'retail' | 'wholesale';
  invoice_prefix: string;
  last_invoice_number: number;
  sub_heading: string;
  logo_url?: string | null;
}

const BILL_TEMPLATES = [
  { id: 'classic', label: 'Classic', description: 'Traditional layout with header, table, and footer' },
  { id: 'modern', label: 'Modern', description: 'Clean design with highlighted totals and bold typography' },
  { id: 'compact', label: 'Compact', description: 'Space-efficient layout for thermal printers' },
] as const;

export const SettingsPage: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { shops, settings, refreshShops, refreshSettings, activeShopId, isAllShops, allShopIds } = useShop();
  const [localShops, setLocalShops] = useState<Shop[]>(shops);
  const [localSettings, setLocalSettings] = useState(settings);
  const [newPin, setNewPin] = useState('');
  const [tab, setTab] = useState<'shops' | 'gst_profiles' | 'general' | 'invoice' | 'pin' | 'users' | 'backup'>('shops');
  const [members, setMembers] = useState<any[]>([]);
  const [gstProfiles, setGstProfiles] = useState<GSTProfile[]>([]);
  const [editTerms, setEditTerms] = useState<string[]>([]);
  const [editingTermsShopId, setEditingTermsShopId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [uploadContext, setUploadContext] = useState<'shop' | 'gst_profile'>('shop');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(() => {
    try { return localStorage.getItem('bill_template') || 'classic'; } catch { return 'classic'; }
  });
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalShops(shops); }, [shops]);
  useEffect(() => { setLocalSettings(settings); }, [settings]);

  const fetchMembers = async () => {
    if (!activeShopId) return;
    const { data } = await supabase.from('shop_memberships').select('*, profiles(email, full_name)').eq('shop_id', activeShopId);
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
        sub_heading: (shop as any).sub_heading || '',
        logo_url: shop.logo_url || null,
      } as any).eq('id', shop.id);
    }
    toast.success('Shop profiles saved');
    refreshShops();
  };

  const handleUploadLogo = async (file: File, targetType: 'shop' | 'gst_profile', targetId: string) => {
    if (!file || !file.type.startsWith('image/')) { toast.error('Please select a valid image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setUploadingLogo(targetId);
    const ext = file.name.split('.').pop();
    const path = `${targetType}/${targetId}/logo.${ext}?t=${Date.now()}`;

    const { error: uploadError } = await supabase.storage.from('shop-logos').upload(path.split('?')[0], file, { upsert: true });
    if (uploadError) { toast.error('Upload failed: ' + uploadError.message); setUploadingLogo(null); return; }

    const { data: { publicUrl } } = supabase.storage.from('shop-logos').getPublicUrl(path.split('?')[0]);
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    if (targetType === 'shop') {
      await supabase.from('shops').update({ logo_url: urlWithBust } as any).eq('id', targetId);
      setLocalShops(prev => prev.map(s => s.id === targetId ? { ...s, logo_url: urlWithBust } : s));
      refreshShops();
    } else {
      await supabase.from('shop_gst_profiles').update({ logo_url: urlWithBust } as any).eq('id', targetId);
      setGstProfiles(prev => prev.map(p => p.id === targetId ? { ...p, logo_url: urlWithBust } : p));
    }

    setUploadingLogo(null);
    toast.success('Logo uploaded successfully');
  };

  const addShop = async () => {
    if (!user) return;
    const { data: shop } = await supabase.from('shops').insert({ name: 'New Shop', created_by: user.id }).select().single();
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
    const { data } = await supabase.from('shop_gst_profiles').select('*').eq('shop_id', activeShopId).order('is_default', { ascending: false });
    if (data) setGstProfiles(data as unknown as GSTProfile[]);
  };

  useEffect(() => { if (tab === 'gst_profiles') fetchGstProfiles(); }, [tab, activeShopId]);

  const addGstProfile = async (type: 'retail' | 'wholesale') => {
    if (!activeShopId) return;
    const isFirst = gstProfiles.length === 0;
    const prefix = type === 'wholesale' ? 'INV-W' : 'INV-R';
    const { error } = await supabase.from('shop_gst_profiles').insert({ shop_id: activeShopId, profile_name: type === 'wholesale' ? 'Wholesale Profile' : 'Retail Profile', business_name: '', gst_number: '', address: '', phone: '', sub_heading: '', is_default: isFirst, profile_type: type, invoice_prefix: prefix, last_invoice_number: 0 } as any);
    if (!error) { toast.success(`${type === 'wholesale' ? 'Wholesale' : 'Retail'} GST Profile added`); fetchGstProfiles(); }
  };

  const updateGstProfile = (idx: number, field: string, value: any) => {
    const updated = [...gstProfiles];
    updated[idx] = { ...updated[idx], [field]: value };
    setGstProfiles(updated);
  };

  const saveGstProfiles = async () => {
    for (const p of gstProfiles) {
      await supabase.from('shop_gst_profiles').update({
        profile_name: p.profile_name, business_name: p.business_name, gst_number: p.gst_number,
        address: p.address, phone: p.phone, sub_heading: p.sub_heading || '',
        is_default: p.is_default, profile_type: p.profile_type, invoice_prefix: p.invoice_prefix,
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

  const openTermsEditor = (shop: Shop) => {
    setEditingTermsShopId(shop.id);
    setEditTerms(shop.terms_and_conditions || []);
  };

  const saveTerms = async () => {
    if (!editingTermsShopId) return;
    await supabase.from('shops').update({ terms_and_conditions: editTerms } as any).eq('id', editingTermsShopId);
    toast.success('Terms & Conditions saved');
    setEditingTermsShopId(null);
    refreshShops();
  };

  const handleDownloadBackup = async () => {
    if (!activeShopId) return;
    setBackupLoading(true);
    try {
      const shopIds = isAllShops ? allShopIds : [activeShopId];
      const [shops, settings, gstProfiles, products, imeiRecords, dealers, dealerTxns, invoices, invoiceItems, customers] = await Promise.all([
        supabase.from('shops').select('*').in('id', shopIds),
        supabase.from('shop_settings').select('*').in('shop_id', shopIds),
        supabase.from('shop_gst_profiles').select('*').in('shop_id', shopIds),
        supabase.from('products').select('*').in('shop_id', shopIds),
        supabase.from('imei_records').select('*').in('shop_id', shopIds),
        supabase.from('dealers').select('*').in('shop_id', shopIds),
        supabase.from('dealer_transactions').select('*').in('shop_id', shopIds),
        supabase.from('invoices').select('*').in('shop_id', shopIds),
        supabase.from('invoice_items').select('*'),
        supabase.from('customers').select('*').in('shop_id', shopIds),
      ]);

      // Filter invoice_items to only those belonging to fetched invoices
      const invoiceIds = new Set((invoices.data || []).map(i => i.id));
      const filteredItems = (invoiceItems.data || []).filter(item => invoiceIds.has(item.invoice_id));

      const backup = {
        version: 1,
        created_at: new Date().toISOString(),
        shops: shops.data || [],
        shop_settings: settings.data || [],
        shop_gst_profiles: gstProfiles.data || [],
        products: products.data || [],
        imei_records: imeiRecords.data || [],
        dealers: dealers.data || [],
        dealer_transactions: dealerTxns.data || [],
        invoices: invoices.data || [],
        invoice_items: filteredItems,
        customers: customers.data || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mobilepos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (err) {
      toast.error('Failed to create backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (file: File) => {
    setRestoreLoading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.version || !backup.shops) {
        toast.error('Invalid backup file');
        setRestoreLoading(false);
        return;
      }

      // Restore order matters due to foreign key dependencies
      const tables: { key: string; table: string }[] = [
        { key: 'products', table: 'products' },
        { key: 'dealers', table: 'dealers' },
        { key: 'customers', table: 'customers' },
        { key: 'imei_records', table: 'imei_records' },
        { key: 'invoices', table: 'invoices' },
        { key: 'invoice_items', table: 'invoice_items' },
        { key: 'dealer_transactions', table: 'dealer_transactions' },
        { key: 'shop_gst_profiles', table: 'shop_gst_profiles' },
      ];

      let restored = 0;
      for (const { key, table } of tables) {
        const rows = backup[key];
        if (!rows || rows.length === 0) continue;
        // Upsert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error } = await supabase.from(table as any).upsert(batch as any, { onConflict: 'id' });
          if (error) console.error(`Restore error on ${table}:`, error.message);
          else restored += batch.length;
        }
      }

      toast.success(`Backup restored! ${restored} records processed.`);
      refreshShops();
      refreshSettings();
    } catch (err) {
      toast.error('Failed to restore backup. Check file format.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const tabItems = [
    { key: 'shops', icon: Store, label: 'Shop Profiles' },
    { key: 'gst_profiles', icon: Building2, label: 'GST Profiles' },
    { key: 'general', icon: Settings2, label: 'General' },
    { key: 'invoice', icon: FileText, label: 'Invoice' },
    { key: 'pin', icon: KeyRound, label: 'PIN Security' },
    { key: 'users', icon: Users, label: 'Team' },
    { key: 'backup', icon: Download, label: 'Backup' },
  ] as const;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto overflow-y-auto h-full">
      {/* Hidden file input */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && uploadingLogo) {
            handleUploadLogo(file, uploadContext, uploadingLogo);
          }
          e.target.value = '';
        }}
      />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your shop configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
        </Button>
      </div>

      <div className="flex bg-secondary rounded-lg p-0.5 mb-6 w-fit overflow-x-auto">
        {tabItems.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all whitespace-nowrap ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Shop Profiles ── */}
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

              {/* Logo Upload */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Shop Logo</label>
                <div className="flex items-center gap-4">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt="Shop logo" className="h-14 max-w-[140px] object-contain rounded-lg border p-1" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <Button variant="outline" size="sm" disabled={uploadingLogo === shop.id} onClick={() => { setUploadContext('shop'); setUploadingLogo(shop.id); logoInputRef.current?.click(); }}>
                    <Upload className="w-3.5 h-3.5 mr-1" /> {uploadingLogo === shop.id ? 'Uploading...' : shop.logo_url ? 'Change' : 'Upload'} Logo
                  </Button>
                  {shop.logo_url && (
                    <Button variant="ghost" size="sm" onClick={() => handleSaveShop(idx, 'logo_url', '')} className="text-destructive">Remove</Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Max 2MB · Appears on invoices</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[['name', 'Shop Name'], ['sub_heading', 'Sub Heading'], ['address', 'Address'], ['phone', 'Phone'], ['gst_number', 'GST Number'], ['invoice_prefix', 'Invoice Prefix']].map(([field, label]) => (
                  <div key={field} className={field === 'sub_heading' || field === 'address' ? 'sm:col-span-2' : ''}>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                    <Input value={String((shop as any)[field] || '')} onChange={e => handleSaveShop(idx, field, e.target.value)} className="h-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={addShop}><Plus className="w-4 h-4 mr-1.5" /> Add Shop</Button>
            <Button onClick={handleSaveAllShops} className="gradient-primary border-0 text-primary-foreground"><Save className="w-4 h-4 mr-1.5" /> Save All</Button>
          </div>
        </div>
      )}

      {/* ── GST Profiles ── */}
      {tab === 'gst_profiles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold">GST Billing Profiles</h3>
                <p className="text-xs text-muted-foreground">Separate invoice numbering per profile. Each profile can have its own logo.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addGstProfile('retail')}>
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-primary" /> + Retail
              </Button>
              <Button variant="outline" size="sm" onClick={() => addGstProfile('wholesale')}>
                <Store className="w-3.5 h-3.5 mr-1.5 text-warning" /> + Wholesale
              </Button>
            </div>
          </div>

          {gstProfiles.length === 0 && (
            <div className="bg-card rounded-xl border-2 border-dashed border-border p-8 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-display font-semibold text-muted-foreground">No GST profiles yet</p>
              <div className="flex gap-2 justify-center mt-4 flex-wrap">
                <Button size="sm" onClick={() => addGstProfile('retail')} className="gradient-primary border-0 text-primary-foreground">
                  <Building2 className="w-3.5 h-3.5 mr-1.5" /> Add Retail Profile
                </Button>
                <Button size="sm" variant="outline" onClick={() => addGstProfile('wholesale')}>
                  <Store className="w-3.5 h-3.5 mr-1.5" /> Add Wholesale Profile
                </Button>
              </div>
            </div>
          )}

          {gstProfiles.map((profile, idx) => (
            <div key={profile.id} className={`bg-card rounded-xl border p-5 shadow-sm ${profile.is_default ? 'border-primary/30 ring-1 ring-primary/15' : ''}`}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${profile.profile_type === 'wholesale' ? 'bg-warning/15' : 'bg-primary/15'}`}>
                    {profile.profile_type === 'wholesale' ? <Store className="w-4 h-4 text-warning" /> : <Building2 className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-display font-bold text-sm">{profile.profile_name || 'Unnamed Profile'}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-display font-bold ${profile.profile_type === 'wholesale' ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'}`}>
                        {profile.profile_type === 'wholesale' ? 'Wholesale' : 'Retail'}
                      </span>
                      {profile.is_default && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-display font-bold bg-success/15 text-success flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Next invoice: <span className="font-mono font-semibold text-foreground">{profile.invoice_prefix}-{String((profile.last_invoice_number || 0) + 1).padStart(4, '0')}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!profile.is_default && (
                    <button onClick={() => setDefaultProfile(idx)} className="text-[10px] font-display font-semibold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/10 flex items-center gap-1">
                      <Star className="w-3 h-3" /> Set Default
                    </button>
                  )}
                  <button onClick={() => updateGstProfile(idx, 'profile_type', profile.profile_type === 'retail' ? 'wholesale' : 'retail')} className="text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary">
                    Switch to {profile.profile_type === 'retail' ? 'Wholesale' : 'Retail'}
                  </button>
                  <button onClick={() => deleteGstProfile(profile.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile Logo Upload */}
              <div className="mb-4 pb-4 border-b">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Profile Logo (overrides shop logo on invoices)</label>
                <div className="flex items-center gap-4">
                  {profile.logo_url ? (
                    <img src={profile.logo_url} alt="Profile logo" className="h-12 max-w-[120px] object-contain rounded-lg border p-1 bg-white" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <Image className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo === profile.id}
                    onClick={() => { setUploadContext('gst_profile'); setUploadingLogo(profile.id); logoInputRef.current?.click(); }}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> {uploadingLogo === profile.id ? 'Uploading...' : profile.logo_url ? 'Change' : 'Upload'} Logo
                  </Button>
                  {profile.logo_url && (
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await supabase.from('shop_gst_profiles').update({ logo_url: null } as any).eq('id', profile.id);
                      setGstProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, logo_url: null } : p));
                    }} className="text-destructive text-xs">
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Max 2MB · Profile-specific logo for invoices</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Profile Label</label>
                  <Input value={profile.profile_name || ''} onChange={e => updateGstProfile(idx, 'profile_name', e.target.value)} className="h-10" placeholder="e.g. Main Retail" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Business Name (on Invoice)</label>
                  <Input value={profile.business_name || ''} onChange={e => updateGstProfile(idx, 'business_name', e.target.value)} className="h-10" placeholder="Legal business name" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sub Heading</label>
                  <Input value={profile.sub_heading || ''} onChange={e => updateGstProfile(idx, 'sub_heading', e.target.value)} className="h-10" placeholder="e.g. Mobile & Accessories" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Hash className="w-3 h-3" /> GSTIN</label>
                  <Input value={profile.gst_number || ''} onChange={e => updateGstProfile(idx, 'gst_number', e.target.value.toUpperCase())} className="h-10 font-mono tracking-wider" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone Number(s)</label>
                  {(profile.phone || '').split(',').map((ph, phIdx, arr) => (
                    <div key={phIdx} className="flex items-center gap-1.5 mb-1.5">
                      <Input
                        value={ph.trim()}
                        onChange={e => {
                          const phones = (profile.phone || '').split(',').map(p => p.trim());
                          phones[phIdx] = e.target.value;
                          updateGstProfile(idx, 'phone', phones.join(', '));
                        }}
                        className="h-10"
                        placeholder={phIdx === 0 ? 'Primary phone' : 'Additional phone'}
                      />
                      {arr.length > 1 && (
                        <button
                          onClick={() => {
                            const phones = (profile.phone || '').split(',').map(p => p.trim()).filter((_, i) => i !== phIdx);
                            updateGstProfile(idx, 'phone', phones.join(', '));
                          }}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const current = profile.phone || '';
                      updateGstProfile(idx, 'phone', current ? current + ', ' : '');
                    }}
                    className="flex items-center gap-1 text-[10px] font-display font-semibold text-primary hover:text-primary/80 transition-colors mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Phone Number
                  </button>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Address</label>
                  <Input value={profile.address || ''} onChange={e => updateGstProfile(idx, 'address', e.target.value)} className="h-10" placeholder="Full business address" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" /> Invoice Prefix</label>
                  <Input value={profile.invoice_prefix || ''} onChange={e => updateGstProfile(idx, 'invoice_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} className="h-10 font-mono" placeholder="INV-R" maxLength={10} />
                  <p className="text-[10px] text-muted-foreground mt-1">Preview: <span className="font-mono font-semibold">{profile.invoice_prefix || 'INV'}-{String((profile.last_invoice_number || 0) + 1).padStart(4, '0')}</span></p>
                </div>
              </div>
            </div>
          ))}

          {gstProfiles.length > 0 && (
            <Button onClick={saveGstProfiles} className="gradient-primary border-0 text-primary-foreground">
              <Save className="w-4 h-4 mr-1.5" /> Save All Profiles
            </Button>
          )}
        </div>
      )}

      {/* ── General Settings ── */}
      {tab === 'general' && localSettings && (
        <div className="bg-card rounded-xl border p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-semibold">Enable Discounts</p>
              <p className="text-xs text-muted-foreground mt-0.5">Allow item and bill-level discounts during billing</p>
            </div>
            <button onClick={() => setLocalSettings({ ...localSettings, discount_enabled: !localSettings.discount_enabled })}
              className={`w-12 h-6 rounded-full transition-colors ${localSettings.discount_enabled ? 'bg-primary' : 'bg-border'}`}>
              <div className={`w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${localSettings.discount_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default GST %</label>
            <Input type="number" value={localSettings.default_gst_percent} onChange={e => setLocalSettings({ ...localSettings, default_gst_percent: parseFloat(e.target.value) || 0 })} className="w-28 h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Thermal Printer Width</label>
            <div className="flex bg-secondary rounded-lg p-0.5 w-fit">
              {['58mm', '80mm'].map(w => (
                <button key={w} onClick={() => setLocalSettings({ ...localSettings, thermal_width: w })}
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
                <button key={v} onClick={() => setLocalSettings({ ...localSettings, default_print_type: v })}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${localSettings.default_print_type === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  <Printer className="w-3.5 h-3.5" />{l}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSaveSettings} className="gradient-primary border-0 text-primary-foreground"><Save className="w-4 h-4 mr-1.5" /> Save Settings</Button>
        </div>
      )}

      {/* ── Invoice Customization ── */}
      {tab === 'invoice' && (
        <div className="space-y-5">
          {/* Bill Template Selection */}
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layout className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold">Bill Template</h3>
                <p className="text-xs text-muted-foreground">Choose the layout style for your invoices</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BILL_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t.id);
                    try { localStorage.setItem('bill_template', t.id); } catch {}
                  }}
                  className={`rounded-xl border p-4 text-left transition-all ${selectedTemplate === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent/30'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-display font-bold text-sm">{t.label}</p>
                    {selectedTemplate === t.id && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {/* Template preview mini */}
                  <div className="h-20 rounded-lg bg-secondary/50 border flex flex-col gap-1 p-2 mb-2">
                    {t.id === 'classic' && <>
                      <div className="h-2 w-3/4 bg-foreground/20 rounded mx-auto" />
                      <div className="h-1 w-1/2 bg-foreground/10 rounded mx-auto" />
                      <div className="border-t border-border/50 my-1" />
                      <div className="space-y-0.5">
                        {[0.8, 0.6, 0.9].map((w, i) => <div key={i} className="h-1 rounded" style={{ width: `${w * 100}%`, background: 'hsl(var(--foreground) / 0.1)' }} />)}
                      </div>
                    </>}
                    {t.id === 'modern' && <>
                      <div className="h-3 w-2/3 bg-primary/30 rounded mx-auto" />
                      <div className="h-1 w-1/3 bg-primary/20 rounded mx-auto" />
                      <div className="flex gap-1 mt-1">
                        {[1, 1, 1].map((_, i) => <div key={i} className="flex-1 h-4 bg-primary/10 rounded" />)}
                      </div>
                      <div className="h-2 w-1/3 bg-primary/20 rounded ml-auto mt-1" />
                    </>}
                    {t.id === 'compact' && <>
                      <div className="h-1.5 w-1/2 bg-foreground/20 rounded" />
                      {[0.9, 0.7, 0.8, 0.6].map((w, i) => <div key={i} className="h-1 rounded" style={{ width: `${w * 100}%`, background: 'hsl(var(--foreground) / 0.08)' }} />)}
                      <div className="h-1.5 w-1/3 bg-foreground/20 rounded ml-auto" />
                    </>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t.description}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 bg-accent/40 px-3 py-2 rounded-lg">
              💡 Template selection is saved and applied to all invoice previews and prints.
            </p>
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold">Terms & Conditions</h3>
              <p className="text-xs text-muted-foreground">Customize terms shown on invoices</p>
            </div>
          </div>

          {localShops.map(shop => (
            <div key={shop.id} className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display font-semibold text-sm">{shop.name} — Terms & Conditions</h4>
                {editingTermsShopId !== shop.id ? (
                  <Button variant="outline" size="sm" onClick={() => openTermsEditor(shop)}>Edit Terms</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTerms} className="gradient-primary border-0 text-primary-foreground"><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingTermsShopId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
              {editingTermsShopId === shop.id ? (
                <div className="space-y-2">
                  {editTerms.map((term, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs text-muted-foreground mt-2.5 w-6 flex-shrink-0">{i + 1}.</span>
                      <Input value={term} onChange={e => { const u = [...editTerms]; u[i] = e.target.value; setEditTerms(u); }} className="h-9 text-xs flex-1" />
                      <button onClick={() => setEditTerms(prev => prev.filter((_, idx) => idx !== i))} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all mt-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEditTerms(prev => [...prev, ''])}><Plus className="w-3.5 h-3.5 mr-1" /> Add Term</Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground space-y-1">
                  {(shop.terms_and_conditions || []).map((t, i) => <p key={i}>{t}</p>)}
                  {(!shop.terms_and_conditions || shop.terms_and_conditions.length === 0) && <p className="italic">Using default Tamil terms & conditions</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PIN Security ── */}
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

      {/* ── Team Members ── */}
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
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-display font-bold ${m.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
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
