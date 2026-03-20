import React, { useEffect } from 'react';
import { useShop } from '@/contexts/ShopContext';
import { amountInWords, calculateGST } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Printer, Download } from 'lucide-react';
import { usePrint, triggerPrint } from '@/components/PrintPortal';
import { ModernInvoiceBody } from './invoice-templates/ModernInvoiceBody';
import { CompactInvoiceBody } from './invoice-templates/CompactInvoiceBody';
import type { InvoiceData } from './POSBilling';

export const getSelectedTemplate = (): string => {
  try { return localStorage.getItem('bill_template') || 'classic'; } catch { return 'classic'; }
};

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

export { triggerPrint as triggerInvoicePrint };

/** Standalone print body — can be used outside InvoicePreview (e.g. bulk print) */
export const InvoicePrintBody: React.FC<{ invoice: InvoiceData; shop: any; template?: string }> = ({ invoice, shop, template = 'classic' }) => {
  const businessName = invoice.billing_business_name || shop.name;
  const businessAddress = invoice.billing_address || shop.address;
  const businessPhone = invoice.billing_phone || shop.phone;
  const businessGST = invoice.billing_gst_number || shop.gst_number;
  const subHeading = invoice.billing_sub_heading || (shop as any).sub_heading || '';
  const logoUrl = (invoice as any).billing_logo_url || shop.logo_url;
  const terms = (shop.terms_and_conditions && shop.terms_and_conditions.length > 0)
    ? shop.terms_and_conditions
    : DEFAULT_TERMS;

  if (template === 'modern') {
    return <ModernInvoiceBody invoice={invoice} businessName={businessName} businessAddress={businessAddress}
      businessPhone={businessPhone} businessGST={businessGST} subHeading={subHeading} logoUrl={logoUrl} terms={terms} />;
  }
  if (template === 'compact') {
    return <CompactInvoiceBody invoice={invoice} businessName={businessName} businessAddress={businessAddress}
      businessPhone={businessPhone} businessGST={businessGST} subHeading={subHeading} logoUrl={logoUrl} terms={terms} />;
  }

  return (
    <InvoiceBodyInner invoice={invoice} businessName={businessName} businessAddress={businessAddress}
      businessPhone={businessPhone} businessGST={businessGST} subHeading={subHeading} logoUrl={logoUrl} terms={terms} />
  );
};

