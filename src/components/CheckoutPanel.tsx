import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote, Smartphone, Shuffle, Printer, ShoppingBag, User, Phone, Hash, Receipt, Building2, MapPin, AlertCircle, Calendar, Shield, Eye, ArrowLeftRight } from 'lucide-react';

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
  customerType: 'B2B' | 'B2C';
  paymentMethod: 'cash' | 'upi' | 'card' | 'mixed' | 'emi' | 'exchange';
  customerName: string;
  customerPhone: string;
  customerGST: string;
  customerAddress: string;
  mixedPayment: { cash: number; upi: number; card: number; emi: number; exchange: number };
  warrantyMobile: string;
  warrantyAccessories: string;
  emiLendingPartner: string;
  onBillDiscountChange: (v: number) => void;
  onBillDiscountTypeChange: (v: 'percentage' | 'flat') => void;
  onPaymentMethodChange: (v: 'cash' | 'upi' | 'card' | 'mixed' | 'emi' | 'exchange') => void;
  onCustomerNameChange: (v: string) => void;
  onCustomerPhoneChange: (v: string) => void;
  onCustomerGSTChange: (v: string) => void;
  onCustomerAddressChange: (v: string) => void;
  onMixedPaymentChange: (v: { cash: number; upi: number; card: number; emi: number; exchange: number }) => void;
  onWarrantyMobileChange: (v: string) => void;
  onWarrantyAccessoriesChange: (v: string) => void;
  onEmiLendingPartnerChange: (v: string) => void;
  exchangeNotes: string;
  onExchangeNotesChange: (v: string) => void;
  paymentNotes: string;
  onPaymentNotesChange: (v: string) => void;
  customerPending: number;
  amountReceived: number | '';
  onAmountReceivedChange: (v: number | '') => void;
  onCompleteSale: () => void;
  onPreviewBill?: () => void;
  discountEnabled: boolean;
  saving?: boolean;
}

