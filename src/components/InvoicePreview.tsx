import React from 'react';
import { Invoice } from '@/types';
import { getActiveShop, amountInWords, calculateGST } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Printer, FileText } from 'lucide-react';

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePreview: React.FC<Props> = ({ invoice, onClose }) => {
  const shop = getActiveShop();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-[700px] max-h-[90vh] flex flex-col">
        {/* Toolbar */}
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

        {/* A4 Preview */}
        <div className="flex-1 overflow-y-auto p-6 print-area">
          <div className="max-w-[600px] mx-auto font-body text-sm text-foreground">
            {/* Header */}
            <div className="text-center mb-4 border-b pb-4">
              <h1 className="font-display text-2xl font-extrabold">{shop.name}</h1>
              <p className="text-muted-foreground text-xs mt-1">{shop.address}</p>
              <p className="text-muted-foreground text-xs">Phone: {shop.phone}</p>
              <p className="font-display text-xs font-semibold mt-1">GSTIN: {shop.gstNumber}</p>
            </div>

            {/* Invoice Details */}
            <div className="flex justify-between text-xs mb-4">
              <div>
                <p><strong>Invoice:</strong> {invoice.invoiceNumber}</p>
                <p><strong>Date:</strong> {new Date(invoice.date).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p><strong>Customer:</strong> {invoice.customerName}</p>
                {invoice.customerPhone && <p><strong>Phone:</strong> {invoice.customerPhone}</p>}
                {invoice.customerGST && <p><strong>GSTIN:</strong> {invoice.customerGST}</p>}
              </div>
            </div>

            <div className="text-center mb-2">
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-display font-semibold ${
                invoice.isGSTBill ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
              }`}>
                {invoice.isGSTBill ? (invoice.customerGST ? 'TAX INVOICE (B2B)' : 'TAX INVOICE (B2C)') : 'BILL OF SUPPLY'}
              </span>
            </div>

            {/* Product Table */}
            <table className="w-full text-xs border-collapse mb-4">
              <thead>
                <tr className="border-t border-b font-display text-muted-foreground uppercase">
                  <th className="py-2 text-left">S.No</th>
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-left">IMEI</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Disc.</th>
                  {invoice.isGSTBill && <th className="py-2 text-right">GST</th>}
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => {
                  const gst = invoice.isGSTBill ? calculateGST(item.total, item.product.gstPercent) : null;
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="py-1.5">{idx + 1}</td>
                      <td className="py-1.5">
                        <div className="font-medium">{item.product.brand} {item.product.model}</div>
                        <div className="text-muted-foreground">{item.product.variant} · {item.product.color}</div>
                      </td>
                      <td className="py-1.5 font-mono text-[10px]">{item.imei || '—'}</td>
                      <td className="py-1.5 text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-1.5 text-right">{item.discount > 0 ? `₹${item.discount}` : '—'}</td>
                      {invoice.isGSTBill && gst && (
                        <td className="py-1.5 text-right text-muted-foreground">₹{gst.totalGST}</td>
                      )}
                      <td className="py-1.5 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex justify-end mb-4">
              <div className="w-60 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-warning">
                    <span>Discount</span>
                    <span>-₹{invoice.totalDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {invoice.isGSTBill && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST</span>
                      <span>₹{invoice.cgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST</span>
                      <span>₹{invoice.sgst.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-display font-bold text-base pt-1 border-t">
                  <span>Grand Total</span>
                  <span>₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Amount in words */}
            <p className="text-xs italic text-muted-foreground mb-4">
              {amountInWords(invoice.grandTotal)}
            </p>

            {/* Tamil Terms & Conditions */}
            <div className="border-t pt-3 mb-4">
              <p className="font-display text-xs font-semibold mb-1">நிபந்தனைகள் / Terms & Conditions:</p>
              <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                {shop.termsAndConditions.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </div>

            {/* Signatures */}
            <div className="flex justify-between pt-8 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="w-32 border-t" />
                <p className="mt-1">Customer Signature</p>
              </div>
              <div className="text-center">
                <div className="w-32 border-t" />
                <p className="mt-1">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
