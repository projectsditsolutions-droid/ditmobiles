import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { TrendingUp, Package, FileText, Calendar, DollarSign, Eye, Printer, IndianRupee, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoicePreview } from './InvoicePreview';
import type { Database } from '@/integrations/supabase/types';
import type { InvoiceData } from './POSBilling';

type Invoice = Database['public']['Tables']['invoices']['Row'];

export const ReportsPage: React.FC = () => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [tab, setTab] = useState<'daily' | 'monthly' | 'stock' | 'gst' | 'profit'>('daily');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (!activeShopId && !isAllShops) return;
    const fetchData = async () => {
      let invQ = supabase.from('invoices').select('*');
      if (isAllShops) invQ = invQ.in('shop_id', allShopIds);
      else invQ = invQ.eq('shop_id', activeShopId!);
      const { data: inv } = await invQ.order('date', { ascending: false });
      if (inv) setInvoices(inv);

      let prodQ = supabase.from('products').select('*');
      if (isAllShops) prodQ = prodQ.in('shop_id', allShopIds);
      else prodQ = prodQ.eq('shop_id', activeShopId!);
      const { data: products } = await prodQ;

      let imeiQ = supabase.from('imei_records').select('*');
      if (isAllShops) imeiQ = imeiQ.in('shop_id', allShopIds);
      else imeiQ = imeiQ.eq('shop_id', activeShopId!);
      const { data: imeis } = await imeiQ;
      if (products && imeis) {
        setStockData(products.map(p => ({
          ...p,
          inStock: imeis.filter(r => r.product_id === p.id && r.status === 'in_stock').length,
          sold: imeis.filter(r => r.product_id === p.id && r.status === 'sold').length,
          total: imeis.filter(r => r.product_id === p.id).length,
          stockValue: imeis.filter(r => r.product_id === p.id && r.status === 'in_stock').reduce((s, r) => s + Number(r.purchase_price), 0),
        })));
      }
    };
    fetchData();
  }, [activeShopId]);

  const openInvoice = async (invoice: Invoice, autoPrint = false) => {
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('*, products(*)')
      .eq('invoice_id', invoice.id)
      .order('created_at');

    const preview: InvoiceData = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      shop_id: invoice.shop_id,
      date: invoice.date,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_gst: invoice.customer_gst || undefined,
      items: (invoiceItems || []).map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        product: item.products,
        imei: item.imei || undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        discount: Number(item.discount),
        discountType: item.discount_type,
        discountValue: Number(item.discount_value),
        total: Number(item.total),
      })),
      subtotal: Number(invoice.subtotal),
      total_discount: Number(invoice.total_discount),
      bill_discount: Number(invoice.bill_discount),
      bill_discount_type: invoice.bill_discount_type,
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      grand_total: Number(invoice.grand_total),
      payment_method: invoice.payment_method,
      is_gst_bill: invoice.is_gst_bill,
      gst_bearer: invoice.gst_bearer,
      print_type: invoice.print_type,
      status: invoice.status,
      billing_business_name: (invoice as any).billing_business_name || undefined,
      billing_address: (invoice as any).billing_address || undefined,
      billing_phone: (invoice as any).billing_phone || undefined,
      billing_gst_number: (invoice as any).billing_gst_number || undefined,
      warranty_mobile: (invoice as any).warranty_mobile || undefined,
      warranty_accessories: (invoice as any).warranty_accessories || undefined,
    };

    setSelectedInvoice(preview);
    if (autoPrint) window.setTimeout(() => window.print(), 250);
  };

  const today = new Date().toDateString();
  const todaySales = invoices.filter(i => new Date(i.date).toDateString() === today);
  const todayTotal = todaySales.reduce((s, i) => s + Number(i.grand_total), 0);
  const totalSales = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
  const totalInStock = stockData.reduce((s, p) => s + p.inStock, 0);
  const totalStockValue = stockData.reduce((s, p) => s + p.stockValue, 0);

  const monthlyData = invoices.reduce((acc: Record<string, { count: number; total: number }>, inv) => {
    const month = inv.date.slice(0, 7);
    if (!acc[month]) acc[month] = { count: 0, total: 0 };
    acc[month].count++;
    acc[month].total += Number(inv.grand_total);
    return acc;
  }, {});

  const tabs = [
    { key: 'daily', label: 'Sales', icon: TrendingUp },
    { key: 'monthly', label: 'Monthly', icon: Calendar },
    { key: 'stock', label: 'Stock', icon: Package },
    { key: 'gst', label: 'GST', icon: FileText },
    { key: 'profit', label: 'Profit', icon: DollarSign },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sales, GST, stock and invoice reprints</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Sales", value: `₹${todayTotal.toLocaleString('en-IN')}`, sub: `${todaySales.length} invoices`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Total Revenue', value: `₹${totalSales.toLocaleString('en-IN')}`, sub: `${invoices.length} invoices`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Stock Units', value: String(totalInStock), sub: `₹${totalStockValue.toLocaleString('en-IN')} value`, icon: Package, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Products', value: String(stockData.length), sub: `${stockData.filter(p => p.inStock === 0).length} out of stock`, icon: ShoppingBag, color: 'text-destructive', bg: 'bg-destructive/10' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-4.5 h-4.5 ${c.color}`} />
              </div>
              <span className="text-xs text-muted-foreground font-display font-medium">{c.label}</span>
            </div>
            <p className="font-display text-2xl font-extrabold">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex bg-secondary rounded-lg p-0.5 mb-5 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 100).map(inv => (
                <tr key={inv.id} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 font-display font-semibold text-primary text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(inv.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-4 py-2.5 font-display text-sm">{inv.customer_name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
                      inv.is_gst_bill ? (inv.customer_gst ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning') : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {inv.is_gst_bill ? (inv.customer_gst ? 'B2B' : 'B2C') : 'Non-GST'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold bg-secondary capitalize">{inv.payment_method}</span></td>
                  <td className="px-4 py-2.5 text-right price-text">₹{Number(inv.grand_total).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => openInvoice(inv)}><Eye className="w-3.5 h-3.5 mr-1" /> View</Button>
                      <Button size="sm" className="h-8" onClick={() => openInvoice(inv, true)}><Printer className="w-3.5 h-3.5 mr-1" /> Reprint</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-center">Invoices</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Avg. Invoice</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlyData).sort(([a], [b]) => b.localeCompare(a)).map(([month, data]) => (
                <tr key={month} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-display font-semibold">{new Date(month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</td>
                  <td className="px-4 py-3 text-center font-display font-bold">{data.count}</td>
                  <td className="px-4 py-3 text-right price-text text-primary">₹{data.total.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">₹{Math.round(data.total / data.count).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stock' && (
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-center">In Stock</th>
                <th className="px-4 py-3 text-center">Sold</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((p: any) => (
                <tr key={p.id} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5"><span className="font-display font-semibold">{p.brand} {p.model}</span><span className="text-muted-foreground ml-1.5 text-xs">{p.variant}</span></td>
                  <td className="px-4 py-2.5 text-center"><span className={`font-display font-bold ${p.inStock > 0 ? 'text-success' : 'text-destructive'}`}>{p.inStock}</span></td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{p.sold}</td>
                  <td className="px-4 py-2.5 text-center">{p.total}</td>
                  <td className="px-4 py-2.5 text-right price-text text-xs">₹{p.stockValue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'gst' && (
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          {(() => {
            const gstInvoices = invoices.filter(i => i.is_gst_bill);
            const totalCGST = gstInvoices.reduce((s, i) => s + Number(i.cgst), 0);
            const totalSGST = gstInvoices.reduce((s, i) => s + Number(i.sgst), 0);
            const totalTaxable = gstInvoices.reduce((s, i) => s + (Number(i.grand_total) - Number(i.cgst) - Number(i.sgst)), 0);
            const b2bCount = gstInvoices.filter(i => i.customer_gst).length;
            const b2cCount = gstInvoices.length - b2bCount;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Taxable Value</p><p className="font-display text-xl font-extrabold">₹{totalTaxable.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Total Tax</p><p className="font-display text-xl font-extrabold text-primary">₹{(totalCGST + totalSGST).toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">B2B Invoices</p><p className="font-display text-xl font-extrabold">{b2bCount}</p></div>
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">B2C Invoices</p><p className="font-display text-xl font-extrabold">{b2cCount}</p></div>
                </div>
                <div className="space-y-2 text-sm p-4 rounded-lg bg-secondary/30">
                  <div className="flex justify-between"><span className="text-muted-foreground">CGST Collected</span><span className="price-text">₹{totalCGST.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SGST Collected</span><span className="price-text">₹{totalSGST.toLocaleString('en-IN')}</span></div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'profit' && (
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          {(() => {
            const totalRevenue = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
            const totalCost = stockData.reduce((s, p) => s + (p.sold * Number(p.purchase_price)), 0);
            const profit = totalRevenue - totalCost;
            return (
              <div className="grid grid-cols-3 gap-4">
                <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Total Revenue</p><p className="font-display text-xl font-extrabold text-success">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
                <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Est. Cost</p><p className="font-display text-xl font-extrabold text-destructive">₹{totalCost.toLocaleString('en-IN')}</p></div>
                <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Est. Profit</p><p className={`font-display text-xl font-extrabold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>₹{profit.toLocaleString('en-IN')}</p></div>
              </div>
            );
          })()}
        </div>
      )}

      {selectedInvoice && <InvoicePreview invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
    </div>
  );
};
