import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote, Smartphone, Shuffle, Printer, ShoppingBag, User, Phone, Hash } from 'lucide-react';

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
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const paymentMethods = [
    { key: 'cash' as const, icon: Banknote, label: 'Cash' },
    { key: 'upi' as const, icon: Smartphone, label: 'UPI' },
    { key: 'card' as const, icon: CreditCard, label: 'Card' },
    { key: 'mixed' as const, icon: Shuffle, label: 'Mixed' },
  ];

  return (
    <div className="w-80 bg-checkout text-checkout-foreground flex flex-col border-l">
      {/* Customer Info */}
      <div className="p-3 space-y-2 border-b border-checkout-foreground/10">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-checkout-foreground/40 mb-2">Customer</p>
        <div className="relative">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/30" />
          <input value={customerName} onChange={e => onCustomerNameChange(e.target.value)} placeholder="Name"
            className="w-full h-8 pl-8 pr-3 rounded-md bg-checkout-foreground/8 text-checkout-foreground text-sm placeholder:text-checkout-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
        </div>
        <div className="relative">
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/30" />
          <input value={customerPhone} onChange={e => onCustomerPhoneChange(e.target.value)} placeholder="Phone"
            className="w-full h-8 pl-8 pr-3 rounded-md bg-checkout-foreground/8 text-checkout-foreground text-sm placeholder:text-checkout-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
        </div>
        {isGSTBill && (
          <div className="relative">
            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/30" />
            <input value={customerGST} onChange={e => onCustomerGSTChange(e.target.value)} placeholder="GSTIN (B2B)"
              className="w-full h-8 pl-8 pr-3 rounded-md bg-checkout-foreground/8 text-checkout-foreground text-sm font-mono placeholder:font-body placeholder:text-checkout-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex-1 p-3 space-y-2.5 text-sm pos-scrollable">
        <div className="flex justify-between items-center">
          <span className="text-checkout-foreground/50 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> Items
          </span>
          <span className="font-display font-semibold">{items.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-checkout-foreground/50">Subtotal</span>
          <span className="price-text text-checkout-foreground">{fmt(subtotal)}</span>
        </div>
        {itemDiscountTotal > 0 && (
          <div className="flex justify-between text-warning">
            <span>Item Discount</span><span className="font-display font-semibold">-{fmt(itemDiscountTotal)}</span>
          </div>
        )}

        {discountEnabled && (
          <div className="pt-2 border-t border-checkout-foreground/8">
            <label className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold mb-1.5 block">Bill Discount</label>
            <div className="flex gap-1">
              <input type="number" value={billDiscount || ''} onChange={e => onBillDiscountChange(Number(e.target.value))}
                className="flex-1 h-8 px-2.5 rounded-md bg-checkout-foreground/8 text-checkout-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
              <button onClick={() => onBillDiscountTypeChange(billDiscountType === 'flat' ? 'percentage' : 'flat')}
                className="h-8 w-8 rounded-md bg-checkout-foreground/8 text-xs font-display font-bold hover:bg-checkout-foreground/15 transition-colors flex items-center justify-center">
                {billDiscountType === 'flat' ? '₹' : '%'}
              </button>
            </div>
            {billDiscountAmount > 0 && (
              <div className="flex justify-between mt-1.5 text-warning text-xs">
                <span>Discount Applied</span><span className="font-display font-semibold">-{fmt(billDiscountAmount)}</span>
              </div>
            )}
          </div>
        )}

        {isGSTBill && (
          <div className="pt-2 border-t border-checkout-foreground/8 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/40">GST Bearer</span>
              <span className="capitalize font-display font-semibold text-primary">{gstBearer}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/40">Taxable</span><span className="font-mono">{fmt(gstCalc.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/40">CGST</span><span className="font-mono">{fmt(gstCalc.cgst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/40">SGST</span><span className="font-mono">{fmt(gstCalc.sgst)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="p-3 border-t border-checkout-foreground/8">
        <label className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold mb-2 block">Payment</label>
        <div className="grid grid-cols-4 gap-1.5">
          {paymentMethods.map(m => (
            <button key={m.key} onClick={() => onPaymentMethodChange(m.key)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-display font-semibold transition-all ${
                paymentMethod === m.key
                  ? 'gradient-primary text-primary-foreground shadow-md'
                  : 'bg-checkout-foreground/8 text-checkout-foreground/60 hover:bg-checkout-foreground/15'
              }`}>
              <m.icon className="w-4 h-4" />{m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grand Total & Complete */}
      <div className="p-3 border-t border-checkout-foreground/8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-checkout-foreground/50 font-display text-xs uppercase tracking-wider">Grand Total</span>
          <span className="font-display text-3xl font-extrabold tracking-tight">{fmt(grandTotal)}</span>
        </div>
        <Button size="lg" className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-display font-bold text-base shadow-lg" onClick={onCompleteSale} disabled={items.length === 0}>
          <Printer className="w-5 h-5 mr-2" />Print & Save
          <span className="text-xs opacity-60 ml-2 px-1.5 py-0.5 bg-success-foreground/20 rounded text-[10px]">F9</span>
        </Button>
      </div>
    </div>
  );
};
