import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote, Smartphone, Shuffle, Printer } from 'lucide-react';

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
        <input value={customerName} onChange={e => onCustomerNameChange(e.target.value)} placeholder="Customer Name"
          className="w-full h-9 px-3 rounded-md bg-checkout-foreground/10 text-checkout-foreground text-sm placeholder:text-checkout-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
        <input value={customerPhone} onChange={e => onCustomerPhoneChange(e.target.value)} placeholder="Phone Number"
          className="w-full h-9 px-3 rounded-md bg-checkout-foreground/10 text-checkout-foreground text-sm placeholder:text-checkout-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
        {isGSTBill && (
          <input value={customerGST} onChange={e => onCustomerGSTChange(e.target.value)} placeholder="Customer GSTIN (B2B)"
            className="w-full h-9 px-3 rounded-md bg-checkout-foreground/10 text-checkout-foreground text-sm placeholder:text-checkout-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
        )}
      </div>

      {/* Summary */}
      <div className="flex-1 p-3 space-y-2 text-sm pos-scrollable">
        <div className="flex justify-between">
          <span className="text-checkout-foreground/70">Items</span><span>{items.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-checkout-foreground/70">Subtotal</span><span className="price-text">{fmt(subtotal)}</span>
        </div>
        {itemDiscountTotal > 0 && (
          <div className="flex justify-between text-warning">
            <span>Item Discount</span><span>-{fmt(itemDiscountTotal)}</span>
          </div>
        )}

        {discountEnabled && (
          <div className="pt-2 border-t border-checkout-foreground/10">
            <label className="text-xs text-checkout-foreground/50 mb-1 block">Bill Discount</label>
            <div className="flex gap-1">
              <input type="number" value={billDiscount || ''} onChange={e => onBillDiscountChange(Number(e.target.value))}
                className="flex-1 h-8 px-2 rounded bg-checkout-foreground/10 text-checkout-foreground text-sm focus:outline-none" placeholder="0" />
              <button onClick={() => onBillDiscountTypeChange(billDiscountType === 'flat' ? 'percentage' : 'flat')}
                className="h-8 px-2 rounded bg-checkout-foreground/10 text-xs font-medium hover:bg-checkout-foreground/20">
                {billDiscountType === 'flat' ? '₹' : '%'}
              </button>
            </div>
            {billDiscountAmount > 0 && (
              <div className="flex justify-between mt-1 text-warning">
                <span className="text-xs">Bill Discount</span><span>-{fmt(billDiscountAmount)}</span>
              </div>
            )}
          </div>
        )}

        {isGSTBill && (
          <div className="pt-2 border-t border-checkout-foreground/10 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/50">GST Bearer</span>
              <span className="capitalize font-medium">{gstBearer}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/50">Taxable Amount</span><span>{fmt(gstCalc.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/50">CGST</span><span>{fmt(gstCalc.cgst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/50">SGST</span><span>{fmt(gstCalc.sgst)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="p-3 border-t border-checkout-foreground/10">
        <label className="text-xs text-checkout-foreground/50 mb-2 block">Payment Method</label>
        <div className="grid grid-cols-4 gap-1">
          {paymentMethods.map(m => (
            <button key={m.key} onClick={() => onPaymentMethodChange(m.key)}
              className={`flex flex-col items-center gap-1 py-2 rounded-md text-xs transition-all ${
                paymentMethod === m.key ? 'bg-primary text-primary-foreground' : 'bg-checkout-foreground/10 text-checkout-foreground/70 hover:bg-checkout-foreground/20'
              }`}>
              <m.icon className="w-4 h-4" />{m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grand Total + Complete */}
      <div className="p-3 border-t border-checkout-foreground/10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-checkout-foreground/70 font-display">Grand Total</span>
          <span className="font-display text-3xl font-extrabold">{fmt(grandTotal)}</span>
        </div>
        <Button variant="success" size="xl" className="w-full" onClick={onCompleteSale} disabled={items.length === 0}>
          <Printer className="w-5 h-5" />Print & Save<span className="text-xs opacity-70 ml-1">F9</span>
        </Button>
      </div>
    </div>
  );
};