export const CheckoutPanel: React.FC<Props> = ({
  items, subtotal, itemDiscountTotal, billDiscount, billDiscountType, billDiscountAmount,
  gstCalc, grandTotal, isGSTBill, gstBearer, customerType, paymentMethod,
  customerName, customerPhone, customerGST, customerAddress,
  mixedPayment, warrantyMobile, warrantyAccessories, emiLendingPartner,
  onBillDiscountChange, onBillDiscountTypeChange, onPaymentMethodChange,
  onCustomerNameChange, onCustomerPhoneChange, onCustomerGSTChange, onCustomerAddressChange,
  onMixedPaymentChange, onWarrantyMobileChange, onWarrantyAccessoriesChange, onEmiLendingPartnerChange,
  exchangeNotes, onExchangeNotesChange,
  paymentNotes, onPaymentNotesChange,
  customerPending,
  amountReceived, onAmountReceivedChange,
  onCompleteSale, onPreviewBill, discountEnabled, saving,
}) => {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const paymentMethods = [
    { key: 'cash' as const, icon: Banknote, label: 'Cash' },
    { key: 'upi' as const, icon: Smartphone, label: 'UPI' },
    { key: 'card' as const, icon: CreditCard, label: 'Card' },
    { key: 'emi' as const, icon: Calendar, label: 'EMI' },
    { key: 'exchange' as const, icon: ArrowLeftRight, label: 'Exchange' },
    { key: 'mixed' as const, icon: Shuffle, label: 'Mixed' },
  ];

  const mixedTotal = mixedPayment.cash + mixedPayment.upi + mixedPayment.card + mixedPayment.emi + mixedPayment.exchange;
  const mixedDiff = grandTotal - mixedTotal;
  const mixedValid = paymentMethod !== 'mixed' || Math.abs(mixedDiff) < 0.01;
  const hasPending = customerPending > 0;
  const balancePending = (amountReceived !== '' && amountReceived < grandTotal) ? (grandTotal - amountReceived) : 0;
  return (
    <div className="w-full md:w-[360px] bg-checkout text-checkout-foreground flex flex-col border-l border-checkout-foreground/10 max-h-screen overflow-hidden">
      {/* ── Customer Details ───────────────────────────────────────── */}
      <div className="p-4 border-b border-checkout-foreground/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-checkout-foreground/10 flex items-center justify-center">
              <User className="w-4 h-4 text-checkout-foreground/60" />
            </div>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-checkout-foreground/55">Customer Details</p>
          </div>
          {isGSTBill && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-display font-bold ${
              customerType === 'B2B'
                ? 'bg-warning/20 text-warning'
                : 'bg-primary/25 text-primary-foreground'
            }`}>
              {customerType}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-[10px] text-checkout-foreground/45 font-medium mb-1 block">Customer Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/40" />
              <input
                value={customerName}
                onChange={e => onCustomerNameChange(e.target.value)}
                placeholder="Walk-in Customer"
                className="checkout-input w-full h-10 pl-10 pr-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-checkout-foreground/45 font-medium mb-1 block">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/40" />
                <input
                  value={customerPhone}
                  onChange={e => onCustomerPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="checkout-input w-full h-10 pl-10 pr-3 rounded-xl text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-checkout-foreground/45 font-medium mb-1 block">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/40" />
                <input
                  value={customerAddress}
                  onChange={e => onCustomerAddressChange(e.target.value)}
                  placeholder="Address"
                  className="checkout-input w-full h-10 pl-10 pr-3 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {isGSTBill && customerType === 'B2B' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-checkout-foreground/45 font-medium block">Customer GSTIN</label>
                <span className="text-[10px] text-warning font-display font-semibold">B2B Required</span>
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/40" />
                <input
                  value={customerGST}
                  onChange={e => onCustomerGSTChange(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="checkout-input w-full h-10 pl-10 pr-10 rounded-xl text-sm font-mono tracking-wider"
                />
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-checkout-foreground/40" />
              </div>
            </div>
          )}

          {/* Pending Amount Warning */}
          {hasPending && (
            <div className="mt-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-xs font-display font-bold text-destructive">Pending Amount: {fmt(customerPending)}</p>
                  <p className="text-[10px] text-destructive/70">Clear pending to enable billing</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Order Summary ─────────────────────────────────────────── */}
      <div className="flex-1 p-4 space-y-3 text-sm overflow-y-auto pos-scrollable">
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
                {gstBearer === 'customer' ? 'Customer Pays' : 'Seller Absorbs'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/45">Taxable Amount</span>
              <span className="font-mono font-semibold">{fmt(gstCalc.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/45">CGST</span>
              <span className="font-mono font-semibold">{fmt(gstCalc.cgst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-checkout-foreground/45">SGST</span>
              <span className="font-mono font-semibold">{fmt(gstCalc.sgst)}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-checkout-foreground/10 pt-2">
              <span className="font-display font-semibold text-checkout-foreground/60">GST Total</span>
              <span className="font-display font-bold text-primary">{fmt(gstCalc.totalGST)}</span>
            </div>
          </div>
        )}

        {/* ── Warranty Details ────────────────────────────────────── */}
        <div className="p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8 space-y-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-checkout-foreground/40" />
            <span className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold">Warranty Details</span>
          </div>
          <div>
            <label className="text-[9px] text-checkout-foreground/45 mb-1 block">📱 Mobile Warranty</label>
            <input
              value={warrantyMobile}
              onChange={e => onWarrantyMobileChange(e.target.value)}
              placeholder="e.g. 1 Year Manufacturer Warranty"
              className="checkout-input w-full h-9 px-3 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] text-checkout-foreground/45 mb-1 block">🔋 Battery Warranty</label>
            <input
              value={warrantyAccessories}
              onChange={e => onWarrantyAccessoriesChange(e.target.value)}
              placeholder="e.g. 6 Months Warranty"
              className="checkout-input w-full h-9 px-3 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── Payment Method ────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-checkout-foreground/8 flex-shrink-0">
        <label className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold mb-2.5 block">Payment Method</label>
      <div className="grid grid-cols-6 gap-1.5">
          {paymentMethods.map(m => (
            <button
              key={m.key}
              onClick={() => onPaymentMethodChange(m.key)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] font-display font-semibold transition-all ${
                paymentMethod === m.key
                  ? 'gradient-primary text-primary-foreground shadow-lg scale-[1.02]'
                  : 'bg-checkout-foreground/8 text-checkout-foreground/55 hover:bg-checkout-foreground/15 hover:text-checkout-foreground/80'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />{m.label}
            </button>
          ))}
        </div>

        {/* Mixed Payment Split */}
        {paymentMethod === 'mixed' && (
          <div className="mt-3 p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold">Split Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-checkout-foreground/45 mb-1 block">💵 Cash</label>
                <input
                  type="number"
                  value={mixedPayment.cash || ''}
                  onChange={e => onMixedPaymentChange({ ...mixedPayment, cash: Number(e.target.value) || 0 })}
                  className="checkout-input w-full h-9 px-2 rounded-lg text-sm text-center"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[9px] text-checkout-foreground/45 mb-1 block">📱 UPI</label>
                <input
                  type="number"
                  value={mixedPayment.upi || ''}
                  onChange={e => onMixedPaymentChange({ ...mixedPayment, upi: Number(e.target.value) || 0 })}
                  className="checkout-input w-full h-9 px-2 rounded-lg text-sm text-center"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[9px] text-checkout-foreground/45 mb-1 block">💳 Card</label>
                <input
                  type="number"
                  value={mixedPayment.card || ''}
                  onChange={e => onMixedPaymentChange({ ...mixedPayment, card: Number(e.target.value) || 0 })}
                  className="checkout-input w-full h-9 px-2 rounded-lg text-sm text-center"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[9px] text-checkout-foreground/45 mb-1 block">📅 EMI</label>
                <input
                  type="number"
                  value={mixedPayment.emi || ''}
                  onChange={e => onMixedPaymentChange({ ...mixedPayment, emi: Number(e.target.value) || 0 })}
                  className="checkout-input w-full h-9 px-2 rounded-lg text-sm text-center"
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] text-checkout-foreground/45 mb-1 block">🔄 Exchange Value</label>
                <input
                  type="number"
                  value={mixedPayment.exchange || ''}
                  onChange={e => onMixedPaymentChange({ ...mixedPayment, exchange: Number(e.target.value) || 0 })}
                  className="checkout-input w-full h-9 px-2 rounded-lg text-sm text-center"
                  placeholder="0"
                />
              </div>
            </div>
            <div className={`flex items-center justify-between text-xs pt-1 ${
              Math.abs(mixedDiff) < 0.01 ? 'text-success' : 'text-destructive'
            }`}>
              <span className="flex items-center gap-1">
                {Math.abs(mixedDiff) >= 0.01 && <AlertCircle className="w-3 h-3" />}
                {Math.abs(mixedDiff) < 0.01 ? '✓ Balanced' : mixedDiff > 0 ? `₹${mixedDiff.toFixed(0)} remaining` : `₹${Math.abs(mixedDiff).toFixed(0)} excess`}
              </span>
              <span className="font-display font-bold">{fmt(mixedTotal)} / {fmt(grandTotal)}</span>
            </div>
          </div>
        )}

        {/* EMI Lending Partner */}
        {(paymentMethod === 'emi' || (paymentMethod === 'mixed' && mixedPayment.emi > 0)) && (
          <div className="mt-3 p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold">EMI Lending Partner</p>
            <input
              value={emiLendingPartner}
              onChange={e => onEmiLendingPartnerChange(e.target.value)}
              placeholder="e.g. Bajaj Finance, HDFC, etc."
              className="checkout-input w-full h-9 px-3 rounded-lg text-sm"
            />
          </div>
        )}

        {/* Exchange Notes */}
        {(paymentMethod === 'exchange' || (paymentMethod === 'mixed' && mixedPayment.exchange > 0)) && (
          <div className="mt-3 p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold">Exchange Notes</p>
            <textarea
              value={exchangeNotes}
              onChange={e => onExchangeNotesChange(e.target.value)}
              placeholder="e.g. Old phone model, condition, exchange value..."
              rows={3}
              className="checkout-input w-full px-3 py-2 rounded-lg text-sm resize-none"
            />
          </div>
        )}

        {/* Payment Notes */}
        <div className="mt-3 p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold">📝 Payment Notes</p>
          <input
            value={paymentNotes}
            onChange={e => onPaymentNotesChange(e.target.value)}
            placeholder="e.g. UPI Ref, Card last 4, any note..."
            className="checkout-input w-full h-9 px-3 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* ── Grand Total + Received + Complete ────────────────────── */}
      <div className="p-4 border-t border-checkout-foreground/8 bg-checkout-foreground/5 flex-shrink-0">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-checkout-foreground/50 font-display text-xs uppercase tracking-wider">Grand Total</span>
          <span className="font-display text-3xl font-extrabold tracking-tight">{fmt(grandTotal)}</span>
        </div>

        {/* Amount Received */}
        {items.length > 0 && (
          <div className="mb-3 p-3 rounded-xl bg-checkout-foreground/5 border border-checkout-foreground/8 space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-checkout-foreground/40 font-display font-semibold block">💰 Amount Received</label>
            <input
              type="number"
              value={amountReceived}
              onChange={e => {
                const v = e.target.value;
                onAmountReceivedChange(v === '' ? '' : Number(v));
              }}
              placeholder={fmt(grandTotal)}
              className="checkout-input w-full h-10 px-3 rounded-xl text-sm font-display font-bold text-center"
            />
            {balancePending > 0 && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="w-3 h-3" />
                  Pending will be added
                </span>
                <span className="font-display font-bold text-warning">{fmt(balancePending)}</span>
              </div>
            )}
            {amountReceived !== '' && amountReceived >= grandTotal && (
              <div className="text-xs text-success font-display font-semibold text-center">✓ Full payment received</div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-12 font-display font-bold text-base"
            onClick={onPreviewBill}
            disabled={items.length === 0 || !mixedValid || hasPending}
          >
            <Eye className="w-5 h-5 mr-2" />
            Preview
          </Button>
          <Button
            size="lg"
            className="flex-1 h-12 bg-success hover:bg-success/90 text-success-foreground font-display font-bold text-base shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
            onClick={onCompleteSale}
            disabled={items.length === 0 || !mixedValid || saving || hasPending}
          >
            <Printer className="w-5 h-5 mr-2" />
            {hasPending ? 'Pending Due' : 'Print & Save'}
            <span className="text-[10px] opacity-70 ml-2 px-1.5 py-0.5 bg-success-foreground/20 rounded">F9</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
