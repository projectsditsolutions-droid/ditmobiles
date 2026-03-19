import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { calculateGST } from '@/lib/store';

import { CheckoutPanel } from '@/components/CheckoutPanel';
import { BillItemRow } from '@/components/BillItemRow';
import { InvoicePreview } from '@/components/InvoicePreview';
import {
  Search, Barcode, Keyboard, Receipt, ScanLine,
  Building2, ChevronDown, Store, Tag, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export interface GSTProfile {
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
}

type Product = Database['public']['Tables']['products']['Row'];

interface BillItem {
  id: string;
  productId: string;
  product: Product;
  imei?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  total: number;
}

export interface InvoiceData {
  id: string;
  invoice_number: string;
  shop_id: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_gst?: string;
  items: BillItem[];
  subtotal: number;
  total_discount: number;
  bill_discount: number;
  bill_discount_type: string;
  cgst: number;
  sgst: number;
  grand_total: number;
  payment_method: string;
  is_gst_bill: boolean;
  gst_bearer: string;
  print_type: string;
  status: string;
  billing_business_name?: string;
  billing_address?: string;
  billing_phone?: string;
  billing_gst_number?: string;
  profile_type?: string;
}

// ─── GST Profile Card Selector ───────────────────────────────────────────────
interface ProfileSelectorProps {
  profiles: GSTProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profiles, selectedId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = profiles.find(p => p.id === selectedId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (profiles.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-xl border border-border bg-card hover:bg-accent transition-all shadow-sm min-w-[200px] max-w-[280px]"
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
          selected?.profile_type === 'wholesale' ? 'bg-warning/15' : 'bg-primary/15'
        }`}>
          {selected?.profile_type === 'wholesale'
            ? <Store className="w-3.5 h-3.5 text-warning" />
            : <Building2 className="w-3.5 h-3.5 text-primary" />
          }
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-display font-bold text-foreground truncate">
            {selected?.profile_name || selected?.business_name || 'Select Profile'}
          </p>
          {selected && (
            <p className="text-[10px] text-muted-foreground truncate">
              {selected.gst_number || 'No GST'} · {selected.profile_type === 'wholesale' ? 'Wholesale' : 'Retail'}
            </p>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground px-3 pt-2.5 pb-1.5">
            Select Billing Profile
          </p>
          <div className="max-h-64 overflow-y-auto pb-1">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-accent transition-colors ${
                  selectedId === p.id ? 'bg-primary/8' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  p.profile_type === 'wholesale' ? 'bg-warning/15' : 'bg-primary/15'
                }`}>
                  {p.profile_type === 'wholesale'
                    ? <Store className="w-4 h-4 text-warning" />
                    : <Building2 className="w-4 h-4 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-display font-bold truncate">{p.profile_name || p.business_name}</p>
                    {p.is_default && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-display font-bold flex-shrink-0">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.business_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-display font-semibold ${
                      p.profile_type === 'wholesale' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                    }`}>
                      {p.profile_type === 'wholesale' ? 'Wholesale' : 'Retail'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{p.invoice_prefix}-XXXX</span>
                  </div>
                </div>
                {selectedId === p.id && (
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main POS Component ───────────────────────────────────────────────────────
export const POSBilling: React.FC = () => {
  const { user } = useAuth();
  const { activeShop, activeShopId, settings } = useShop();

  const [items, setItems] = useState<BillItem[]>([]);
  const [imeiInput, setImeiInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isGSTBill, setIsGSTBill] = useState(true);
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C');
  const [gstBearer, setGstBearer] = useState<'customer' | 'seller'>('customer');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'mixed'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [mixedPayment, setMixedPayment] = useState({ cash: 0, upi: 0, card: 0 });
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showInvoice, setShowInvoice] = useState<InvoiceData | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [gstProfiles, setGstProfiles] = useState<GSTProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const imeiRef = useRef<HTMLInputElement>(null);

  // Reset customer GST when switching to B2C
  useEffect(() => {
    if (customerType === 'B2C') setCustomerGST('');
  }, [customerType]);

  // Fetch GST profiles for this shop
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!activeShopId) return;
      const { data } = await supabase
        .from('shop_gst_profiles')
        .select('*')
        .eq('shop_id', activeShopId)
        .order('is_default', { ascending: false });
      if (data) {
        setGstProfiles(data as unknown as GSTProfile[]);
        const def = data.find((p: any) => p.is_default);
        setSelectedProfileId(def?.id || data[0]?.id || null);
      }
    };
    fetchProfiles();
  }, [activeShopId]);

  const selectedProfile = gstProfiles.find(p => p.id === selectedProfileId) || null;

  useEffect(() => { imeiRef.current?.focus(); }, []);

  const flashItem = (id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 500);
  };

  const addNewItem = (product: Product, imei?: string) => {
    const newItem: BillItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      product,
      imei,
      quantity: 1,
      unitPrice: Number(product.sale_price),
      discount: 0,
      discountType: 'flat',
      discountValue: 0,
      total: Number(product.sale_price),
    };
    setItems(prev => [...prev, newItem]);
    flashItem(newItem.id);
    return newItem;
  };

  const incrementExistingItem = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const nextQuantity = item.quantity + 1;
      const lineBase = item.unitPrice - item.discount;
      return { ...item, quantity: nextQuantity, total: lineBase * nextQuantity };
    }));
    flashItem(itemId);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setIsGSTBill(true); toast.info('GST Bill Mode'); }
      if (e.key === 'F3') { e.preventDefault(); setIsGSTBill(false); toast.info('Non-GST Bill Mode'); }
      if (e.key === 'F9') { e.preventDefault(); handleCompleteSale(); }
      if (e.key === 'Escape') { setShowSearch(false); setShowInvoice(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, customerName, customerPhone, customerGST, billDiscount, billDiscountType, paymentMethod, isGSTBill, gstBearer]);

  const handleIMEIScan = useCallback(async () => {
    const imei = imeiInput.trim();
    if (!imei || !activeShopId) return;

    if (items.some(i => i.imei === imei)) {
      toast.error('This IMEI is already added to the bill');
      setImeiInput('');
      return;
    }

    const { data: record } = await supabase
      .from('imei_records')
      .select('*, products(*)')
      .eq('imei', imei)
      .eq('shop_id', activeShopId)
      .eq('status', 'in_stock')
      .maybeSingle();

    if (!record) {
      toast.error('IMEI not found or already sold');
      setImeiInput('');
      return;
    }

    const product = record.products as unknown as Product;
    if (!product) {
      toast.error('Product not found for this IMEI');
      setImeiInput('');
      return;
    }

    addNewItem(product, imei);
    setImeiInput('');
    toast.success(`Added: ${product.brand} ${product.model}`);
  }, [imeiInput, items, activeShopId]);

  useEffect(() => {
    const runSearch = async () => {
      const q = searchInput.toLowerCase().trim();
      if (!showSearch || !q || !activeShopId) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', activeShopId)
        .or(`brand.ilike.%${q}%,model.ilike.%${q}%,variant.ilike.%${q}%,color.ilike.%${q}%`)
        .limit(12);
      setSearchResults(data || []);
    };
    const timer = window.setTimeout(runSearch, 180);
    return () => window.clearTimeout(timer);
  }, [searchInput, showSearch, activeShopId]);

  const addProductManually = async (product: Product) => {
    const existing = items.find(i => i.productId === product.id && !i.imei);
    if (existing) {
      incrementExistingItem(existing.id);
      setShowSearch(false);
      setSearchInput('');
      setSearchResults([]);
      toast.success(`Increased qty: ${product.brand} ${product.model}`);
      return;
    }

    const { data: imeiRecord } = await supabase
      .from('imei_records')
      .select('imei')
      .eq('product_id', product.id)
      .eq('shop_id', activeShopId!)
      .eq('status', 'in_stock')
      .limit(1)
      .maybeSingle();

    const usedImeis = items.map(i => i.imei).filter(Boolean);
    const imei = imeiRecord && !usedImeis.includes(imeiRecord.imei) ? imeiRecord.imei : undefined;

    addNewItem(product, imei);
    setShowSearch(false);
    setSearchInput('');
    setSearchResults([]);
    toast.success(`Added: ${product.brand} ${product.model}`);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItemDiscount = (id: string, value: number, type: 'percentage' | 'flat') => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const discount = type === 'percentage' ? (item.unitPrice * value / 100) : value;
      return { ...item, discountType: type, discountValue: value, discount, total: (item.unitPrice - discount) * item.quantity };
    }));
  };

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const itemDiscountTotal = items.reduce((sum, i) => sum + i.discount * i.quantity, 0);
  const billDiscountAmount = billDiscountType === 'percentage' ? subtotal * billDiscount / 100 : billDiscount;
  const totalAfterDiscount = subtotal - itemDiscountTotal - billDiscountAmount;
  const avgGST = items.length > 0 ? items.reduce((sum, i) => sum + Number(i.product.gst_percent), 0) / items.length : 18;
  const gstCalc = isGSTBill ? calculateGST(totalAfterDiscount, avgGST) : { cgst: 0, sgst: 0, taxableAmount: totalAfterDiscount, totalGST: 0 };
  const grandTotal = Math.round(totalAfterDiscount);

  const handleCompleteSale = useCallback(async () => {
    if (items.length === 0) { toast.error('Add items to bill first'); return; }
    if (!activeShop || !activeShopId || !user) return;

    // Use per-profile invoice numbering if a profile is selected
    let invoiceNumber: string;
    if (selectedProfile) {
      const nextNum = (selectedProfile.last_invoice_number || 0) + 1;
      const prefix = selectedProfile.invoice_prefix || (
        selectedProfile.profile_type === 'wholesale' ? 'INV-W' : 'INV-R'
      );
      invoiceNumber = `${prefix}-${String(nextNum).padStart(4, '0')}`;
      // Increment the profile's invoice counter
      await supabase
        .from('shop_gst_profiles')
        .update({ last_invoice_number: nextNum } as any)
        .eq('id', selectedProfile.id);
      // Update local state
      setGstProfiles(prev => prev.map(p =>
        p.id === selectedProfile.id ? { ...p, last_invoice_number: nextNum } : p
      ));
    } else {
      const nextNum = (activeShop.last_invoice_number || 0) + 1;
      invoiceNumber = `${activeShop.invoice_prefix}-${String(nextNum).padStart(4, '0')}`;
      await supabase.from('shops').update({ last_invoice_number: nextNum }).eq('id', activeShopId);
    }

    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      shop_id: activeShopId,
      user_id: user.id,
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone,
      customer_gst: customerType === 'B2B' ? (customerGST || null) : null,
      subtotal,
      total_discount: itemDiscountTotal + billDiscountAmount,
      bill_discount: billDiscountAmount,
      bill_discount_type: billDiscountType,
      cgst: gstCalc.cgst,
      sgst: gstCalc.sgst,
      grand_total: grandTotal,
      payment_method: paymentMethod,
      is_gst_bill: isGSTBill,
      gst_bearer: gstBearer,
      print_type: settings?.default_print_type || 'thermal',
      status: 'completed',
      gst_profile_id: selectedProfile?.id || null,
      billing_business_name: selectedProfile?.business_name || activeShop.name,
      billing_address: selectedProfile?.address || activeShop.address,
      billing_phone: selectedProfile?.phone || activeShop.phone,
      billing_gst_number: selectedProfile?.gst_number || activeShop.gst_number,
    } as any).select().single();

    if (invError || !invoice) {
      toast.error(`Failed to save invoice: ${invError?.message}`);
      return;
    }

    const invoiceItems = items.map(item => ({
      invoice_id: invoice.id,
      product_id: item.productId,
      imei: item.imei || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount: item.discount,
      discount_type: item.discountType,
      discount_value: item.discountValue,
      total: item.total,
    }));
    await supabase.from('invoice_items').insert(invoiceItems);

    for (const item of items) {
      if (item.imei) {
        const { data: imeiRecord } = await supabase
          .from('imei_records')
          .select('dealer_id, purchase_price')
          .eq('imei', item.imei)
          .maybeSingle();

        await supabase.from('imei_records').update({
          status: 'sold',
          sold_date: new Date().toISOString(),
          invoice_id: invoice.id,
        }).eq('imei', item.imei);

        if (imeiRecord?.dealer_id) {
          const { data: dealer } = await supabase
            .from('dealers')
            .select('total_credit')
            .eq('id', imeiRecord.dealer_id)
            .single();

          if (dealer) {
            const costValue = Number(imeiRecord.purchase_price || 0);
            const newBalance = Number(dealer.total_credit) - costValue;
            await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', imeiRecord.dealer_id);
            await supabase.from('dealer_transactions').insert({
              dealer_id: imeiRecord.dealer_id,
              shop_id: activeShopId,
              type: 'sale_deduction',
              amount: costValue,
              running_balance: newBalance,
              description: `Sale deduction for ${item.product.brand} ${item.product.model} (IMEI: ${item.imei})`,
              invoice_ref: invoiceNumber,
              imei_ref: item.imei,
            });
          }
        }

        await supabase.rpc('decrement_stock', { p_product_id: item.productId } as any);
      }
    }

    const invoiceData: InvoiceData = {
      id: invoice.id,
      invoice_number: invoiceNumber,
      shop_id: activeShopId,
      date: invoice.date,
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone,
      customer_gst: customerType === 'B2B' ? (customerGST || undefined) : undefined,
      items,
      subtotal,
      total_discount: itemDiscountTotal + billDiscountAmount,
      bill_discount: billDiscountAmount,
      bill_discount_type: billDiscountType,
      cgst: gstCalc.cgst,
      sgst: gstCalc.sgst,
      grand_total: grandTotal,
      payment_method: paymentMethod,
      is_gst_bill: isGSTBill,
      gst_bearer: gstBearer,
      print_type: settings?.default_print_type || 'thermal',
      status: 'completed',
      billing_business_name: selectedProfile?.business_name || activeShop.name,
      billing_address: selectedProfile?.address || activeShop.address,
      billing_phone: selectedProfile?.phone || activeShop.phone,
      billing_gst_number: selectedProfile?.gst_number || activeShop.gst_number,
      profile_type: selectedProfile?.profile_type,
    };

    setShowInvoice(invoiceData);
    toast.success(`Sale completed! Invoice: ${invoiceNumber}`);

    setItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGST('');
    setBillDiscount(0);
  }, [items, customerName, customerPhone, customerGST, customerType, subtotal, itemDiscountTotal, billDiscountAmount, billDiscountType, gstCalc, grandTotal, paymentMethod, isGSTBill, gstBearer, settings, activeShop, activeShopId, user, selectedProfile]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top Bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 h-14 bg-card border-b flex-wrap">
          {/* GST Profile Selector */}
          <ProfileSelector
            profiles={gstProfiles}
            selectedId={selectedProfileId}
            onSelect={setSelectedProfileId}
          />

          {/* Profile active indicator */}
          {selectedProfile && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border">
              <Tag className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-display font-semibold text-muted-foreground">
                {selectedProfile.invoice_prefix}-{String((selectedProfile.last_invoice_number || 0) + 1).padStart(4, '0')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* GST / Non-GST toggle */}
            <div className="flex bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setIsGSTBill(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${isGSTBill ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                GST <span className="opacity-50 ml-0.5">F2</span>
              </button>
              <button
                onClick={() => setIsGSTBill(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${!isGSTBill ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Non-GST <span className="opacity-50 ml-0.5">F3</span>
              </button>
            </div>

            {/* B2B / B2C Toggle */}
            {isGSTBill && (
              <div className="flex bg-secondary rounded-lg p-0.5">
                <button
                  onClick={() => setCustomerType('B2C')}
                  className={`px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${customerType === 'B2C' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  B2C
                </button>
                <button
                  onClick={() => setCustomerType('B2B')}
                  className={`px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${customerType === 'B2B' ? 'bg-warning text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  B2B
                </button>
              </div>
            )}

            {/* GST Bearer */}
            {isGSTBill && (
              <select
                value={gstBearer}
                onChange={e => setGstBearer(e.target.value as 'customer' | 'seller')}
                className="h-8 px-2 rounded-md border border-input bg-card text-xs font-display font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="customer">Customer bears GST</option>
                <option value="seller">Seller bears GST</option>
              </select>
            )}
          </div>
        </div>

        {/* ── IMEI Scan Bar ────────────────────────────────────────────── */}
        <div className="px-4 py-3 bg-card border-b">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <ScanLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <input
                ref={imeiRef}
                value={imeiInput}
                onChange={e => setImeiInput(e.target.value.replace(/\s/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter') handleIMEIScan(); }}
                placeholder="Scan IMEI barcode or type IMEI..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-primary/20 bg-accent/30 font-display text-lg tracking-wider focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/40 placeholder:tracking-normal placeholder:text-sm transition-all"
              />
            </div>
            <Button size="lg" className="h-12 px-6 gradient-primary border-0 text-primary-foreground shadow-sm" onClick={handleIMEIScan}>
              <Barcode className="w-5 h-5 mr-2" /> Add
            </Button>
            <Button variant="outline" size="lg" className="h-12" onClick={() => setShowSearch(!showSearch)}>
              <Search className="w-5 h-5" />
            </Button>
          </div>

          {showSearch && (
            <div className="mt-3 animate-in rounded-2xl border bg-card p-3 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by brand, model, variant or color..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-card text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  autoFocus
                />
              </div>
              {searchInput.trim() && (
                <p className="mt-2 text-[11px] text-muted-foreground">Filtered products: {searchResults.length}</p>
              )}
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border bg-card">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => addProductManually(p)}
                      className="w-full text-left px-4 py-3 hover:bg-accent text-sm border-b last:border-b-0 flex justify-between items-center transition-colors">
                      <div>
                        <span className="font-display font-semibold">{p.brand} {p.model}</span>
                        <div className="text-muted-foreground text-xs mt-0.5">{p.variant || 'Standard'} · {p.color || 'Default'} · Stock {p.stock_quantity}</div>
                      </div>
                      <span className="price-text text-primary">₹{Number(p.sale_price).toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchInput.trim() && searchResults.length === 0 && (
                <div className="mt-2 rounded-xl bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">No matching products found</div>
              )}
            </div>
          )}
        </div>

        {/* ── Keyboard shortcuts ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-1.5 bg-secondary/30 text-[11px] text-muted-foreground font-display font-medium">
          <Keyboard className="w-3.5 h-3.5" />
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">F2</span> GST
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">F3</span> Non-GST
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">F9</span> Print & Save
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">ESC</span> Close
          {selectedProfile && (
            <>
              <span className="text-border mx-1">|</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedProfile.profile_type === 'wholesale' ? 'bg-warning/15 text-warning' : 'bg-primary/15 text-primary'
              }`}>
                {selectedProfile.profile_type === 'wholesale' ? '🏪 Wholesale' : '🏬 Retail'} · {selectedProfile.business_name}
              </span>
            </>
          )}
        </div>

        {/* ── Bill Items Table ─────────────────────────────────────────── */}
        <div className="flex-1 pos-scrollable">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                <Receipt className="w-10 h-10 text-accent-foreground/40" />
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-semibold text-foreground/60">Ready for billing</p>
                <p className="text-sm mt-1">Scan IMEI barcode or search products to start</p>
                {selectedProfile && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    Billing as: <span className="font-semibold text-foreground">{selectedProfile.business_name}</span>
                    {selectedProfile.gst_number && <span className="ml-1 text-primary">({selectedProfile.gst_number})</span>}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 sticky top-0 z-10">
                <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2.5 w-8">#</th>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">IMEI</th>
                  <th className="px-4 py-2.5 text-right">Price</th>
                  <th className="px-4 py-2.5 text-right">Disc.</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <BillItemRow
                    key={item.id}
                    item={item}
                    index={idx}
                    flash={flashId === item.id}
                    onRemove={() => removeItem(item.id)}
                    onUpdateDiscount={(val, type) => updateItemDiscount(item.id, val, type)}
                    discountEnabled={settings?.discount_enabled ?? true}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CheckoutPanel
        items={items}
        subtotal={subtotal}
        itemDiscountTotal={itemDiscountTotal}
        billDiscount={billDiscount}
        billDiscountType={billDiscountType}
        billDiscountAmount={billDiscountAmount}
        gstCalc={gstCalc}
        grandTotal={grandTotal}
        isGSTBill={isGSTBill}
        gstBearer={gstBearer}
        customerType={customerType}
        paymentMethod={paymentMethod}
        customerName={customerName}
        customerPhone={customerPhone}
        customerGST={customerGST}
        onBillDiscountChange={setBillDiscount}
        onBillDiscountTypeChange={setBillDiscountType}
        onPaymentMethodChange={setPaymentMethod}
        onCustomerNameChange={setCustomerName}
        onCustomerPhoneChange={setCustomerPhone}
        onCustomerGSTChange={setCustomerGST}
        onCompleteSale={handleCompleteSale}
        discountEnabled={settings?.discount_enabled ?? true}
      />

      {showInvoice && (
        <InvoicePreview invoice={showInvoice} onClose={() => setShowInvoice(null)} />
      )}
    </div>
  );
};
