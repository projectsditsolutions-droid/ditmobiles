import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { calculateGST } from '@/lib/store';
import { ShopSelector } from '@/components/ShopSelector';
import { CheckoutPanel } from '@/components/CheckoutPanel';
import { BillItemRow } from '@/components/BillItemRow';
import { InvoicePreview } from '@/components/InvoicePreview';
import { Search, Barcode, Keyboard, Receipt, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

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
}

export const POSBilling: React.FC = () => {
  const { user } = useAuth();
  const { activeShop, activeShopId, settings, isAllShops } = useShop();

  const [items, setItems] = useState<BillItem[]>([]);
  const [imeiInput, setImeiInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isGSTBill, setIsGSTBill] = useState(true);
  const [gstBearer, setGstBearer] = useState<'customer' | 'seller'>('customer');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'mixed'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showInvoice, setShowInvoice] = useState<InvoiceData | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const imeiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    imeiRef.current?.focus();
  }, []);

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
      return {
        ...item,
        quantity: nextQuantity,
        total: lineBase * nextQuantity,
      };
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

    const nextNum = (activeShop.last_invoice_number || 0) + 1;
    const invoiceNumber = `${activeShop.invoice_prefix}-${String(nextNum).padStart(4, '0')}`;

    await supabase.from('shops').update({ last_invoice_number: nextNum }).eq('id', activeShopId);

    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      shop_id: activeShopId,
      user_id: user.id,
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone,
      customer_gst: customerGST || null,
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
    }).select().single();

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
              description: `Sale deduction at cost price for ${item.product.brand} ${item.product.model} (IMEI: ${item.imei})`,
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
      customer_gst: customerGST || undefined,
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
    };

    setShowInvoice(invoiceData);
    toast.success(`Sale completed! Invoice: ${invoiceNumber}`);

    setItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGST('');
    setBillDiscount(0);
  }, [items, customerName, customerPhone, customerGST, subtotal, itemDiscountTotal, billDiscountAmount, billDiscountType, gstCalc, grandTotal, paymentMethod, isGSTBill, gstBearer, settings, activeShop, activeShopId, user]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 h-14 bg-card border-b">
          <ShopSelector />
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex bg-secondary rounded-lg p-0.5">
              <button onClick={() => setIsGSTBill(true)} className={`px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${isGSTBill ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                GST <span className="opacity-50 ml-0.5">F2</span>
              </button>
              <button onClick={() => setIsGSTBill(false)} className={`px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${!isGSTBill ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                Non-GST <span className="opacity-50 ml-0.5">F3</span>
              </button>
            </div>
            {isGSTBill && (
              <select value={gstBearer} onChange={e => setGstBearer(e.target.value as 'customer' | 'seller')} className="h-8 px-2 rounded-md border border-input bg-card text-xs font-display font-medium focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="customer">Customer bears GST</option>
                <option value="seller">Seller bears GST</option>
              </select>
            )}
          </div>
        </div>

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
                    <button key={p.id} onClick={() => addProductManually(p)} className="w-full text-left px-4 py-3 hover:bg-accent text-sm border-b last:border-b-0 flex justify-between items-center transition-colors">
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

        <div className="flex items-center gap-3 px-4 py-1.5 bg-secondary/30 text-[11px] text-muted-foreground font-display font-medium">
          <Keyboard className="w-3.5 h-3.5" />
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">F2</span> GST
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">F3</span> Non-GST
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">F9</span> Print & Save
          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">ESC</span> Close
        </div>

        <div className="flex-1 pos-scrollable">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                <Receipt className="w-10 h-10 text-accent-foreground/40" />
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-semibold text-foreground/60">Ready for billing</p>
                <p className="text-sm mt-1">Scan IMEI barcode or search products to start</p>
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
