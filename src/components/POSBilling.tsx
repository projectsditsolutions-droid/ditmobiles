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
  Building2, ChevronDown, Store, Tag, CheckCircle2, AlertTriangle, CalendarIcon,
  Edit2, X
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
  sub_heading: string;
  logo_url?: string | null;
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
  billing_sub_heading?: string;
  billing_logo_url?: string;
  profile_type?: string;
  warranty_mobile?: string;
  warranty_accessories?: string;
  customer_address?: string;
  emi_lending_partner?: string;
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
interface POSBillingProps {
  editingInvoice?: InvoiceData | null;
  onCancelEdit?: () => void;
}

export const POSBilling: React.FC<POSBillingProps> = ({ editingInvoice, onCancelEdit }) => {
  const { user } = useAuth();
  const { activeShop, activeShopId, settings } = useShop();

  const [items, setItems] = useState<BillItem[]>([]);
  const [imeiInput, setImeiInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isGSTBill, setIsGSTBill] = useState(true);
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C');
  const [gstBearer, setGstBearer] = useState<'customer' | 'seller'>('customer');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'mixed' | 'emi'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [mixedPayment, setMixedPayment] = useState({ cash: 0, upi: 0, card: 0, emi: 0 });
  const [warrantyMobile, setWarrantyMobile] = useState('1 Year Manufacturer Warranty');
  const [warrantyAccessories, setWarrantyAccessories] = useState('6 Months Warranty');
  const [emiLendingPartner, setEmiLendingPartner] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [isDateManual, setIsDateManual] = useState(false);

  // Keep billDate synced to current time unless manually edited
  useEffect(() => {
    if (isDateManual) return;
    const tick = () => setBillDate(new Date().toISOString().slice(0, 16));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [isDateManual]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showInvoice, setShowInvoice] = useState<InvoiceData | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceData | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [gstProfiles, setGstProfiles] = useState<GSTProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const imeiRef = useRef<HTMLInputElement>(null);
  const imeiAutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imeiFlash, setImeiFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const editLoadedRef = useRef<string | null>(null);

  // Load editing invoice into form
  useEffect(() => {
    if (editingInvoice && editingInvoice.id !== editLoadedRef.current) {
      editLoadedRef.current = editingInvoice.id;
      setEditMode(true);
      setEditInvoiceId(editingInvoice.id);
      setItems(editingInvoice.items);
      setCustomerName(editingInvoice.customer_name || '');
      setCustomerPhone(editingInvoice.customer_phone || '');
      setCustomerGST(editingInvoice.customer_gst || '');
      setCustomerAddress(editingInvoice.customer_address || '');
      setIsGSTBill(editingInvoice.is_gst_bill);
      setCustomerType(editingInvoice.customer_gst ? 'B2B' : 'B2C');
      setGstBearer(editingInvoice.gst_bearer as 'customer' | 'seller');
      setPaymentMethod(editingInvoice.payment_method as any);
      setBillDiscount(editingInvoice.bill_discount || 0);
      setBillDiscountType((editingInvoice.bill_discount_type || 'flat') as 'percentage' | 'flat');
      setWarrantyMobile(editingInvoice.warranty_mobile || '');
      setWarrantyAccessories(editingInvoice.warranty_accessories || '');
      setEmiLendingPartner(editingInvoice.emi_lending_partner || '');
      if (editingInvoice.date) {
        setBillDate(new Date(editingInvoice.date).toISOString().slice(0, 16));
        setIsDateManual(true);
      }
      if ((editingInvoice as any).payment_details) {
        setMixedPayment((editingInvoice as any).payment_details);
      }
      toast.info(`Editing invoice: ${editingInvoice.invoice_number}`);
    }
  }, [editingInvoice]);

  const cancelEdit = () => {
    setEditMode(false);
    setEditInvoiceId(null);
    editLoadedRef.current = null;
    setItems([]);
    scanningImeiRef.current.clear();
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGST('');
    setCustomerAddress('');
    setMixedPayment({ cash: 0, upi: 0, card: 0, emi: 0 });
    setBillDiscount(0);
    setWarrantyMobile('1 Year Manufacturer Warranty');
    setWarrantyAccessories('6 Months Warranty');
    setEmiLendingPartner('');
    setBillDate(new Date().toISOString().slice(0, 16));
    setIsDateManual(false);
    onCancelEdit?.();
  };

  // Reset customer GST when switching to B2C (but not during edit load)
  useEffect(() => {
    if (customerType === 'B2C' && !editMode) setCustomerGST('');
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
    // Stock availability check
    const currentQtyInBill = items.filter(i => i.productId === product.id).reduce((sum, i) => sum + i.quantity, 0);
    if (product.stock_quantity <= currentQtyInBill) {
      toast.error(`Out of stock: ${product.brand} ${product.model} (Available: ${product.stock_quantity})`);
      return null;
    }

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
    const item = items.find(i => i.id === itemId);
    if (item) {
      const currentQtyInBill = items.filter(i => i.productId === item.productId).reduce((sum, i) => sum + i.quantity, 0);
      if (item.product.stock_quantity <= currentQtyInBill) {
        toast.error(`Out of stock: ${item.product.brand} ${item.product.model} (Available: ${item.product.stock_quantity})`);
        return;
      }
    }
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

  const scanningImeiRef = useRef<Set<string>>(new Set());

  const handleIMEIScan = useCallback(async (overrideImei?: string) => {
    const imei = (overrideImei || imeiInput).trim();
    if (!imei || !activeShopId) return;

    // Prevent concurrent scans of the same IMEI
    if (scanningImeiRef.current.has(imei)) return;
    scanningImeiRef.current.add(imei);

    try {
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
      setImeiFlash(true);
      setTimeout(() => setImeiFlash(false), 600);
      toast.success(`Added: ${product.brand} ${product.model}`);
    } finally {
      // Don't remove from ref here — keep it to prevent race conditions
      // with stale `items` state. Ref is cleared on sale completion.
    }
  }, [imeiInput, items, activeShopId]);

  const handleImeiInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setImeiInput(val);
    if (imeiAutoRef.current) clearTimeout(imeiAutoRef.current);
    if (val.length >= 15) {
      const imei = val.slice(0, 15);
      // Debounce longer to prevent barcode scanner double-fire
      imeiAutoRef.current = setTimeout(() => {
        setImeiInput(''); // Clear immediately to prevent re-trigger
        handleIMEIScan(imei);
      }, 150);
    }
  }, [handleIMEIScan]);

  useEffect(() => {
    return () => { if (imeiAutoRef.current) clearTimeout(imeiAutoRef.current); };
  }, []);

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
    // Stock check
    const currentQtyInBill = items.filter(i => i.productId === product.id).reduce((sum, i) => sum + i.quantity, 0);
    if (product.stock_quantity <= currentQtyInBill) {
      toast.error(`Out of stock: ${product.brand} ${product.model}`);
      return;
    }

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

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.imei) scanningImeiRef.current.delete(item.imei);
      return prev.filter(i => i.id !== id);
    });
  };

  const updateItemDiscount = (id: string, value: number, type: 'percentage' | 'flat') => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const discount = type === 'percentage' ? (item.unitPrice * value / 100) : value;
      return { ...item, discountType: type, discountValue: value, discount, total: (item.unitPrice - discount) * item.quantity };
    }));
  };

  const updateItemPrice = (id: string, price: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const discount = item.discountType === 'percentage' ? (price * item.discountValue / 100) : item.discountValue;
      return { ...item, unitPrice: price, discount, total: (price - discount) * item.quantity };
    }));
  };

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const itemDiscountTotal = items.reduce((sum, i) => sum + i.discount * i.quantity, 0);
  const billDiscountAmount = billDiscountType === 'percentage' ? subtotal * billDiscount / 100 : billDiscount;
  const totalAfterDiscount = subtotal - itemDiscountTotal - billDiscountAmount;
  const avgGST = items.length > 0 ? items.reduce((sum, i) => sum + Number(i.product.gst_percent), 0) / items.length : 18;
  const gstCalc = isGSTBill ? calculateGST(totalAfterDiscount, avgGST) : { cgst: 0, sgst: 0, taxableAmount: totalAfterDiscount, totalGST: 0 };
  const grandTotal = Math.round(totalAfterDiscount);

  const handlePreviewBill = useCallback(() => {
    if (items.length === 0) { toast.error('Add items to bill first'); return; }
    if (!activeShop || !activeShopId) return;
    const preview: InvoiceData = {
      id: 'preview',
      invoice_number: 'PREVIEW',
      shop_id: activeShopId,
      date: new Date(billDate).toISOString(),
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
      status: 'preview',
      billing_business_name: selectedProfile?.business_name || activeShop.name,
      billing_address: selectedProfile?.address || activeShop.address,
      billing_phone: selectedProfile?.phone || activeShop.phone,
      billing_gst_number: selectedProfile?.gst_number || activeShop.gst_number,
      billing_sub_heading: selectedProfile?.sub_heading || (activeShop as any).sub_heading || '',
      billing_logo_url: selectedProfile?.logo_url || activeShop.logo_url || '',
      profile_type: selectedProfile?.profile_type,
      warranty_mobile: warrantyMobile || undefined,
      warranty_accessories: warrantyAccessories || undefined,
      customer_address: customerAddress || undefined,
      emi_lending_partner: (paymentMethod === 'emi' || (paymentMethod === 'mixed' && mixedPayment.emi > 0)) ? emiLendingPartner : undefined,
    };
    setPreviewInvoice(preview);
  }, [items, customerName, customerPhone, customerGST, customerType, customerAddress, subtotal, itemDiscountTotal, billDiscountAmount, billDiscountType, gstCalc, grandTotal, paymentMethod, isGSTBill, gstBearer, settings, activeShop, activeShopId, selectedProfile, warrantyMobile, warrantyAccessories, emiLendingPartner, mixedPayment, billDate]);

  const handleCompleteSale = useCallback(async () => {
    if (saving) return;
    if (items.length === 0) { toast.error('Add items to bill first'); return; }
    if (!activeShop || !activeShopId || !user) return;
    setSaving(true);
    try {

    // ─── EDIT MODE: Update existing invoice ───────────────────────────
    if (editMode && editInvoiceId) {
      const invoiceNumber = editingInvoice?.invoice_number || '';

      // Auto-save / link customer
      let customerId: string | null = null;
      if (customerPhone.length >= 10) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id, total_purchases')
          .eq('shop_id', activeShopId)
          .eq('phone', customerPhone)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
          await supabase.from('customers').update({
            name: customerName || existing.id,
            address: customerAddress || '',
            gstin: customerGST || '',
          }).eq('id', existing.id);
        }
      }

      // Update the invoice record
      const { error: updErr } = await supabase.from('invoices').update({
        date: new Date(billDate).toISOString(),
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone,
        customer_gst: customerType === 'B2B' ? (customerGST || null) : null,
        customer_id: customerId,
        subtotal,
        total_discount: itemDiscountTotal + billDiscountAmount,
        bill_discount: billDiscountAmount,
        bill_discount_type: billDiscountType,
        cgst: gstCalc.cgst,
        sgst: gstCalc.sgst,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        payment_details: paymentMethod === 'mixed' ? mixedPayment : null,
        customer_address: customerAddress,
        is_gst_bill: isGSTBill,
        gst_bearer: gstBearer,
        billing_business_name: selectedProfile?.business_name || activeShop.name,
        billing_address: selectedProfile?.address || activeShop.address,
        billing_phone: selectedProfile?.phone || activeShop.phone,
        billing_gst_number: selectedProfile?.gst_number || activeShop.gst_number,
        billing_sub_heading: selectedProfile?.sub_heading || (activeShop as any).sub_heading || '',
        billing_logo_url: selectedProfile?.logo_url || activeShop.logo_url || '',
        warranty_mobile: warrantyMobile || '',
        warranty_accessories: warrantyAccessories || '',
        emi_lending_partner: (paymentMethod === 'emi' || (paymentMethod === 'mixed' && mixedPayment.emi > 0)) ? emiLendingPartner : '',
      } as any).eq('id', editInvoiceId);

      if (updErr) {
        toast.error(`Failed to update invoice: ${updErr.message}`);
        return;
      }

      // ── Inventory reconciliation: compare old vs new items ──
      // Fetch old invoice items to determine what changed
      const { data: oldItems } = await supabase
        .from('invoice_items')
        .select('*, products(*)')
        .eq('invoice_id', editInvoiceId);

      const oldImeis = new Set((oldItems || []).map((i: any) => i.imei).filter(Boolean));
      const newImeis = new Set(items.map(i => i.imei).filter(Boolean));

      // IMEIs removed from invoice → revert to in_stock + increment stock
      for (const oldItem of (oldItems || [])) {
        if (oldItem.imei && !newImeis.has(oldItem.imei)) {
          await supabase.from('imei_records').update({
            status: 'in_stock',
            sold_date: null,
            invoice_id: null,
          }).eq('imei', oldItem.imei).eq('shop_id', activeShopId);
          // Increment stock back
          await supabase.from('products').update({
            stock_quantity: (oldItem.products as any).stock_quantity + 1,
          }).eq('id', oldItem.product_id);
        }
      }

      // IMEIs newly added to invoice → mark as sold + decrement stock
      for (const item of items) {
        if (item.imei && !oldImeis.has(item.imei)) {
          await supabase.from('imei_records').update({
            status: 'sold',
            sold_date: new Date().toISOString(),
            invoice_id: editInvoiceId,
          }).eq('imei', item.imei).eq('shop_id', activeShopId);
          await supabase.rpc('decrement_stock', { p_product_id: item.productId } as any);
        }
      }

      // Delete old invoice items and re-insert
      await supabase.from('invoice_items').delete().eq('invoice_id', editInvoiceId);
      const invoiceItems = items.map(item => ({
        invoice_id: editInvoiceId,
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

      const invoiceData: InvoiceData = {
        id: editInvoiceId,
        invoice_number: invoiceNumber,
        shop_id: activeShopId,
        date: new Date(billDate).toISOString(),
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
        billing_sub_heading: selectedProfile?.sub_heading || (activeShop as any).sub_heading || '',
        billing_logo_url: selectedProfile?.logo_url || activeShop.logo_url || '',
        profile_type: selectedProfile?.profile_type,
        warranty_mobile: warrantyMobile || undefined,
        warranty_accessories: warrantyAccessories || undefined,
        customer_address: customerAddress || undefined,
        emi_lending_partner: (paymentMethod === 'emi' || (paymentMethod === 'mixed' && mixedPayment.emi > 0)) ? emiLendingPartner : undefined,
      };
      if (paymentMethod === 'mixed') (invoiceData as any).payment_details = mixedPayment;

      setShowInvoice(invoiceData);
      toast.success(`Invoice updated: ${invoiceNumber}`);
      cancelEdit();
      return;
    }

    // ─── NEW MODE: Create new invoice ─────────────────────────────────
    // Use ATOMIC DB functions to prevent duplicate invoice numbers under concurrent saves
    let invoiceNumber: string;
    if (selectedProfile) {
      const { data: numData, error: numErr } = await supabase
        .rpc('get_next_profile_invoice_number', { p_profile_id: selectedProfile.id } as any)
        .single();
      if (numErr || !numData) { toast.error('Failed to generate invoice number'); return; }
      invoiceNumber = (numData as any).invoice_number;
      // Refresh local profile state to reflect new counter
      setGstProfiles(prev => prev.map(p =>
        p.id === selectedProfile.id ? { ...p, last_invoice_number: (numData as any).next_num } : p
      ));
    } else {
      const { data: numData, error: numErr } = await supabase
        .rpc('get_next_invoice_number', { p_shop_id: activeShopId } as any)
        .single();
      if (numErr || !numData) { toast.error('Failed to generate invoice number'); return; }
      invoiceNumber = (numData as any).invoice_number;
    }

    // Auto-save / link customer
    let customerId: string | null = null;
    if (customerPhone.length >= 10) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id, total_purchases')
        .eq('shop_id', activeShopId)
        .eq('phone', customerPhone)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
        await supabase.from('customers').update({
          name: customerName || existing.id,
          address: customerAddress || '',
          gstin: customerGST || '',
          total_purchases: Number(existing.total_purchases) + grandTotal,
          last_purchase_date: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        const { data: newCust } = await supabase.from('customers').insert({
          shop_id: activeShopId,
          name: customerName || 'Walk-in Customer',
          phone: customerPhone,
          address: customerAddress || '',
          gstin: customerGST || '',
          total_purchases: grandTotal,
          last_purchase_date: new Date().toISOString(),
        }).select('id').single();
        if (newCust) customerId = newCust.id;
      }
    }

    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      shop_id: activeShopId,
      user_id: user.id,
      date: new Date(billDate).toISOString(),
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone,
      customer_gst: customerType === 'B2B' ? (customerGST || null) : null,
      customer_id: customerId,
      subtotal,
      total_discount: itemDiscountTotal + billDiscountAmount,
      bill_discount: billDiscountAmount,
      bill_discount_type: billDiscountType,
      cgst: gstCalc.cgst,
      sgst: gstCalc.sgst,
      grand_total: grandTotal,
      payment_method: paymentMethod,
      payment_details: paymentMethod === 'mixed' ? mixedPayment : null,
      customer_address: customerAddress,
      is_gst_bill: isGSTBill,
      gst_bearer: gstBearer,
      print_type: settings?.default_print_type || 'thermal',
      status: 'completed',
      gst_profile_id: selectedProfile?.id || null,
      billing_business_name: selectedProfile?.business_name || activeShop.name,
      billing_address: selectedProfile?.address || activeShop.address,
      billing_phone: selectedProfile?.phone || activeShop.phone,
      billing_gst_number: selectedProfile?.gst_number || activeShop.gst_number,
      billing_sub_heading: selectedProfile?.sub_heading || (activeShop as any).sub_heading || '',
      billing_logo_url: selectedProfile?.logo_url || activeShop.logo_url || '',
      warranty_mobile: warrantyMobile || '',
      warranty_accessories: warrantyAccessories || '',
      emi_lending_partner: (paymentMethod === 'emi' || (paymentMethod === 'mixed' && mixedPayment.emi > 0)) ? emiLendingPartner : '',
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
            await supabase.from('dealer_transactions').insert({
              dealer_id: imeiRecord.dealer_id,
              shop_id: activeShopId,
              type: 'sale_deduction',
              amount: costValue,
              running_balance: Number(dealer.total_credit),
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
      date: new Date(billDate).toISOString(),
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
      billing_sub_heading: selectedProfile?.sub_heading || (activeShop as any).sub_heading || '',
      billing_logo_url: selectedProfile?.logo_url || activeShop.logo_url || '',
      profile_type: selectedProfile?.profile_type,
      warranty_mobile: warrantyMobile || undefined,
      warranty_accessories: warrantyAccessories || undefined,
      customer_address: customerAddress || undefined,
      emi_lending_partner: (paymentMethod === 'emi' || (paymentMethod === 'mixed' && mixedPayment.emi > 0)) ? emiLendingPartner : undefined,
    };
    if (paymentMethod === 'mixed') (invoiceData as any).payment_details = mixedPayment;

    setShowInvoice(invoiceData);
    toast.success(`Sale completed! Invoice: ${invoiceNumber}`);

    setItems([]);
    scanningImeiRef.current.clear();
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGST('');
    setCustomerAddress('');
    setMixedPayment({ cash: 0, upi: 0, card: 0, emi: 0 });
    setBillDiscount(0);
    setWarrantyMobile('1 Year Manufacturer Warranty');
    setWarrantyAccessories('6 Months Warranty');
    setEmiLendingPartner('');
    setBillDate(new Date().toISOString().slice(0, 16));
    setIsDateManual(false);
    } finally { setSaving(false); }
  }, [saving, items, customerName, customerPhone, customerGST, customerType, customerAddress, subtotal, itemDiscountTotal, billDiscountAmount, billDiscountType, gstCalc, grandTotal, paymentMethod, isGSTBill, gstBearer, settings, activeShop, activeShopId, user, selectedProfile, warrantyMobile, warrantyAccessories, mixedPayment, emiLendingPartner, billDate, editMode, editInvoiceId, editingInvoice]);

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Edit Mode Banner ──────────────────────────────────────────── */}
        {editMode && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-warning/15 border-b border-warning/30">
            <Edit2 className="w-4 h-4 text-warning" />
            <span className="text-sm font-display font-bold text-warning">
              Editing Invoice: {editingInvoice?.invoice_number}
            </span>
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={cancelEdit}>
              <X className="w-3 h-3 mr-1" /> Cancel Edit
            </Button>
          </div>
        )}

        {/* ── Top Bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 h-14 bg-card border-b flex-wrap">
          <ProfileSelector
            profiles={gstProfiles}
            selectedId={selectedProfileId}
            onSelect={setSelectedProfileId}
          />

          {selectedProfile && !editMode && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border">
              <Tag className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-display font-semibold text-muted-foreground">
                {selectedProfile.invoice_prefix}-{String((selectedProfile.last_invoice_number || 0) + 1).padStart(4, '0')}
              </span>
            </div>
          )}
          {editMode && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning/10 border border-warning/30">
              <Tag className="w-3 h-3 text-warning" />
              <span className="text-[10px] font-display font-semibold text-warning">
                {editingInvoice?.invoice_number}
              </span>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border">
            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
            <input
              type="datetime-local"
              value={billDate}
              onChange={e => { setBillDate(e.target.value); setIsDateManual(true); }}
              className="bg-transparent text-[10px] font-display font-semibold text-muted-foreground focus:outline-none w-[140px]"
            />
            {isDateManual && (
              <button
                type="button"
                onClick={() => setIsDateManual(false)}
                className="text-[9px] text-primary hover:underline ml-0.5 whitespace-nowrap"
                title="Reset to current time"
              >
                Live
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
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
            <div className={`flex-1 relative transition-all duration-300 ${imeiFlash ? 'ring-2 ring-green-500/60 rounded-xl' : ''}`}>
              <ScanLine className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${imeiFlash ? 'text-green-500' : 'text-primary'}`} />
              <input
                ref={imeiRef}
                value={imeiInput}
                onChange={handleImeiInputChange}
                onKeyDown={e => { if (e.key === 'Enter') handleIMEIScan(); }}
                placeholder="Scan IMEI barcode — auto-adds at 15 digits"
                inputMode="numeric"
                className="w-full h-12 pl-12 pr-16 rounded-xl border-2 border-primary/20 bg-accent/30 font-display text-lg tracking-wider focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/40 placeholder:tracking-normal placeholder:text-sm transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
                {imeiInput.length}/15
              </span>
            </div>
            <Button size="lg" className="h-12 px-6 gradient-primary border-0 text-primary-foreground shadow-sm" onClick={() => handleIMEIScan()}>
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
                      className={`w-full text-left px-4 py-3 hover:bg-accent text-sm border-b last:border-b-0 flex justify-between items-center transition-colors ${p.stock_quantity <= 0 ? 'opacity-50' : ''}`}>
                      <div>
                        <span className="font-display font-semibold">{p.brand} {p.model}</span>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          {p.variant || 'Standard'} · {p.color || 'Default'} · 
                          <span className={p.stock_quantity <= 0 ? 'text-destructive font-semibold' : ''}>
                            Stock {p.stock_quantity}
                          </span>
                          {p.stock_quantity <= 0 && <AlertTriangle className="w-3 h-3 inline ml-1 text-destructive" />}
                        </div>
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
        <div className="flex items-center gap-3 px-4 py-1.5 bg-secondary/30 text-[11px] text-muted-foreground font-display font-medium flex-wrap">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
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
                      onUpdatePrice={(price) => updateItemPrice(item.id, price)}
                      discountEnabled={settings?.discount_enabled ?? true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
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
        customerAddress={customerAddress}
        onCustomerAddressChange={setCustomerAddress}
        mixedPayment={mixedPayment}
        onMixedPaymentChange={setMixedPayment}
        warrantyMobile={warrantyMobile}
        warrantyAccessories={warrantyAccessories}
        emiLendingPartner={emiLendingPartner}
        onWarrantyMobileChange={setWarrantyMobile}
        onWarrantyAccessoriesChange={setWarrantyAccessories}
        onEmiLendingPartnerChange={setEmiLendingPartner}
        onCompleteSale={handleCompleteSale}
        onPreviewBill={handlePreviewBill}
        discountEnabled={settings?.discount_enabled ?? true}
        saving={saving}
      />

      {showInvoice && (
        <InvoicePreview invoice={showInvoice} onClose={() => setShowInvoice(null)} />
      )}

      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          mode="preview"
          onClose={() => setPreviewInvoice(null)}
          onConfirmSave={() => {
            setPreviewInvoice(null);
            handleCompleteSale();
          }}
        />
      )}
    </div>
  );
};
