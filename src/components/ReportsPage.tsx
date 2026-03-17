import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { BarChart3, TrendingUp, Package, FileText, Calendar, DollarSign, Download, IndianRupee, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type Invoice = Database['public']['Tables']['invoices']['Row'];

export const ReportsPage: React.FC = () => {
  const { activeShopId } = useShop();
  const [tab, setTab] = useState<'daily' | 'monthly' | 'stock' | 'gst' | 'profit'>('daily');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!activeShopId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: inv } = await supabase.from('invoices').select('*').eq('shop_id', activeShopId).order('date', { ascending: false });
      if (inv) setInvoices(inv);

      const { data: products } = await supabase.from('products').select('*').eq('shop_id', activeShopId);
      const { data: imeis } = await supabase.from('imei_records').select('*').eq('shop_id', activeShopId);
      if (products && imeis) {
        setStockData(products.map(p => ({
          ...p,
          inStock: imeis.filter(r => r.product_id === p.id && r.status === 'in_stock').length,
          sold: imeis.filter(r => r.product_id === p.id && r.status === 'sold').length,
          total: imeis.filter(r => r.product_id === p.id).length,
          stockValue: imeis.filter(r => r.product_id === p.id && r.status === 'in_stock').reduce((s, r) => s + Number(r.purchase_price), 0),
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [activeShopId]);

  const today = new Date().toDateString();
  const todaySales = invoices.filter(i => new Date(i.date).toDateString() === today);
  const todayTotal = todaySales.reduce((s, i) => s + Number(i.grand_total), 0);
  const totalSales = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
  const totalInStock = stockData.reduce((s, p) => s + p.inStock, 0);
  const totalStockValue = stockData.reduce((s, p) => s + p.stockValue, 0);

  // Monthly grouped
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
          <p className="text-sm text-muted-foreground mt-0.5">Business analytics & insights</p>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Tabs */}
      <div className="flex bg-secondary rounded-lg p-0.5 mb-5 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
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
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 100).map(inv => (
                <tr key={inv.id} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 font-display font-semibold text-primary text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(inv.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-4 py-2.5 font-display text-sm">{inv.customer_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold bg-secondary capitalize">{inv.payment_method}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${inv.is_gst_bill ? 'bg-primary/10 text-primary' : 'bg-secondary'}`}>
                      {inv.is_gst_bill ? 'GST' : 'Non-GST'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right price-text">₹{Number(inv.grand_total).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-display font-medium">No invoices yet</p>
                </td></tr>
              )}
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
                  <td className="px-4 py-2.5">
                    <span className="font-display font-semibold">{p.brand} {p.model}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">{p.variant}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-display font-bold ${p.inStock > 0 ? 'text-success' : 'text-destructive'}`}>{p.inStock}</span>
                  </td>
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
          <h2 className="font-display font-bold text-lg mb-4">GST Summary</h2>
          {(() => {
            const gstInvoices = invoices.filter(i => i.is_gst_bill);
            const totalCGST = gstInvoices.reduce((s, i) => s + Number(i.cgst), 0);
            const totalSGST = gstInvoices.reduce((s, i) => s + Number(i.sgst), 0);
            const totalTaxable = gstInvoices.reduce((s, i) => s + (Number(i.grand_total) - Number(i.cgst) - Number(i.sgst)), 0);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Taxable Value</p>
                    <p className="font-display text-xl font-extrabold">₹{totalTaxable.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Total Tax</p>
                    <p className="font-display text-xl font-extrabold text-primary">₹{(totalCGST + totalSGST).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">GST Invoices</p>
                    <p className="font-display text-xl font-extrabold">{gstInvoices.length}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm p-4 rounded-lg bg-secondary/30">
                  <div className="flex justify-between"><span className="text-muted-foreground">CGST Collected</span><span className="price-text">₹{totalCGST.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SGST Collected</span><span className="price-text">₹{totalSGST.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between font-display font-bold text-base pt-2 border-t border-border">
                    <span>Total Tax</span><span className="text-primary">₹{(totalCGST + totalSGST).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'profit' && (
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="font-display font-bold text-lg mb-4">Profit Estimate</h2>
          <p className="text-sm text-muted-foreground mb-4">Based on purchase price vs sale price of sold items</p>
          {(() => {
            const totalRevenue = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
            const totalCost = stockData.reduce((s, p) => {
              const soldCount = p.sold;
              return s + (soldCount * Number(p.purchase_price));
            }, 0);
            const profit = totalRevenue - totalCost;
            return (
              <div className="grid grid-cols-3 gap-4">
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                  <p className="font-display text-xl font-extrabold text-success">₹{totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground mb-1">Est. Cost</p>
                  <p className="font-display text-xl font-extrabold text-destructive">₹{totalCost.toLocaleString('en-IN')}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground mb-1">Est. Profit</p>
                  <p className={`font-display text-xl font-extrabold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>₹{profit.toLocaleString('en-IN')}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
