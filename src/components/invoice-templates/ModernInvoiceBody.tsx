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

export const ModernInvoiceBody: React.FC<Props> = ({
  invoice, businessName, businessAddress, businessPhone, businessGST, subHeading, logoUrl, terms,
}) => (
  <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: '12px', color: '#111', background: '#fff', padding: '0' }}>
    {/* Header - Modern split layout */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #4338ca', paddingBottom: '14px', marginBottom: '14px' }}>
      <div>
        {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '50px', maxWidth: '150px', objectFit: 'contain', marginBottom: '6px' }} crossOrigin="anonymous" />}
        <div style={{ fontSize: '26px', fontWeight: 900, color: '#4338ca', letterSpacing: '-0.5px' }}>{businessName}</div>
        {subHeading && <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600, marginTop: '2px' }}>{subHeading}</div>}
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', lineHeight: '1.5' }}>
          {businessAddress}<br />Phone: {businessPhone}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '11px', background: '#4338ca', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginBottom: '6px' }}>
          {invoice.is_gst_bill ? (invoice.customer_gst ? 'TAX INVOICE (B2B)' : 'TAX INVOICE (B2C)') : 'BILL OF SUPPLY'}
        </div>
        <div style={{ fontSize: '11px', marginTop: '4px' }}><strong>Invoice:</strong> {invoice.invoice_number}</div>
        <div style={{ fontSize: '11px' }}><strong>Date:</strong> {new Date(invoice.date).toLocaleString('en-IN')}</div>
        <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '4px', color: '#4338ca' }}>GSTIN: {businessGST}</div>
      </div>
    </div>

    {/* Customer Info */}
    <div style={{ background: '#f5f3ff', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '11px' }}>
      <div style={{ fontWeight: 700, color: '#4338ca', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill To</div>
      <div style={{ fontWeight: 700 }}>{invoice.customer_name}</div>
      {invoice.customer_phone && <div>Phone: {invoice.customer_phone}</div>}
      {invoice.customer_gst && <div>GSTIN: {invoice.customer_gst}</div>}
      {invoice.customer_address && <div style={{ color: '#6b7280' }}>Address: {invoice.customer_address}</div>}
    </div>

    {invoice.gst_bearer === 'seller' && (
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e' }}>GST Borne by Seller</span>
      </div>
    )}

    {/* Product Table */}
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '14px' }}>
      <thead>
        <tr style={{ background: '#4338ca', color: '#fff' }}>
          <th style={{ padding: '6px 6px', textAlign: 'left', borderRadius: '4px 0 0 0' }}>S.No</th>
          <th style={{ padding: '6px 6px', textAlign: 'left' }}>Product</th>
          <th style={{ padding: '6px 6px', textAlign: 'left' }}>HSN</th>
          <th style={{ padding: '6px 6px', textAlign: 'left' }}>IMEI</th>
          <th style={{ padding: '6px 6px', textAlign: 'right' }}>Price</th>
          <th style={{ padding: '6px 6px', textAlign: 'right' }}>Disc.</th>
          {invoice.is_gst_bill && (
            <>
              <th style={{ padding: '6px 6px', textAlign: 'right' }}>Taxable</th>
              <th style={{ padding: '6px 6px', textAlign: 'right' }}>CGST</th>
              <th style={{ padding: '6px 6px', textAlign: 'right' }}>SGST</th>
            </>
          )}
          <th style={{ padding: '6px 6px', textAlign: 'right', borderRadius: '0 4px 0 0' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item, idx) => {
          const gst = invoice.is_gst_bill ? calcItemGST(item.total, Number(item.product.gst_percent)) : null;
          return (
            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fafafa' : '#fff' }}>
              <td style={{ padding: '6px', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ padding: '6px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 700 }}>{item.product.brand} {item.product.model}</div>
                <div style={{ color: '#6b7280', fontSize: '8.5px' }}>{item.product.variant} · {item.product.color}</div>
              </td>
              <td style={{ padding: '6px', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '8.5px' }}>{item.product.hsn_code || '—'}</td>
              <td style={{ padding: '6px', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '8.5px' }}>{item.imei || '—'}</td>
              <td style={{ padding: '6px', textAlign: 'right', verticalAlign: 'top' }}>₹{item.unitPrice.toLocaleString('en-IN')}</td>
              <td style={{ padding: '6px', textAlign: 'right', verticalAlign: 'top' }}>{item.discount > 0 ? `₹${item.discount}` : '—'}</td>
              {invoice.is_gst_bill && gst && (
                <>
                  <td style={{ padding: '6px', textAlign: 'right', verticalAlign: 'top', color: '#6b7280' }}>
                    ₹{gst.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', verticalAlign: 'top', color: '#6b7280', fontSize: '8.5px' }}>
                    ₹{gst.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <div style={{ fontSize: '7px' }}>@{(Number(item.product.gst_percent) / 2).toFixed(1)}%</div>
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', verticalAlign: 'top', color: '#6b7280', fontSize: '8.5px' }}>
                    ₹{gst.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <div style={{ fontSize: '7px' }}>@{(Number(item.product.gst_percent) / 2).toFixed(1)}%</div>
                  </td>
                </>
              )}
              <td style={{ padding: '6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>₹{item.total.toLocaleString('en-IN')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {/* Summary */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
      <div style={{ width: '260px', background: '#f5f3ff', borderRadius: '8px', padding: '12px', fontSize: '10px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#4338ca', fontWeight: 700 }}>
              <span>GST Total</span><span>₹{(invoice.cgst + invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '3px solid #4338ca', marginTop: '6px', paddingTop: '6px', fontWeight: 900, fontSize: '15px', color: '#4338ca' }}>
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
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', background: '#f5f3ff', borderRadius: '4px' }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{key}</span>
                <span>₹{Number(val).toLocaleString('en-IN')}</span>
              </div>
            ) : null
          )}
        </div>
      </div>
    )}

    {/* Warranty */}
    {(invoice.warranty_mobile || invoice.warranty_accessories) && (
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}>Warranty Details:</div>
        <div style={{ fontSize: '9.5px', lineHeight: '1.6' }}>
          {invoice.warranty_mobile && <div>📱 Mobile: {invoice.warranty_mobile}</div>}
          {invoice.warranty_accessories && <div>🔋 Battery: {invoice.warranty_accessories}</div>}
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