const InvoiceBodyInner: React.FC<{
  invoice: InvoiceData; businessName: string; businessAddress: string;
  businessPhone: string; businessGST: string; subHeading: string; logoUrl: string; terms: string[];
}> = ({ invoice, businessName, businessAddress, businessPhone, businessGST, subHeading, logoUrl, terms }) => (
  <div className="invoice-page" style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: '11px', color: '#111', background: '#fff', padding: '0' }}>
    {/* Header */}
    <div style={{ textAlign: 'center', borderBottom: '2px solid #222', paddingBottom: '12px', marginBottom: '10px' }}>
      {logoUrl && (
        <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
          <img src={logoUrl} alt="Logo" style={{ height: '60px', maxWidth: '180px', objectFit: 'contain' }} crossOrigin="anonymous" />
        </div>
      )}
      <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>{businessName}</div>
      {subHeading && <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', fontWeight: 600 }}>{subHeading}</div>}
      <div style={{ fontSize: '9.5px', color: '#555', marginTop: '4px' }}>{businessAddress}</div>
      <div style={{ fontSize: '9.5px', color: '#555' }}>Phone: {businessPhone}</div>
      <div style={{ fontSize: '9.5px', fontWeight: 700, marginTop: '2px' }}>GSTIN: {businessGST}</div>
    </div>

    {/* Invoice Meta */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '10px' }}>
      <div>
        <div><strong>Invoice:</strong> {invoice.invoice_number}</div>
        <div><strong>Date:</strong> {new Date(invoice.date).toLocaleString('en-IN')}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div><strong>Customer:</strong> {invoice.customer_name}</div>
        {invoice.customer_phone && <div><strong>Phone:</strong> {invoice.customer_phone}</div>}
        {invoice.customer_gst && <div><strong>GSTIN:</strong> {invoice.customer_gst}</div>}
        {(invoice as any).customer_address && <div style={{ fontSize: '9px', color: '#6b7280' }}>{(invoice as any).customer_address}</div>}
      </div>
    </div>

    {/* Bill Type Badge */}
    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, border: '1px solid #ccc', background: invoice.is_gst_bill ? '#eef2ff' : '#f3f4f6', color: invoice.is_gst_bill ? '#3730a3' : '#374151' }}>
        {invoice.is_gst_bill ? (invoice.customer_gst ? 'TAX INVOICE (B2B)' : 'TAX INVOICE (B2C)') : 'BILL OF SUPPLY'}
      </span>
      {invoice.gst_bearer === 'seller' && (
        <span style={{ marginLeft: '6px', display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e' }}>GST Borne by Seller</span>
      )}
    </div>

    {/* Product Table */}
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '12px' }}>
      <thead>
        <tr style={{ borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', color: '#555', fontWeight: 700, textTransform: 'uppercase', fontSize: '8.5px' }}>
          <th style={{ padding: '5px 4px', textAlign: 'left' }}>S.No</th>
          <th style={{ padding: '5px 4px', textAlign: 'left' }}>Product</th>
          <th style={{ padding: '5px 4px', textAlign: 'left' }}>HSN</th>
          <th style={{ padding: '5px 4px', textAlign: 'left' }}>IMEI</th>
          <th style={{ padding: '5px 4px', textAlign: 'right' }}>Price</th>
          <th style={{ padding: '5px 4px', textAlign: 'right' }}>Disc.</th>
          {invoice.is_gst_bill && <th style={{ padding: '5px 4px', textAlign: 'right' }}>GST</th>}
          <th style={{ padding: '5px 4px', textAlign: 'right' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item, idx) => {
          const gst = invoice.is_gst_bill ? calculateGST(item.total, Number(item.product.gst_percent)) : null;
          return (
            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '5px 4px', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ padding: '5px 4px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 700 }}>{item.product.brand} {item.product.model}</div>
                <div style={{ color: '#6b7280', fontSize: '8.5px' }}>{item.product.variant} · {item.product.color}</div>
                <div style={{ color: '#9ca3af', fontSize: '8px' }}>{item.product.category}</div>
              </td>
              <td style={{ padding: '5px 4px', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '8.5px' }}>{item.product.hsn_code || '—'}</td>
              <td style={{ padding: '5px 4px', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '8.5px' }}>{item.imei || '—'}</td>
              <td style={{ padding: '5px 4px', textAlign: 'right', verticalAlign: 'top' }}>
                <div>₹{item.unitPrice.toLocaleString('en-IN')}</div>
                {invoice.is_gst_bill && gst && (
                  <div style={{ fontSize: '7.5px', color: '#6b7280' }}>Base: ₹{gst.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                )}
              </td>
              <td style={{ padding: '5px 4px', textAlign: 'right', verticalAlign: 'top' }}>{item.discount > 0 ? `₹${item.discount}` : '—'}</td>
              {invoice.is_gst_bill && gst && (
                <td style={{ padding: '5px 4px', textAlign: 'right', verticalAlign: 'top', color: '#6b7280' }}>
                  <div>₹{gst.totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: '7.5px' }}>C:{gst.cgst.toFixed(2)} S:{gst.sgst.toFixed(2)}</div>
                </td>
              )}
              <td style={{ padding: '5px 4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>₹{item.total.toLocaleString('en-IN')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {/* Summary */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
      <div style={{ width: '220px', fontSize: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>Subtotal</span><span>₹{invoice.subtotal.toLocaleString('en-IN')}</span>
        </div>
        {invoice.total_discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#d97706' }}>
            <span>Discount</span><span>-₹{invoice.total_discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        {invoice.is_gst_bill && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#6b7280' }}>
              <span>Taxable Amount</span><span>₹{(invoice.grand_total - invoice.cgst - invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#6b7280' }}>
              <span>CGST</span><span>₹{invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#6b7280' }}>
              <span>SGST</span><span>₹{invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#6b7280' }}>
              <span>GST Total</span><span style={{ fontWeight: 700, color: '#3730a3' }}>₹{(invoice.cgst + invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #222', marginTop: '4px', paddingTop: '4px', fontWeight: 900, fontSize: '13px' }}>
          <span>Grand Total</span><span>₹{invoice.grand_total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#6b7280', marginBottom: '12px' }}>{amountInWords(invoice.grand_total)}</div>

    {/* Payment Breakdown */}
    {invoice.payment_method === 'mixed' && (invoice as any).payment_details && (
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '6px' }}>Payment Breakdown:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9.5px' }}>
          {Object.entries((invoice as any).payment_details as Record<string, number>).map(([key, val]) =>
            (val as number) > 0 ? (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', background: '#f3f4f6', borderRadius: '4px' }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{key}</span>
                <span>₹{Number(val).toLocaleString('en-IN')}</span>
              </div>
            ) : null
          )}
        </div>
      </div>
    )}

    {/* Warranty Details */}
    {(invoice.warranty_mobile || invoice.warranty_accessories) && (
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}>Warranty Details:</div>
        <div style={{ fontSize: '9.5px', lineHeight: '1.6' }}>
          {invoice.warranty_mobile && <div>Mobile: {invoice.warranty_mobile}</div>}
          {invoice.warranty_accessories && <div>Accessories: {invoice.warranty_accessories}</div>}
        </div>
      </div>
    )}

    {/* Terms */}
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginBottom: '14px' }}>
      <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}>நிபந்தனைகள் / Terms & Conditions:</div>
      <div style={{ fontSize: '8.5px', color: '#6b7280', lineHeight: '1.7' }}>
        {terms.map((t: string, i: number) => <div key={i}>{t}</div>)}
      </div>
    </div>

    {/* Signatures */}
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '24px', fontSize: '9px', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '120px', borderTop: '1px solid #9ca3af', marginBottom: '4px' }} />
        <div>Customer Signature</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '120px', borderTop: '1px solid #9ca3af', marginBottom: '4px' }} />
        <div>Authorized Signature</div>
      </div>
    </div>
  </div>
);

export const InvoicePreview: React.FC<Props> = ({ invoice, onClose }) => {
  const { activeShop } = useShop();
  const shop = activeShop;
  const { printContent, clearContent } = usePrint();

  if (!shop) return null;

  const handlePrint = () => {
    printContent(<InvoicePrintBody invoice={invoice} shop={shop} />);
    setTimeout(() => {
      triggerPrint().then(() => clearContent());
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-[700px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-display font-bold text-lg">Invoice Preview</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="w-4 h-4 mr-1" /> Save PDF
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Screen preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-secondary/20">
          <div className="bg-white rounded-lg shadow-sm border p-6 max-w-[600px] mx-auto">
            <InvoicePrintBody invoice={invoice} shop={shop} />
          </div>
        </div>
      </div>
    </div>
  );
};
