import React from 'react';
import { useShop } from '@/contexts/ShopContext';
import { amountInWords, calculateGST } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import type { InvoiceData } from './POSBilling';

interface Props {
  invoice: InvoiceData;
  onClose: () => void;
}

const DEFAULT_TERMS = [
  '★ கண்டிப்பாக பொருட்கள் திரும்ப பெறவோ / மாற்றி தரவோ இயலாது.',
  '★ கம்பெனி சர்வீஸ் என்பது வாடிக்கையாளர்களே நேரில் சென்று செய்து கொள்ள வேண்டும்.',
  '★ கம்பெனி சர்வீஸ் என்பது அதிகபட்சம் 30 நாள் வரை ஆகலாம்.',
  '★ தண்ணீர் படுதல்/கீழே விழுந்து உடைதல்/பேனல் உடைதல் ஆகியவற்றிற்கு வாரண்டி/கேரண்டி கிடையாது.',
  '★ பேட்டரி உப்பி இருந்தால் வாரண்டி கிடையாது.',
  '★ வாரண்டி முடிந்த பிறகு, கம்பெனி செல்போன்களுக்கு உதிரிபாகங்கள் எதிர்காலத்தில் கிடைக்காமல் போனால் நிர்வாகம் பொறுப்பல்ல.',
];

