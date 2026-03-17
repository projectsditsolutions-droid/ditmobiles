import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { BillItem, Product, Invoice } from '@/types';
import {
  getProducts, getIMEIs, saveIMEIs, findIMEI, isIMEIAvailable,
  getActiveShop, getNextInvoiceNumber, getInvoices, saveInvoices,
  calculateGST, getSettings,
} from '@/lib/store';
import { ShopSelector } from '@/components/ShopSelector';
import { CheckoutPanel } from '@/components/CheckoutPanel';
import { BillItemRow } from '@/components/BillItemRow';
import { InvoicePreview } from '@/components/InvoicePreview';
import {
  Search, Barcode, Keyboard, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

export const POSBilling: React.FC = () => {
  const [items, setItems] = useState<BillItem[]>([]);
  const [imeiInput, setImeiInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isGSTBill, setIsGSTBill] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'mixed'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showInvoice, setShowInvoice] = useState<Invoice | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const imeiRef = useRef<HTMLInputElement>(null);
  const settings = getSettings();

  // Auto-focus IMEI input
  useEffect(() => {
    imeiRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setIsGSTBill(true); toast.info('GST Bill Mode'); }
      if (e.key === 'F3') { e.preventDefault(); setIsGSTBill(false); toast.info('Non-GST Bill Mode'); }
      if (e.key === 'F4') { e.preventDefault(); /* focus discount */ }
      if (e.key === 'F9') { e.preventDefault(); handleCompleteSale(); }
      if (e.key === 'Escape') { setShowSearch(false); setShowInvoice(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items]);

  const handleIMEIScan = useCallback(() => {
    const imei = imeiInput.trim();
    if (!imei) return;

    // Check if already in bill
    if (items.some(i => i.imei === imei)) {
      toast.error('IMEI already in this bill');
      setImeiInput('');
      return;
    }

    // Find IMEI record
    const record = findIMEI(imei);
    if (!record) {
      toast.error('IMEI not found in inventory');
      setImeiInput('');
      return;
    }
    if (record.status !== 'in_stock') {
      toast.error('IMEI already sold or returned');
      setImeiInput('');
      return;
    }

    // Find product
    const products = getProducts();
    const product = products.find(p => p.id === record.productId);
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
      unitPrice: product.salePrice,
      discount: 0,
      discountType: 'flat',
      discountValue: 0,
      total: product.salePrice,
    };

    setItems(prev => [...prev, newItem]);
    setFlashId(newItem.id);
    setTimeout(() => setFlashId(null), 500);
    setImeiInput('');
    toast.success(`Added: ${product.brand} ${product.model}`);
  }, [imeiInput, items]);

  const handleSearch = useCallback(() => {
    const q = searchInput.toLowerCase().trim();
    if (!q) { setSearchResults([]); return; }
    const products = getProducts();
    const results = products.filter(p =>
      p.brand.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.variant.toLowerCase().includes(q)
    );
    setSearchResults(results);
  }, [searchInput]);

  const addProductManually = (product: Product) => {
    // Find available IMEI for this product
    const imeis = getIMEIs();
    const availableIMEI = imeis.find(r => r.productId === product.id && r.status === 'in_stock' && !items.some(i => i.imei === r.imei));
    
    const newItem: BillItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      product,
      imei: availableIMEI?.imei,
      quantity: 1,
      unitPrice: product.salePrice,
      discount: 0,
      discountType: 'flat',
      discountValue: 0,
      total: product.salePrice,
    };

    setItems(prev => [...prev, newItem]);
    setFlashId(newItem.id);
    setTimeout(() => setFlashId(null), 500);
    setShowSearch(false);
    setSearchInput('');
    setSearchResults([]);
    toast.success(`Added: ${product.brand} ${product.model}`);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItemDiscount = (id: string, value: number, type: 'percentage' | 'flat') => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const discount = type === 'percentage' ? (item.unitPrice * value / 100) : value;
      return {
        ...item,
        discountType: type,
        discountValue: value,
        discount,
        total: (item.unitPrice - discount) * item.quantity,
      };
    }));
  };

  // Calculations
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const itemDiscountTotal = items.reduce((sum, i) => sum + i.discount * i.quantity, 0);
  const billDiscountAmount = billDiscountType === 'percentage' ? subtotal * billDiscount / 100 : billDiscount;
  const totalAfterDiscount = subtotal - itemDiscountTotal - billDiscountAmount;
  
  // GST (inclusive) - calculate from total
  const avgGST = items.length > 0 ? items.reduce((sum, i) => sum + i.product.gstPercent, 0) / items.length : 18;
  const gstCalc = isGSTBill ? calculateGST(totalAfterDiscount, avgGST) : { cgst: 0, sgst: 0, taxableAmount: totalAfterDiscount, totalGST: 0 };
  const grandTotal = Math.round(totalAfterDiscount);

  const handleCompleteSale = useCallback(() => {
    if (items.length === 0) { toast.error('Add items to bill first'); return; }

    const shop = getActiveShop();
    const invoiceNumber = getNextInvoiceNumber(shop.id);

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber,
      shopId: shop.id,
      date: new Date().toISOString(),
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      customerGST: customerGST || undefined,
      items,
      subtotal,
      totalDiscount: itemDiscountTotal + billDiscountAmount,
      billDiscount: billDiscountAmount,
      billDiscountType,
      cgst: gstCalc.cgst,
      sgst: gstCalc.sgst,
      grandTotal,
      paymentMethod,
      isGSTBill,
      printType: settings.defaultPrintType,
      status: 'completed',
    };

    // Save invoice
    const invoices = getInvoices();
    invoices.push(invoice);
    saveInvoices(invoices);

    // Mark IMEIs as sold
    const allIMEIs = getIMEIs();
    items.forEach(item => {
      if (item.imei) {
        const idx = allIMEIs.findIndex(r => r.imei === item.imei);
        if (idx >= 0) {
          allIMEIs[idx].status = 'sold';
          allIMEIs[idx].soldDate = invoice.date;
          allIMEIs[idx].invoiceId = invoice.id;
        }
      }
    });
    saveIMEIs(allIMEIs);

    setShowInvoice(invoice);
    toast.success(`Sale completed! Invoice: ${invoiceNumber}`);

    // Reset
    setItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGST('');
    setBillDiscount(0);
  }, [items, customerName, customerPhone, customerGST, subtotal, itemDiscountTotal, billDiscountAmount, billDiscountType, gstCalc, grandTotal, paymentMethod, isGSTBill, settings]);

  return (
    <div className="flex h-full">
      {/* Left Panel - Item List (70%) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-3 p-3 bg-card border-b">
          <ShopSelector />
          <div className="flex gap-1 ml-auto">
            <Button
              variant={isGSTBill ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsGSTBill(true)}
            >
              GST Bill <span className="text-xs opacity-70 ml-1">F2</span>
            </Button>
            <Button
              variant={!isGSTBill ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsGSTBill(false)}
            >
              Non-GST <span className="text-xs opacity-70 ml-1">F3</span>
            </Button>
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
            <Button size="lg" onClick={handleIMEIScan}>
              Add
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowSearch(!showSearch)}>
              <Search className="w-5 h-5" />
            </Button>
          </div>

          {/* Manual Search */}
          {showSearch && (
            <div className="mt-2">
              <input
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search by brand, model, variant..."
                className="w-full h-10 px-4 rounded-lg border bg-background text-sm focus:border-primary focus:outline-none"
              />
              <Button size="sm" onClick={handleSearch} className="mt-1">Search</Button>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-card">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addProductManually(p)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0 flex justify-between"
                    >
                      <span className="font-medium">{p.brand} {p.model} <span className="text-muted-foreground">{p.variant} {p.color}</span></span>
                      <span className="price-text">₹{p.salePrice.toLocaleString('en-IN')}</span>
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
          <span>F2 GST</span>
          <span>·</span>
          <span>F3 Non-GST</span>
          <span>·</span>
          <span>F4 Discount</span>
          <span>·</span>
          <span>F9 Print & Save</span>
          <span>·</span>
          <span>ESC Close</span>
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
                    discountEnabled={settings.discountEnabled}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Panel - Checkout (30%) */}
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
        discountEnabled={settings.discountEnabled}
      />

      {/* Invoice Preview Modal */}
      {showInvoice && (
        <InvoicePreview invoice={showInvoice} onClose={() => setShowInvoice(null)} />
      )}
    </div>
  );
};
