import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote, Smartphone, Shuffle, Printer, ShoppingBag, User, Phone, Hash, Receipt, Building2 } from 'lucide-react';

interface Props {
  items: any[];
  subtotal: number;
  itemDiscountTotal: number;
  billDiscount: number;
  billDiscountType: 'percentage' | 'flat';
  billDiscountAmount: number;
  gstCalc: { cgst: number; sgst: number; taxableAmount: number; totalGST: number };
  grandTotal: number;
  isGSTBill: boolean;
  gstBearer: string;
  paymentMethod: 'cash' | 'upi' | 'card' | 'mixed';
  customerName: string;
  customerPhone: string;
  customerGST: string;
  onBillDiscountChange: (v: number) => void;
  onBillDiscountTypeChange: (v: 'percentage' | 'flat') => void;
  onPaymentMethodChange: (v: 'cash' | 'upi' | 'card' | 'mixed') => void;
  onCustomerNameChange: (v: string) => void;
  onCustomerPhoneChange: (v: string) => void;
  onCustomerGSTChange: (v: string) => void;
  onCompleteSale: () => void;
  discountEnabled: boolean;
}

export const CheckoutPanel: React.FC<Props> = ({
  items, subtotal, itemDiscountTotal, billDiscount, billDiscountType, billDiscountAmount,
  gstCalc, grandTotal, isGSTBill, gstBearer, paymentMethod,
  customerName, customerPhone, customerGST,
  onBillDiscountChange, onBillDiscountTypeChange, onPaymentMethodChange,
  onCustomerNameChange, onCustomerPhoneChange, onCustomerGSTChange,
  onCompleteSale, discountEnabled,
}) => {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const customerMode = isGSTBill ? (customerGST.trim() ? 'B2B' : 'B2C') : 'Retail';

  const paymentMethods = [
    { key: 'cash' as const, icon: Banknote, label: 'Cash' },
    { key: 'upi' as const, icon: Smartphone, label: 'UPI' },
    { key: 'card' as const, icon: CreditCard, label: 'Card' },
    { key: 'mixed' as const, icon: Shuffle, label: 'Mixed' },
  ];

  return (
    <div className="w-[360px] bg-checkout text-checkout-foreground flex flex-col border-l border-checkout-foreground/10">
      <div className="p-4 border-b border-checkout-foreground/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-checkout-foreground/10 flex items-center justify-center">
              <User className="w-4 h-4 text-checkout-foreground/60" />
            </div>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-checkout-foreground/55">Customer Details</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-display font-bold ${
            customerMode === 'B2B'
              ? 'bg-primary/25 text-primary-foreground'
              : customerMode === 'B2C'
                ? 'bg-warning/20 text-warning'
                : 'bg-checkout-foreground/10 text-checkout-foreground/65'
          }`}>
            {customerMode}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-checkout-foreground/45 font-medium mb-1.5 block">Customer Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={customerName}
                onChange={e => onCustomerNameChange(e.target.value)}
                placeholder="Walk-in Customer"
                className="checkout-input w-full h-11 pl-10 pr-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-checkout-foreground/45 font-medium mb-1.5 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={customerPhone}
                onChange={e => onCustomerPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="checkout-input w-full h-11 pl-10 pr-3 rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          {isGSTBill && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-checkout-foreground/45 font-medium block">GSTIN</label>
                <span className="text-[10px] text-checkout-foreground/35">Required for B2B</span>
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={customerGST}
                  onChange={e => onCustomerGSTChange(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="checkout-input w-full h-11 pl-10 pr-10 rounded-xl text-sm font-mono tracking-wider"
                />
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 text-sm pos-scrollable">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-3.5 h-3.5 text-checkout-foreground/40" />
          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-checkout-foreground/40">Order Summary</p>
        </div>

        <div className="space-y-2 p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8">
          <div className="flex justify-between items-center">
            <span className="text-checkout-foreground/55 flex items-center gap-1.5 text-xs">
              <ShoppingBag className="w-3.5 h-3.5" /> Items
            </span>
            <span className="font-display font-bold">{items.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-checkout-foreground/50 text-xs">Subtotal</span>
            <span className="price-text text-checkout-foreground">{fmt(subtotal)}</span>
          </div>
          {itemDiscountTotal > 0 && (
            <div className="flex justify-between text-warning">
              <span className="text-xs">Item Discount</span>
              <span className="font-display font-semibold text-xs">-{fmt(itemDiscountTotal)}</span>
            </div>
          )}
        </div>

        {discountEnabled && (
          <div className="p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8">
            <label className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold mb-2 block">Bill Discount</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={billDiscount || ''}
                onChange={e => onBillDiscountChange(Number(e.target.value))}
                className="checkout-input flex-1 h-10 px-3 rounded-xl text-sm"
                placeholder="0"
              />
              <button
                onClick={() => onBillDiscountTypeChange(billDiscountType === 'flat' ? 'percentage' : 'flat')}
                className="h-10 w-10 rounded-xl bg-checkout-foreground/10 text-xs font-display font-bold hover:bg-checkout-foreground/15 transition-colors flex items-center justify-center"
              >
                {billDiscountType === 'flat' ? '₹' : '%'}
              </button>
            </div>
            {billDiscountAmount > 0 && (
              <div className="flex justify-between mt-2 text-warning text-xs">
                <span>Applied</span><span className="font-display font-semibold">-{fmt(billDiscountAmount)}</span>
              </div>
            )}
          </div>
        )}

        {isGSTBill && (
          <div className="p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold">GST Details</span>
              <span className="text-[10px] capitalize font-display font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground">
                {gstBearer === 'customer' ? 'Customer pays' : 'Seller absorbs'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/45">Taxable Amount</span>
              <span className="font-mono">{fmt(gstCalc.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/45">CGST</span>
              <span className="font-mono">{fmt(gstCalc.cgst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/45">SGST</span>
              <span className="font-mono">{fmt(gstCalc.sgst)}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-checkout-foreground/10 pt-2">
              <span className="text-checkout-foreground/45">GST Total</span>
              <span className="font-display font-semibold">{fmt(gstCalc.totalGST)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-checkout-foreground/8">
        <label className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold mb-2.5 block">Payment Method</label>
        <div className="grid grid-cols-4 gap-2">
          {paymentMethods.map(m => (
            <button
              key={m.key}
              onClick={() => onPaymentMethodChange(m.key)}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-display font-semibold transition-all ${
                paymentMethod === m.key
                  ? 'gradient-primary text-primary-foreground shadow-lg scale-[1.02]'
                  : 'bg-checkout-foreground/8 text-checkout-foreground/55 hover:bg-checkout-foreground/15 hover:text-checkout-foreground/80'
              }`}
            >
              <m.icon className="w-4 h-4" />{m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-checkout-foreground/8 bg-checkout-foreground/5">
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-checkout-foreground/50 font-display text-xs uppercase tracking-wider">Grand Total</span>
          <span className="font-display text-3xl font-extrabold tracking-tight">{fmt(grandTotal)}</span>
        </div>
        <Button
          size="lg"
          className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-display font-bold text-base shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
          onClick={onCompleteSale}
          disabled={items.length === 0}
        >
          <Printer className="w-5 h-5 mr-2" />
          Print & Save
          <span className="text-[10px] opacity-70 ml-2 px-1.5 py-0.5 bg-success-foreground/20 rounded">F9</span>
        </Button>
      </div>
    </div>
  );
};