export const InvoicePreview: React.FC<Props> = ({ invoice, onClose }) => {
  const { activeShop } = useShop();
  const shop = activeShop;

  const handlePrint = () => { window.print(); };

  if (!shop) return null;

  const businessName = invoice.billing_business_name || shop.name;
  const businessAddress = invoice.billing_address || shop.address;
  const businessPhone = invoice.billing_phone || shop.phone;
  const businessGST = invoice.billing_gst_number || shop.gst_number;
  const subHeading = invoice.billing_sub_heading || (shop as any).sub_heading || '';
  const logoUrl = (invoice as any).billing_logo_url || (invoice as any).billing_profile_logo_url || shop.logo_url;

  const terms = (shop.terms_and_conditions && shop.terms_and_conditions.length > 0)
    ? shop.terms_and_conditions
    : DEFAULT_TERMS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-[700px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-display font-bold text-lg">Invoice Preview</h2>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 print-area">
          <div className="max-w-[600px] mx-auto font-body text-sm text-foreground">
            {/* Header */}
            <div className="text-center mb-4 border-b pb-4">
              {logoUrl && (
                <div className="mb-2 flex justify-center">
                  <img src={logoUrl} alt="Business Logo" className="h-16 max-w-[200px] object-contain" />
                </div>
              )}
              <h1 className="font-display text-2xl font-extrabold">{businessName}</h1>
              {subHeading && (
                <p className="text-muted-foreground text-xs mt-0.5 font-display font-semibold">{subHeading}</p>
              )}
              <p className="text-muted-foreground text-xs mt-1">{businessAddress}</p>
              <p className="text-muted-foreground text-xs">Phone: {businessPhone}</p>
              <p className="font-display text-xs font-semibold mt-1">GSTIN: {businessGST}</p>
            </div>

            <div className="flex justify-between text-xs mb-4">
              <div>
                <p><strong>Invoice:</strong> {invoice.invoice_number}</p>
                <p><strong>Date:</strong> {new Date(invoice.date).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p><strong>Customer:</strong> {invoice.customer_name}</p>
                {invoice.customer_phone && <p><strong>Phone:</strong> {invoice.customer_phone}</p>}
                {invoice.customer_gst && <p><strong>GSTIN:</strong> {invoice.customer_gst}</p>}
              </div>
            </div>

            <div className="text-center mb-2">
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-display font-semibold ${
                invoice.is_gst_bill ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
              }`}>
                {invoice.is_gst_bill ? (invoice.customer_gst ? 'TAX INVOICE (B2B)' : 'TAX INVOICE (B2C)') : 'BILL OF SUPPLY'}
              </span>
              {invoice.gst_bearer === 'seller' && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-display bg-warning/10 text-warning font-semibold">
                  GST Borne by Seller
                </span>
              )}
              {(invoice.payment_method === 'emi' || (invoice.payment_method === 'mixed')) && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-display bg-accent text-accent-foreground font-semibold">
                  {invoice.payment_method === 'emi' ? 'EMI' : 'Mixed Payment'}
                </span>
              )}
            </div>

            {/* Product Table */}
            <table className="w-full text-xs border-collapse mb-4">
              <thead>
                <tr className="border-t border-b font-display text-muted-foreground uppercase">
                  <th className="py-2 text-left">S.No</th>
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-left">HSN</th>
                  <th className="py-2 text-left">IMEI</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Disc.</th>
                  {invoice.is_gst_bill && <th className="py-2 text-right">GST</th>}
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => {
                  const gst = invoice.is_gst_bill ? calculateGST(item.total, Number(item.product.gst_percent)) : null;
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="py-1.5">{idx + 1}</td>
                      <td className="py-1.5">
                        <div className="font-medium">{item.product.brand} {item.product.model}</div>
                        <div className="text-muted-foreground">{item.product.variant} · {item.product.color}</div>
                        <div className="text-muted-foreground text-[10px]">{item.product.category}</div>
                      </td>
                      <td className="py-1.5 font-mono text-[10px]">{item.product.hsn_code || '—'}</td>
                      <td className="py-1.5 font-mono text-[10px]">{item.imei || '—'}</td>
                      <td className="py-1.5 text-right">
                        <div>₹{item.unitPrice.toLocaleString('en-IN')}</div>
                        {invoice.is_gst_bill && gst && (
                          <div className="text-[9px] text-muted-foreground">
                            Base: ₹{gst.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-right">{item.discount > 0 ? `₹${item.discount}` : '—'}</td>
                      {invoice.is_gst_bill && gst && (
                        <td className="py-1.5 text-right text-muted-foreground">
                          <div>₹{gst.totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          <div className="text-[9px]">C:{gst.cgst.toFixed(2)} S:{gst.sgst.toFixed(2)}</div>
                        </td>
                      )}
                      <td className="py-1.5 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex justify-end mb-4">
              <div className="w-64 space-y-1 text-xs">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{invoice.subtotal.toLocaleString('en-IN')}</span></div>
                {invoice.total_discount > 0 && (
                  <div className="flex justify-between text-warning"><span>Discount</span><span>-₹{invoice.total_discount.toLocaleString('en-IN')}</span></div>
                )}
                {invoice.is_gst_bill && (
                  <>
                    <div className="flex justify-between text-muted-foreground"><span>Taxable Amount</span><span>₹{(invoice.grand_total - invoice.cgst - invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>CGST</span><span>₹{invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>SGST</span><span>₹{invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>GST Total</span><span className="font-semibold text-primary">₹{(invoice.cgst + invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  </>
                )}
                <div className="flex justify-between font-display font-bold text-base pt-1 border-t">
                  <span>Grand Total</span><span>₹{invoice.grand_total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <p className="text-xs italic text-muted-foreground mb-4">{amountInWords(invoice.grand_total)}</p>

            {/* Payment Breakdown */}
            {invoice.payment_method === 'mixed' && (invoice as any).payment_details && (
              <div className="border-t pt-3 mb-4">
                <p className="font-display text-xs font-semibold mb-2">💰 Payment Breakdown:</p>
                <div className="text-[11px] grid grid-cols-2 gap-1">
                  {Object.entries((invoice as any).payment_details as Record<string, number>).map(([key, val]) =>
                    val > 0 ? (
                      <div key={key} className="flex justify-between px-2 py-1 rounded bg-secondary/30">
                        <span className="capitalize font-semibold">{key}</span>
                        <span>₹{Number(val).toLocaleString('en-IN')}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Warranty Details */}
            {(invoice.warranty_mobile || invoice.warranty_accessories) && (
              <div className="border-t pt-3 mb-4">
                <p className="font-display text-xs font-semibold mb-2">🛡️ Warranty Details:</p>
                <div className="text-[11px] space-y-1">
                  {invoice.warranty_mobile && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[100px]">📱 Mobile:</span>
                      <span>{invoice.warranty_mobile}</span>
                    </div>
                  )}
                  {invoice.warranty_accessories && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[100px]">🎧 Accessories:</span>
                      <span>{invoice.warranty_accessories}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            <div className="border-t pt-3 mb-4">
              <p className="font-display text-xs font-semibold mb-1">நிபந்தனைகள் / Terms & Conditions:</p>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                {terms.map((t: string, i: number) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-8 text-xs text-muted-foreground">
              <div className="text-center"><div className="w-32 border-t" /><p className="mt-1">Customer Signature</p></div>
              <div className="text-center"><div className="w-32 border-t" /><p className="mt-1">Authorized Signature</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
