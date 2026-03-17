import React, { useState } from 'react';
import { getInvoices, getProducts, getIMEIs, getDealers } from '@/lib/store';
import { BarChart3, TrendingUp, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState<'daily' | 'stock' | 'gst'>('daily');
  const invoices = getInvoices();
  const products = getProducts();
  const imeis = getIMEIs();

  const today = new Date().toDateString();
  const todaySales = invoices.filter(i => new Date(i.date).toDateString() === today);
  const todayTotal = todaySales.reduce((s, i) => s + i.grandTotal, 0);
  const totalSales = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalItems = imeis.length;
  const inStock = imeis.filter(r => r.status === 'in_stock').length;
  const sold = imeis.filter(r => r.status === 'sold').length;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-4">Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today's Sales", value: `₹${todayTotal.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-success' },
          { label: 'Total Revenue', value: `₹${totalSales.toLocaleString('en-IN')}`, icon: BarChart3, color: 'text-primary' },
          { label: 'In Stock', value: String(inStock), icon: Package, color: 'text-warning' },
          { label: 'Total Invoices', value: String(invoices.length), icon: FileText, color: 'text-muted-foreground' },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="font-display text-2xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['daily', 'stock', 'gst'] as const).map(t => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)} className="capitalize">
            {t === 'daily' ? 'Sales' : t === 'stock' ? 'Stock' : 'GST Report'}
          </Button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left font-display text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice().reverse().map(inv => (
                <tr key={inv.id} className="border-t hover:bg-accent/50">
                  <td className="px-4 py-2 font-display font-medium text-primary">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(inv.date).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2">{inv.customerName}</td>
                  <td className="px-4 py-2">{inv.items.length}</td>
                  <td className="px-4 py-2 capitalize">{inv.paymentMethod}</td>
                  <td className="px-4 py-2 text-right price-text">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stock' && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left font-display text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-center">In Stock</th>
                <th className="px-4 py-3 text-center">Sold</th>
                <th className="px-4 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const pImeis = imeis.filter(r => r.productId === p.id);
                return (
                  <tr key={p.id} className="border-t hover:bg-accent/50">
                    <td className="px-4 py-2 font-display font-medium">{p.brand} {p.model} <span className="text-muted-foreground">{p.variant}</span></td>
                    <td className="px-4 py-2 text-center text-success font-bold">{pImeis.filter(r => r.status === 'in_stock').length}</td>
                    <td className="px-4 py-2 text-center text-muted-foreground">{pImeis.filter(r => r.status === 'sold').length}</td>
                    <td className="px-4 py-2 text-center">{pImeis.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'gst' && (
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-sm mb-4">GST Summary for all GST invoices</p>
          {(() => {
            const gstInvoices = invoices.filter(i => i.isGSTBill);
            const totalCGST = gstInvoices.reduce((s, i) => s + i.cgst, 0);
            const totalSGST = gstInvoices.reduce((s, i) => s + i.sgst, 0);
            const totalTaxable = gstInvoices.reduce((s, i) => s + (i.grandTotal - i.cgst - i.sgst), 0);
            return (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Taxable Value</span><span className="price-text">₹{totalTaxable.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Total CGST</span><span className="price-text">₹{totalCGST.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Total SGST</span><span className="price-text">₹{totalSGST.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between font-display font-bold text-lg border-t pt-2">
                  <span>Total Tax Collected</span>
                  <span>₹{(totalCGST + totalSGST).toLocaleString('en-IN')}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
