import React from 'react';
import { amountInWords, calculateGST } from '@/lib/store';
import type { InvoiceData } from '../POSBilling';

interface Props {
  invoice: InvoiceData;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessGST: string;
  subHeading: string;
  logoUrl: string;
  terms: string[];
}

// Prices are always inclusive of GST — always extract taxable from price
const calcItemGST = (total: number, gstPercent: number) => calculateGST(total, gstPercent);

export const CompactInvoiceBody: React.FC<Props> = ({
  invoice, businessName, businessAddress, businessPhone, businessGST, subHeading, logoUrl, terms,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#111', background: '#fff', padding: '0', maxWidth: '380px', margin: '0 auto' }}>
    {/* Header */}
    <div style={{ textAlign: 'center', borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
      {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '40px', maxWidth: '120px', objectFit: 'contain', margin: '0 auto 4px' }} crossOrigin="anonymous" />}
      <div style={{ fontSize: '18px', fontWeight: 900 }}>{businessName}</div>
      {subHeading && <div style={{ fontSize: '10px', color: '#666', fontWeight: 600 }}>{subHeading}</div>}
      <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{businessAddress}</div>
      <div style={{ fontSize: '9px', color: '#666' }}>Ph: {businessPhone} | GST: {businessGST}</div>
    </div>

    {/* Invoice info */}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '6px' }}>
      <div><strong>{invoice.invoice_number}</strong></div>
      <div>{new Date(invoice.date).toLocaleDateString('en-IN')}</div>
    </div>
    <div style={{ fontSize: '9px', marginBottom: '6px', borderBottom: '1px dashed #ccc', paddingBottom: '6px' }}>
      <strong>{invoice.customer_name}</strong>
      {invoice.customer_phone && <span> | {invoice.customer_phone}</span>}
      {invoice.customer_gst && <div style={{ fontSize: '8px' }}>GST: {invoice.customer_gst}</div>}
      {invoice.customer_address && <div style={{ fontSize: '8px', color: '#888' }}>{invoice.customer_address}</div>}
    </div>

    <div style={{ textAlign: 'center', marginBottom: '6px' }}>
      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 6px', border: '1px solid #ccc', borderRadius: '3px' }}>
        {invoice.is_gst_bill ? (invoice.customer_gst ? 'B2B' : 'B2C') : 'NON-GST'}
      </span>
      {invoice.gst_bearer === 'seller' && (
        <span style={{ marginLeft: '4px', fontSize: '7px', fontWeight: 700, padding: '1px 4px', border: '1px solid #fcd34d', borderRadius: '3px', background: '#fffbeb', color: '#92400e' }}>Seller GST</span>
      )}
    </div>

    {/* Items */}
    <div style={{ borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase', color: '#666' }}>
        <span>Item</span>
        {invoice.is_gst_bill && <span>GST</span>}
        <span>Amount</span>
      </div>
      {invoice.items.map((item) => {
        const gst = invoice.is_gst_bill ? calcItemGST(item.total, Number(item.product.gst_percent)) : null;
        return (
          <div key={item.id} style={{ padding: '3px 0', borderTop: '1px dotted #e5e7eb', fontSize: '9px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.product.brand} {item.product.model}</div>
                <div style={{ fontSize: '7.5px', color: '#888' }}>
                  {item.product.variant} {item.imei ? `| ${item.imei}` : ''}
                  {item.discount > 0 ? ` | Disc: ₹${item.discount}` : ''}
                </div>
              </div>
              <div style={{ fontWeight: 700, whiteSpace: 'nowrap', paddingLeft: '8px' }}>₹{item.total.toLocaleString('en-IN')}</div>
            </div>
            {invoice.is_gst_bill && gst && (
              <div style={{ fontSize: '7.5px', color: '#888', display: 'flex', gap: '6px', marginTop: '1px' }}>
                <span>Taxable: ₹{gst.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span>C: ₹{gst.cgst.toFixed(2)} @{(Number(item.product.gst_percent) / 2).toFixed(1)}%</span>
                <span>S: ₹{gst.sgst.toFixed(2)} @{(Number(item.product.gst_percent) / 2).toFixed(1)}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Totals */}
    <div style={{ fontSize: '9px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Subtotal</span><span>₹{invoice.subtotal.toLocaleString('en-IN')}</span>
      </div>
      {invoice.total_discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
          <span>Discount</span><span>-₹{invoice.total_discount.toLocaleString('en-IN')}</span>
        </div>
      )}
      {invoice.is_gst_bill && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888' }}>
            <span>Taxable Amt</span><span>₹{(invoice.grand_total - invoice.cgst - invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888' }}>
            <span>CGST</span><span>₹{invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888' }}>
            <span>SGST</span><span>₹{invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333', fontWeight: 700 }}>
            <span>GST Total</span><span>₹{(invoice.cgst + invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #111', marginTop: '4px', paddingTop: '4px', fontWeight: 900, fontSize: '13px' }}>
        <span>TOTAL</span><span>₹{invoice.grand_total.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div style={{ fontSize: '8px', fontStyle: 'italic', color: '#888', marginBottom: '8px', textAlign: 'center' }}>{amountInWords(invoice.grand_total)}</div>

    {/* Payment */}
    {invoice.payment_method === 'mixed' && (invoice as any).payment_details && (
      <div style={{ fontSize: '8px', borderTop: '1px dashed #ccc', paddingTop: '6px', marginBottom: '6px' }}>
        <strong>Payment: </strong>
        {Object.entries((invoice as any).payment_details as Record<string, number>)
          .filter(([, v]) => (v as number) > 0)
          .map(([k, v]) => `${k}: ₹${Number(v).toLocaleString('en-IN')}`)
          .join(' | ')}
      </div>
    )}

    {/* Warranty */}
    {(invoice.warranty_mobile || invoice.warranty_accessories) && (
      <div style={{ fontSize: '8px', borderTop: '1px dashed #ccc', paddingTop: '6px', marginBottom: '6px' }}>
        <strong>Warranty:</strong> {invoice.warranty_mobile && `Mobile: ${invoice.warranty_mobile}`}
        {invoice.warranty_accessories && ` | Battery: ${invoice.warranty_accessories}`}
      </div>
    )}

    {/* Terms */}
    <div style={{ borderTop: '1px dashed #ccc', paddingTop: '6px', fontSize: '7px', color: '#888', lineHeight: '1.5', marginBottom: '8px' }}>
      {terms.slice(0, 4).map((t: string, i: number) => <div key={i}>{t}</div>)}
    </div>

    <div style={{ textAlign: 'center', fontSize: '8px', color: '#aaa', borderTop: '1px dashed #ccc', paddingTop: '6px' }}>
      Thank you for your purchase!
    </div>
  </div>
);
