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
import { Search, Barcode, Keyboard, Receipt } from 'lucide-react';
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
  const { activeShop, activeShopId, settings } = useShop();
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

  useEffect(() => { imeiRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setIsGSTBill(true); toast.info('GST Bill Mode'); }
      if (e.key === 'F3') { e.preventDefault(); setIsGSTBill(false); toast.info('Non-GST Bill Mode'); }
      if (e.key === 'F4') { e.preventDefault(); }
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
      toast.error('IMEI already in this bill');
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
      toast.error('IMEI not found or not in stock');
      setImeiInput('');
      return;
    }

    const product = record.products as unknown as Product;
    if (!product) {
      toast.error('Product not found for this IMEI');
      setImeiInput('');
      return;
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
    setFlashId(newItem.id);
    setTimeout(() => setFlashId(null), 500);
    setImeiInput('');
    toast.success(`Added: ${product.brand} ${product.model}`);
  }, [imeiInput, items, activeShopId]);

  const handleSearch = useCallback(async () => {
    const q = searchInput.toLowerCase().trim();
    if (!q || !activeShopId) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', activeShopId)
      .or(`brand.ilike.%${q}%,model.ilike.%${q}%,variant.ilike.%${q}%`)
      .limit(10);
    setSearchResults(data || []);
  }, [searchInput, activeShopId]);

  const addProductManually = async (product: Product) => {
    // Find available IMEI
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
    setFlashId(newItem.id);
    setTimeout(() => setFlashId(null), 500);
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

    // Get next invoice number
    const nextNum = (activeShop.last_invoice_number || 0) + 1;
    const invoiceNumber = `${activeShop.invoice_prefix}-${String(nextNum).padStart(4, '0')}`;

    // Update shop last invoice number
    await supabase.from('shops').update({ last_invoice_number: nextNum }).eq('id', activeShopId);

    // Create invoice
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
      toast.error('Failed to save invoice: ' + invError?.message);
      return;
    }

    // Save invoice items
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

    // Mark IMEIs as sold & update dealer ledger
    for (const item of items) {
      if (item.imei) {
        // Get IMEI record to find dealer
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

        // Auto-deduct from dealer ledger
        if (imeiRecord?.dealer_id) {
          const { data: dealer } = await supabase
            .from('dealers')
            .select('total_credit')
            .eq('id', imeiRecord.dealer_id)
            .single();

          if (dealer) {
            const newBalance = Number(dealer.total_credit) - item.total;
            await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', imeiRecord.dealer_id);
            await supabase.from('dealer_transactions').insert({
              dealer_id: imeiRecord.dealer_id,
              shop_id: activeShopId,
              type: 'sale_deduction',
              amount: item.total,
              running_balance: newBalance,
              description: `Sale: ${item.product.brand} ${item.product.model} (IMEI: ${item.imei})`,
              invoice_ref: invoiceNumber,
              imei_ref: item.imei,
            });
          }
        }

        // Decrease product stock
        await supabase.rpc('decrement_stock' as never, { p_product_id: item.productId } as never).then(() => {});
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
        {/* Top Bar */}
        <div className="flex items-center gap-3 p-3 bg-card border-b">
          <ShopSelector />
          <div className="flex gap-1 ml-auto">
            <Button variant={isGSTBill ? 'default' : 'outline'} size="sm" onClick={() => setIsGSTBill(true)}>
              GST Bill <span className="text-xs opacity-70 ml-1">F2</span>
            </Button>
            <Button variant={!isGSTBill ? 'default' : 'outline'} size="sm" onClick={() => setIsGSTBill(false)}>
              Non-GST <span className="text-xs opacity-70 ml-1">F3</span>
            </Button>
            {isGSTBill && (
              <select
                value={gstBearer}
                onChange={e => setGstBearer(e.target.value as 'customer' | 'seller')}
                className="h-9 px-2 rounded-md border border-input bg-background text-xs font-display font-medium focus:outline-none"
              >
                <option value="customer">GST: Customer</option>
                <option value="seller">GST: Seller</option>
              </select>
            )}
          </div>
        </div>

        {/* IMEI Input */}
        <div className="p-3 bg-card border-b">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                ref={imeiRef}
                value={imeiInput}
                onChange={e => setImeiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleIMEIScan(); }}
                placeholder="Scan IMEI barcode or type IMEI number..."
                className="w-full h-12 pl-11 pr-4 rounded-lg border-2 border-primary/30 bg-background font-display text-lg tracking-wider focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:text-base"
              />
            </div>
            <Button size="lg" onClick={handleIMEIScan}>Add</Button>
            <Button variant="outline" size="lg" onClick={() => setShowSearch(!showSearch)}>
              <Search className="w-5 h-5" />
            </Button>
          </div>

          {showSearch && (
            <div className="mt-2">
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search by brand, model, variant..."
                className="w-full h-10 px-4 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
              />
              <Button size="sm" onClick={handleSearch} className="mt-1">Search</Button>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-card">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => addProductManually(p)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0 flex justify-between">
                      <span className="font-medium">{p.brand} {p.model} <span className="text-muted-foreground">{p.variant} {p.color}</span></span>
                      <span className="price-text">₹{Number(p.sale_price).toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shortcuts bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 text-xs text-muted-foreground font-display">
          <Keyboard className="w-3.5 h-3.5" />
          <span>F2 GST</span><span>·</span><span>F3 Non-GST</span><span>·</span>
          <span>F4 Discount</span><span>·</span><span>F9 Print & Save</span><span>·</span><span>ESC Close</span>
        </div>

        {/* Items Table */}
        <div className="flex-1 pos-scrollable">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Receipt className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-display text-lg font-medium">Scan IMEI to start billing</p>
              <p className="text-sm mt-1">Or use Search to find products manually</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr className="text-left font-display text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-3 py-2 w-8">#</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">IMEI</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Disc.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 w-10"></th>
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
