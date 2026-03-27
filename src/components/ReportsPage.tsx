import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import {
  TrendingUp, Package, FileText, Calendar, DollarSign, Eye, Printer,
  IndianRupee, ShoppingBag, Download, Trash2, CheckSquare, Filter, X,
  ChevronDown, ChevronUp, Search, FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { InvoicePreview, InvoicePrintBody, getSelectedTemplate } from './InvoicePreview';
import { usePrint, triggerPrint } from '@/components/PrintPortal';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import type { InvoiceData } from './POSBilling';

type Invoice = Database['public']['Tables']['invoices']['Row'];

export const ReportsPage: React.FC = () => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const { printContent, clearContent } = usePrint();
  const [tab, setTab] = useState<'daily' | 'monthly' | 'stock' | 'gst' | 'profit'>('daily');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkPrinting, setBulkPrinting] = useState(false);

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
          returned: imeis.filter(r => r.product_id === p.id && r.status === 'returned').length,
          total: imeis.filter(r => r.product_id === p.id).length,
          stockValue: imeis.filter(r => r.product_id === p.id && r.status === 'in_stock').reduce((s, r) => s + Number(r.purchase_price), 0),
        })));
      }
    };
    fetchData();
  }, [activeShopId]);

  const filteredInvoices = invoices.filter(inv => {
    if (dateFrom && inv.date < dateFrom) return false;
    if (dateTo && inv.date > dateTo + 'T23:59:59') return false;
    if (paymentFilter !== 'all' && inv.payment_method !== paymentFilter) return false;
    if (modeFilter === 'gst' && !inv.is_gst_bill) return false;
    if (modeFilter === 'non-gst' && inv.is_gst_bill) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchInvoice = inv.invoice_number?.toLowerCase().includes(q);
      const matchCustomer = inv.customer_name?.toLowerCase().includes(q);
      const matchPhone = inv.customer_phone?.toLowerCase().includes(q);
      if (!matchInvoice && !matchCustomer && !matchPhone) return false;
    }
    return true;
  });

  const buildInvoiceData = async (invoice: Invoice): Promise<InvoiceData | null> => {
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
      billing_sub_heading: (invoice as any).billing_sub_heading || undefined,
      billing_logo_url: (invoice as any).billing_logo_url || undefined,
      warranty_mobile: (invoice as any).warranty_mobile || undefined,
      warranty_accessories: (invoice as any).warranty_accessories || undefined,
      emi_lending_partner: (invoice as any).emi_lending_partner || undefined,
      customer_address: (invoice as any).customer_address || undefined,
    };
    (preview as any).payment_details = invoice.payment_details;
    return preview;
  };

  const openInvoice = async (invoice: Invoice) => {
    const preview = await buildInvoiceData(invoice);
    if (!preview) return;
    setSelectedInvoice(preview);
  };

  // Bulk PDF: render ALL selected invoices in one print with page breaks
  const handleBulkPrint = async () => {
    const toProcess = filteredInvoices.filter(i => selectedIds.has(i.id));
    if (toProcess.length === 0) { toast.error('Select invoices first'); return; }
    setBulkPrinting(true);
    toast.info(`Preparing ${toProcess.length} invoice(s) for download…`);

    const shop = activeShopId ? (await supabase.from('shops').select('*').eq('id', activeShopId).single()).data : null;
    if (!shop) { setBulkPrinting(false); toast.error('Shop not found'); return; }

    const allPreviews: InvoiceData[] = [];
    for (const inv of toProcess) {
      const preview = await buildInvoiceData(inv);
      if (preview) allPreviews.push(preview);
    }

    if (allPreviews.length === 0) { setBulkPrinting(false); toast.error('No invoices to print'); return; }

    const template = getSelectedTemplate();
    // Render all invoices in a single print area with page breaks between them
    printContent(
      <div>
        {allPreviews.map((preview, idx) => (
          <div key={preview.id} style={{ pageBreakAfter: idx < allPreviews.length - 1 ? 'always' : 'auto' }}>
            <InvoicePrintBody invoice={preview} shop={shop} template={template} />
          </div>
        ))}
      </div>
    );

    await new Promise(r => setTimeout(r, 300));
    await triggerPrint();
    clearContent();
    setBulkPrinting(false);
    setSelectedIds(new Set());
    toast.success(`PDF ready with ${allPreviews.length} invoice(s)`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} invoice(s)? This cannot be undone.`)) return;
    for (const id of selectedIds) {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      await supabase.from('invoices').delete().eq('id', id);
    }
    toast.success(`Deleted ${selectedIds.size} invoices`);
    setSelectedIds(new Set());
    setInvoices(prev => prev.filter(i => !selectedIds.has(i.id)));
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadInvoicesCSV = () => {
    const data = (selectedIds.size > 0 ? filteredInvoices.filter(i => selectedIds.has(i.id)) : filteredInvoices).map(inv => ({
      Invoice: inv.invoice_number,
      Date: new Date(inv.date).toLocaleString('en-IN'),
      Customer: inv.customer_name,
      Phone: inv.customer_phone,
      Payment: inv.payment_method,
      GST: inv.is_gst_bill ? 'Yes' : 'No',
      Subtotal: inv.subtotal,
      CGST: inv.cgst,
      SGST: inv.sgst,
      Total: inv.grand_total,
    }));
    downloadCSV(data, `invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Invoices exported');
  };

  const downloadBackup = () => {
    const backup = { exportDate: new Date().toISOString(), invoices: filteredInvoices, stock: stockData };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded');
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
    { key: 'generate', label: 'Generate', icon: FileDown },
  ] as const;

  const PAYMENT_COLORS: Record<string, string> = {
    cash: 'bg-success/10 text-success',
    upi: 'bg-primary/10 text-primary',
    card: 'bg-warning/10 text-warning',
    emi: 'bg-destructive/10 text-destructive',
    mixed: 'bg-accent text-accent-foreground',
  };

  const renderPaymentDetail = (inv: Invoice) => {
    const lendingPartner = (inv as any).emi_lending_partner;
    const hasPaymentDetails = inv.payment_details && Object.values(inv.payment_details as Record<string, number>).some(v => Number(v) > 0);
    const showLending = lendingPartner && (inv.payment_method === 'emi' || inv.payment_method === 'mixed');
    
    if (!hasPaymentDetails && !showLending) return null;
    
    const details = (inv.payment_details || {}) as Record<string, number>;
    return (
      <div className="px-6 py-3 bg-accent/20 border-t text-xs">
        <p className="font-display font-semibold text-foreground mb-1.5">Payment Breakdown:</p>
        <div className="flex flex-wrap gap-2 items-center">
          {Object.entries(details).map(([key, val]) =>
            Number(val) > 0 ? (
              <span key={key} className="px-2 py-1 rounded-full bg-secondary font-display font-bold capitalize">
                {key}: ₹{Number(val).toLocaleString('en-IN')}
              </span>
            ) : null
          )}
          {showLending && (
            <span className="px-2 py-1 rounded-full bg-warning/10 text-warning font-display font-bold text-[10px]">
              Lending: {lendingPartner}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sales, GST, stock and invoice reprints</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadBackup}>
            <Download className="w-3.5 h-3.5 mr-1" /> Backup
          </Button>
          <Button variant="outline" size="sm" onClick={downloadInvoicesCSV}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
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

      {/* Tabs + actions bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex bg-secondary rounded-lg p-0.5 w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        {tab === 'daily' && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleBulkPrint} disabled={bulkPrinting}>
                  <FileDown className="w-3.5 h-3.5 mr-1" />
                  {bulkPrinting ? 'Preparing…' : `Download PDF (${selectedIds.size})`}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete ({selectedIds.size})
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters
            </Button>
          </div>
        )}
      </div>

      {/* Search bar for Sales tab */}
      {tab === 'daily' && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice number, customer name or phone…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {tab === 'daily' && showFilters && (
        <div className="bg-card rounded-xl border p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">From Date</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">To Date</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Payment</label>
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="all">All</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="emi">EMI</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Mode</label>
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="all">All</option>
              <option value="gst">GST</option>
              <option value="non-gst">Non-GST</option>
            </select>
          </div>
          <div className="col-span-full flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{filteredInvoices.length} results</span>
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setPaymentFilter('all'); setModeFilter('all'); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear Filters
            </Button>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0} onCheckedChange={toggleSelectAll} />
                </th>
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
              {filteredInvoices.slice(0, 200).map(inv => (
                <React.Fragment key={inv.id}>
                  <tr className={`border-t border-border/50 hover:bg-accent/30 transition-colors ${selectedIds.has(inv.id) ? 'bg-accent/40' : ''}`}>
                    <td className="px-3 py-2.5">
                      <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />
                    </td>
                    <td className="px-4 py-2.5 font-display font-semibold text-primary text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(inv.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-display text-sm">{inv.customer_name}</div>
                      {inv.customer_phone && <div className="text-[10px] text-muted-foreground">{inv.customer_phone}</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${inv.is_gst_bill ? (inv.customer_gst ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning') : 'bg-secondary text-secondary-foreground'}`}>
                        {inv.is_gst_bill ? (inv.customer_gst ? 'B2B' : 'B2C') : 'Non-GST'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setExpandedPaymentId(expandedPaymentId === inv.id ? null : inv.id)}
                        className="flex items-center gap-1"
                      >
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold capitalize ${PAYMENT_COLORS[inv.payment_method] || 'bg-secondary text-secondary-foreground'}`}>
                          {inv.payment_method}
                        </span>
                        {inv.payment_method === 'emi' && (inv as any).emi_lending_partner && (
                          <span className="text-[9px] text-muted-foreground font-medium">({(inv as any).emi_lending_partner})</span>
                        )}
                        {inv.payment_details && (
                          expandedPaymentId === inv.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right price-text">₹{Number(inv.grand_total).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openInvoice(inv)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" className="h-8 px-2" onClick={() => openInvoice(inv)}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedPaymentId === inv.id && (inv.payment_details || (inv as any).emi_lending_partner) && (
                    <tr>
                      <td colSpan={8}>{renderPaymentDetail(inv)}</td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredInvoices.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {searchQuery ? `No invoices matching "${searchQuery}"` : 'No invoices found'}
                </td></tr>
              )}
            </tbody>
          </table>
          {filteredInvoices.length > 200 && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t text-center">
              Showing first 200 of {filteredInvoices.length} invoices. Use filters to narrow results.
            </div>
          )}
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
                <th className="px-4 py-3 text-center">Purchased</th>
                <th className="px-4 py-3 text-center">In Stock</th>
                <th className="px-4 py-3 text-center">Sold</th>
                <th className="px-4 py-3 text-center">Returned</th>
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
                  <td className="px-4 py-2.5 text-center text-muted-foreground font-display font-semibold">{p.total}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-display font-bold ${p.inStock > 0 ? 'text-success' : 'text-destructive'}`}>{p.inStock}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-primary font-display font-bold">{p.sold}</td>
                  <td className="px-4 py-2.5 text-center text-warning font-display font-bold">{p.returned}</td>
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
                  <div className="border-t pt-2 flex justify-between font-semibold"><span>Total GST</span><span className="text-primary">₹{(totalCGST + totalSGST).toLocaleString('en-IN')}</span></div>
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
            const totalGST = invoices.reduce((s, i) => s + Number(i.cgst) + Number(i.sgst), 0);
            const totalDiscount = invoices.reduce((s, i) => s + Number(i.total_discount) + Number(i.bill_discount), 0);
            const netRevenue = totalRevenue - totalGST;
            const totalCost = stockData.reduce((s, p) => s + (p.sold * Number(p.purchase_price)), 0);
            const profit = netRevenue - totalCost - totalDiscount;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Gross Revenue</p><p className="font-display text-xl font-extrabold">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">GST Liability</p><p className="font-display text-xl font-extrabold text-warning">₹{totalGST.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Total Discount</p><p className="font-display text-xl font-extrabold text-orange-500">₹{totalDiscount.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Est. Cost</p><p className="font-display text-xl font-extrabold text-destructive">₹{totalCost.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-xs text-muted-foreground mb-1">Est. Profit</p><p className={`font-display text-xl font-extrabold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>₹{profit.toLocaleString('en-IN')}</p></div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
                  Profit = Gross Revenue − GST − Discounts − Est. Cost of Sold Items
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {selectedInvoice && <InvoicePreview invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
    </div>
  );
};
