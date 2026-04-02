import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import {
  TrendingUp, Package, FileText, Calendar, DollarSign, Eye, Printer,
  IndianRupee, ShoppingBag, Download, Trash2, CheckSquare, Filter, X,
  ChevronDown, ChevronUp, Search, FileDown, Edit2, BarChart3
} from 'lucide-react';
import { BrandAnalytics } from './BrandAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { InvoicePreview, InvoicePrintBody, getSelectedTemplate } from './InvoicePreview';
import { usePrint, triggerPrint } from '@/components/PrintPortal';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import type { InvoiceData } from './POSBilling';

type Invoice = Database['public']['Tables']['invoices']['Row'];

interface ReportsPageProps {
  onEditInvoice?: (invoice: InvoiceData) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onEditInvoice }) => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const { printContent, clearContent } = usePrint();
  const [tab, setTab] = useState<'daily' | 'monthly' | 'stock' | 'gst' | 'profit' | 'brands' | 'generate'>('daily');
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
  const [rptDateFrom, setRptDateFrom] = useState('');
  const [rptDateTo, setRptDateTo] = useState('');
  const [rptBrand, setRptBrand] = useState('all');
  const [rptType, setRptType] = useState<'sales' | 'stock' | 'gst' | 'profit' | 'brand'>('sales');
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
        setStockData(products.map(p => {
          const productImeis = imeis.filter(r => r.product_id === p.id);
          const soldImeis = productImeis.filter(r => r.status === 'sold');
          return {
            ...p,
            inStock: productImeis.filter(r => r.status === 'in_stock').length,
            sold: soldImeis.length,
            returned: productImeis.filter(r => r.status === 'returned').length,
            total: productImeis.length,
            stockValue: productImeis.filter(r => r.status === 'in_stock').reduce((s, r) => s + Number(r.purchase_price), 0),
            soldCost: soldImeis.reduce((s, r) => s + Number(r.purchase_price), 0),
            soldRevenue: soldImeis.reduce((s, r) => s + Number(r.sale_price), 0),
          };
        }));
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

  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const todaySales = invoices.filter(i => new Date(i.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === todayIST);
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
    { key: 'brands', label: 'Brands', icon: BarChart3 },
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
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(inv.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
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
                        {onEditInvoice && (
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={async () => {
                            const data = await buildInvoiceData(inv);
                            if (data) onEditInvoice(data);
                          }} title="Edit Invoice">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
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

      {tab === 'profit' && (() => {
        const totalDiscount = invoices.reduce((s, i) => s + Number(i.total_discount), 0);
        const totalRevenue = invoices.reduce((s, i) => s + Number(i.grand_total) + Number(i.total_discount), 0);
        const totalGST = invoices.reduce((s, i) => s + Number(i.cgst) + Number(i.sgst), 0);
        const netRevenue = totalRevenue - totalGST - totalDiscount;
        const totalCost = stockData.reduce((s, p) => s + (p.soldCost || 0), 0);
        const netProfit = netRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

        // Per-invoice profit data
        const invoiceProfitData = invoices.map(inv => {
          const revenue = Number(inv.grand_total);
          const gst = Number(inv.cgst) + Number(inv.sgst);
          const discount = Number(inv.total_discount);
          // Estimate cost from sold items matching this invoice
          const estCost = stockData.reduce((s: number, p: any) => {
            // rough per-invoice cost estimate based on proportion
            return s;
          }, 0);
          return { ...inv, revenue, gst, discount, net: revenue - gst - discount };
        });

        // Brand-wise profit breakdown
        const brandProfitMap: Record<string, { revenue: number; cost: number; sold: number; profit: number }> = {};
        stockData.forEach((p: any) => {
          if (!brandProfitMap[p.brand]) brandProfitMap[p.brand] = { revenue: 0, cost: 0, sold: 0, profit: 0 };
          const cost = p.soldCost || 0;
          const revenue = p.soldRevenue || 0;
          brandProfitMap[p.brand].revenue += revenue;
          brandProfitMap[p.brand].cost += cost;
          brandProfitMap[p.brand].sold += p.sold;
          brandProfitMap[p.brand].profit += revenue - cost;
        });
        const brandProfitArr = Object.entries(brandProfitMap)
          .map(([brand, d]) => ({ brand, ...d }))
          .filter(b => b.sold > 0)
          .sort((a, b) => b.profit - a.profit);

        return (
          <div className="space-y-6">
            {/* Step-by-step Calculation Flow */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h3 className="font-display font-bold text-base mb-4">Profit & Loss Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Left: Revenue breakdown */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Revenue</div>
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Gross Revenue (Selling Price)</p>
                    <p className="font-display text-2xl font-extrabold">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                    <span className="w-3 h-0.5 bg-muted-foreground/40" /> minus
                  </div>
                  <div className="stat-card border-warning/30">
                    <p className="text-xs text-muted-foreground mb-1">GST Liability (Govt.)</p>
                    <p className="font-display text-lg font-bold text-warning">− ₹{totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-muted-foreground">CGST: ₹{invoices.reduce((s, i) => s + Number(i.cgst), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} + SGST: ₹{invoices.reduce((s, i) => s + Number(i.sgst), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="stat-card bg-accent/30 border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Net Revenue (Yours)</p>
                    <p className="font-display text-xl font-extrabold text-primary">₹{netRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Middle: Deductions */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deductions</div>
                  <div className="stat-card border-destructive/30">
                    <p className="text-xs text-muted-foreground mb-1">Cost of Goods Sold</p>
                    <p className="font-display text-lg font-bold text-destructive">− ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-muted-foreground">{stockData.reduce((s: number, p: any) => s + p.sold, 0)} units sold across {stockData.filter((p: any) => p.sold > 0).length} products</p>
                  </div>
                  <div className="stat-card border-orange-300/50">
                    <p className="text-xs text-muted-foreground mb-1">Discounts Given</p>
                    <p className="font-display text-lg font-bold text-orange-500">− ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-muted-foreground">Item discounts + bill-level discounts</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    <strong>Total Deductions:</strong> ₹{(totalGST + totalCost + totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Right: Final Profit */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bottom Line</div>
                  <div className={`stat-card border-2 ${netProfit >= 0 ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}`}>
                    <p className="text-xs text-muted-foreground mb-1">Net Profit / Loss</p>
                    <p className={`font-display text-3xl font-black ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {netProfit >= 0 ? '' : '−'} ₹{Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${netProfit >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                        {profitMargin.toFixed(1)}% margin
                      </span>
                      <span className="text-[10px] text-muted-foreground">of gross revenue</span>
                    </div>
                  </div>

                  {/* Visual formula */}
                  <div className="p-3 rounded-lg bg-secondary/40 text-[11px] space-y-1.5">
                    <div className="font-bold text-foreground mb-1">Calculation:</div>
                    <div className="flex justify-between"><span>Gross Revenue</span><span className="font-mono">₹{totalRevenue.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-warning"><span>− GST</span><span className="font-mono">₹{totalGST.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-destructive"><span>− Cost of Goods</span><span className="font-mono">₹{totalCost.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-orange-500"><span>− Discounts</span><span className="font-mono">₹{totalDiscount.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between font-bold border-t border-foreground/20 pt-1.5 mt-1">
                      <span>= Net Profit</span>
                      <span className={`font-mono ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>₹{netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Brand-wise Profit Table */}
            {brandProfitArr.length > 0 && (
              <div className="bg-card rounded-xl border p-6 shadow-sm">
                <h3 className="font-display font-bold text-base mb-4">Brand-wise Profit Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground uppercase">
                        <th className="text-left py-2 px-3">Brand</th>
                        <th className="text-center py-2 px-3">Units Sold</th>
                        <th className="text-right py-2 px-3">Revenue (MRP)</th>
                        <th className="text-right py-2 px-3">Cost</th>
                        <th className="text-right py-2 px-3">Gross Profit</th>
                        <th className="text-right py-2 px-3">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandProfitArr.map(b => (
                        <tr key={b.brand} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold">{b.brand}</td>
                          <td className="py-2.5 px-3 text-center">{b.sold}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{b.revenue.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-destructive">₹{b.cost.toLocaleString('en-IN')}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${b.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ₹{b.profit.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${b.revenue > 0 && b.profit >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {b.revenue > 0 ? ((b.profit / b.revenue) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-2.5 px-3">Total</td>
                        <td className="py-2.5 px-3 text-center">{brandProfitArr.reduce((s, b) => s + b.sold, 0)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{brandProfitArr.reduce((s, b) => s + b.revenue, 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-destructive">₹{brandProfitArr.reduce((s, b) => s + b.cost, 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-success">₹{brandProfitArr.reduce((s, b) => s + b.profit, 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {tab === 'generate' && (() => {

        const allBrands = [...new Set(stockData.map((p: any) => p.brand))].sort();

        const filterByDate = (list: Invoice[]) => {
          return list.filter(inv => {
            if (rptDateFrom && inv.date < rptDateFrom) return false;
            if (rptDateTo && inv.date > rptDateTo + 'T23:59:59') return false;
            return true;
          });
        };

        const generateSalesReport = async () => {
          const filtered = filterByDate(invoices);
          if (filtered.length === 0) { toast.error('No data for selected range'); return; }
          // Fetch invoice items with product details for all filtered invoices
          const invoiceIds = filtered.map(i => i.id);
          const { data: allItems } = await supabase
            .from('invoice_items')
            .select('*, products(*)')
            .in('invoice_id', invoiceIds);
          const itemsByInvoice: Record<string, any[]> = {};
          (allItems || []).forEach((item: any) => {
            if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
            itemsByInvoice[item.invoice_id].push(item);
          });
          const rows: any[] = [];
          filtered.forEach(inv => {
            const items = itemsByInvoice[inv.id] || [];
            const pd = inv.payment_details as any;
            const paymentBreakdown = inv.payment_method === 'mixed' && pd
              ? Object.entries(pd).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${k}: ₹${Number(v).toLocaleString('en-IN')}`).join(', ')
              : inv.payment_method.toUpperCase();
            items.forEach((item: any) => {
              rows.push({
                Invoice: inv.invoice_number,
                Date: new Date(inv.date).toLocaleString('en-IN'),
                Customer: inv.customer_name,
                Phone: inv.customer_phone,
                Address: inv.customer_address || '',
                GSTIN: inv.customer_gst || '',
                Product: item.products ? `${item.products.brand} ${item.products.model} ${item.products.variant || ''} ${item.products.color || ''}`.trim() : '',
                IMEI: item.imei || '',
                Qty: item.quantity,
                Unit_Price: item.unit_price,
                Discount: item.discount,
                Item_Total: item.total,
                Payment: paymentBreakdown,
                EMI_Partner: inv.emi_lending_partner || '',
                GST_Bill: inv.is_gst_bill ? 'Yes' : 'No',
                Bill_Discount: Number(inv.total_discount),
                CGST: inv.cgst,
                SGST: inv.sgst,
                Grand_Total: inv.grand_total,
              });
            });
            if (items.length === 0) {
              rows.push({
                Invoice: inv.invoice_number,
                Date: new Date(inv.date).toLocaleString('en-IN'),
                Customer: inv.customer_name,
                Phone: inv.customer_phone,
                Address: inv.customer_address || '',
                GSTIN: inv.customer_gst || '',
                Product: '', IMEI: '', Qty: '', Unit_Price: '', Discount: '', Item_Total: '',
                Payment: paymentBreakdown,
                EMI_Partner: inv.emi_lending_partner || '',
                GST_Bill: inv.is_gst_bill ? 'Yes' : 'No',
                Bill_Discount: Number(inv.total_discount),
                CGST: inv.cgst,
                SGST: inv.sgst,
                Grand_Total: inv.grand_total,
              });
            }
          });
          downloadCSV(rows, `sales_report_${rptDateFrom || 'all'}_to_${rptDateTo || 'all'}.csv`);
          toast.success(`Sales report downloaded (${filtered.length} invoices, ${rows.length} rows)`);
        };

        const generateDailyReport = () => {
          const filtered = filterByDate(invoices);
          if (filtered.length === 0) { toast.error('No data for selected range'); return; }
          const dailyMap: Record<string, { count: number; total: number; cash: number; upi: number; card: number; emi: number; mixed: number }> = {};
          filtered.forEach(inv => {
            const day = inv.date.slice(0, 10);
            if (!dailyMap[day]) dailyMap[day] = { count: 0, total: 0, cash: 0, upi: 0, card: 0, emi: 0, mixed: 0 };
            dailyMap[day].count++;
            dailyMap[day].total += Number(inv.grand_total);
            const pm = inv.payment_method as keyof typeof dailyMap[string];
            if (pm in dailyMap[day]) (dailyMap[day] as any)[pm] += Number(inv.grand_total);
          });
          const data = Object.entries(dailyMap).sort(([a], [b]) => b.localeCompare(a)).map(([date, d]) => ({
            Date: new Date(date).toLocaleDateString('en-IN'),
            Invoices: d.count,
            Cash: d.cash,
            UPI: d.upi,
            Card: d.card,
            EMI: d.emi,
            Mixed: d.mixed,
            Total: d.total,
          }));
          downloadCSV(data, `daily_report_${rptDateFrom || 'all'}_to_${rptDateTo || 'all'}.csv`);
          toast.success(`Daily report downloaded (${data.length} days)`);
        };

        const generateBrandReport = () => {
          const filtered = filterByDate(invoices);
          // Need to fetch invoice items for brand mapping - use stockData instead
          const brandData = stockData
            .filter((p: any) => rptBrand === 'all' || p.brand === rptBrand)
            .map((p: any) => ({
              Brand: p.brand,
              Model: p.model,
              Variant: p.variant,
              Color: p.color,
              Purchase_Price: p.purchase_price,
              Sale_Price: p.sale_price,
              Purchased: p.total,
              In_Stock: p.inStock,
              Sold: p.sold,
              Returned: p.returned,
              Stock_Value: p.stockValue,
            }));
          if (brandData.length === 0) { toast.error('No data for selected brand'); return; }
          downloadCSV(brandData, `brand_report_${rptBrand === 'all' ? 'all_brands' : rptBrand}.csv`);
          toast.success(`Brand report downloaded (${brandData.length} products)`);
        };

        const generateGSTReport = () => {
          const filtered = filterByDate(invoices).filter(i => i.is_gst_bill);
          if (filtered.length === 0) { toast.error('No GST invoices in range'); return; }
          const data = filtered.map(inv => ({
            Invoice: inv.invoice_number,
            Date: new Date(inv.date).toLocaleString('en-IN'),
            Customer: inv.customer_name,
            Customer_GST: inv.customer_gst || '',
            Type: inv.customer_gst ? 'B2B' : 'B2C',
            Taxable: Number(inv.grand_total) - Number(inv.cgst) - Number(inv.sgst),
            CGST: inv.cgst,
            SGST: inv.sgst,
            Total_Tax: Number(inv.cgst) + Number(inv.sgst),
            Grand_Total: inv.grand_total,
          }));
          downloadCSV(data, `gst_report_${rptDateFrom || 'all'}_to_${rptDateTo || 'all'}.csv`);
          toast.success(`GST report downloaded (${data.length} invoices)`);
        };

        const generateProfitReport = () => {
          const filtered = filterByDate(invoices);
          if (filtered.length === 0) { toast.error('No data for selected range'); return; }
          const totalDiscounts = filtered.reduce((s, i) => s + Number(i.total_discount), 0);
          const totalRevenue = filtered.reduce((s, i) => s + Number(i.grand_total) + Number(i.total_discount), 0);
          const totalGST = filtered.reduce((s, i) => s + Number(i.cgst) + Number(i.sgst), 0);
          const netRevenue = totalRevenue - totalGST - totalDiscounts;
          const totalCost = stockData.reduce((s: number, p: any) => s + (p.soldCost || 0), 0);
          const data = [{
            Period: `${rptDateFrom || 'Start'} to ${rptDateTo || 'Today'}`,
            Total_Invoices: filtered.length,
            Gross_Revenue: totalRevenue,
            GST_Collected: totalGST,
            Net_Revenue: netRevenue,
            Total_Discounts: totalDiscounts,
            Estimated_Cost: totalCost,
            Estimated_Profit: netRevenue - totalCost,
          }];
          downloadCSV(data, `profit_report_${rptDateFrom || 'all'}_to_${rptDateTo || 'all'}.csv`);
          toast.success('Profit report downloaded');
        };

        const handleGenerate = () => {
          switch (rptType) {
            case 'sales': return generateSalesReport();
            case 'stock': return generateDailyReport();
            case 'gst': return generateGSTReport();
            case 'profit': return generateProfitReport();
            case 'brand': return generateBrandReport();
          }
        };

        return (
          <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
            <div>
              <h2 className="font-display text-lg font-extrabold mb-1">Generate Reports</h2>
              <p className="text-sm text-muted-foreground">Select report type, apply filters, and download as CSV</p>
            </div>

            {/* Report Type */}
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-2 block">Report Type</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {([
                  { key: 'sales', label: 'Sales Report', icon: TrendingUp, desc: 'All invoices with details' },
                  { key: 'stock', label: 'Daily Summary', icon: Calendar, desc: 'Day-wise totals by payment' },
                  { key: 'brand', label: 'Brand / Stock', icon: Package, desc: 'Product-wise stock & sales' },
                  { key: 'gst', label: 'GST Report', icon: FileText, desc: 'Tax breakdowns for filing' },
                  { key: 'profit', label: 'Profit Report', icon: DollarSign, desc: 'Revenue vs cost summary' },
                ] as const).map(r => (
                  <button
                    key={r.key}
                    onClick={() => setRptType(r.key)}
                    className={`p-3 rounded-lg border text-left transition-all ${rptType === r.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40'}`}
                  >
                    <r.icon className={`w-4 h-4 mb-1.5 ${rptType === r.key ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-display font-semibold text-xs">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">From Date</label>
                <Input type="date" value={rptDateFrom} onChange={e => setRptDateFrom(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">To Date</label>
                <Input type="date" value={rptDateTo} onChange={e => setRptDateTo(e.target.value)} className="h-9" />
              </div>
              {rptType === 'brand' && (
                <div>
                  <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Brand</label>
                  <select
                    value={rptBrand}
                    onChange={e => setRptBrand(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All Brands</option>
                    {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Quick date presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-display font-medium">Quick:</span>
              {[
                { label: 'Today', fn: () => { const d = new Date().toISOString().slice(0, 10); setRptDateFrom(d); setRptDateTo(d); } },
                { label: 'Yesterday', fn: () => { const d = new Date(Date.now() - 86400000).toISOString().slice(0, 10); setRptDateFrom(d); setRptDateTo(d); } },
                { label: 'This Week', fn: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); setRptDateFrom(start.toISOString().slice(0, 10)); setRptDateTo(now.toISOString().slice(0, 10)); } },
                { label: 'This Month', fn: () => { const now = new Date(); setRptDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setRptDateTo(now.toISOString().slice(0, 10)); } },
                { label: 'Last Month', fn: () => { const now = new Date(); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const le = new Date(now.getFullYear(), now.getMonth(), 0); setRptDateFrom(lm.toISOString().slice(0, 10)); setRptDateTo(le.toISOString().slice(0, 10)); } },
                { label: 'All Time', fn: () => { setRptDateFrom(''); setRptDateTo(''); } },
              ].map(p => (
                <Button key={p.label} variant="outline" size="sm" className="h-7 text-xs" onClick={p.fn}>{p.label}</Button>
              ))}
            </div>

            {/* Generate buttons */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Button onClick={handleGenerate} className="gap-2">
                <Download className="w-4 h-4" /> Download CSV
              </Button>
              <Button variant="outline" onClick={async () => {
                // Generate PDF via print
                const filterByDateLocal = (list: Invoice[]) => {
                  return list.filter(inv => {
                    if (rptDateFrom && inv.date < rptDateFrom) return false;
                    if (rptDateTo && inv.date > rptDateTo + 'T23:59:59') return false;
                    return true;
                  });
                };
                const filtered = filterByDateLocal(invoices);
                if (filtered.length === 0 && rptType !== 'brand') { toast.error('No data for selected range'); return; }

                const title = {
                  sales: 'Sales Report',
                  stock: 'Daily Summary Report',
                  brand: `Brand Report${rptBrand !== 'all' ? ` - ${rptBrand}` : ''}`,
                  gst: 'GST Report',
                  profit: 'Profit Report',
                }[rptType];
                const period = rptDateFrom || rptDateTo
                  ? `${rptDateFrom || 'Start'} to ${rptDateTo || 'Today'}`
                  : 'All Time';

                let headerRow = '';
                let bodyRows = '';
                if (rptType === 'sales') {
                  // Fetch invoice items with product details
                  const invoiceIds = filtered.map(i => i.id);
                  const { data: allItems } = await supabase
                    .from('invoice_items')
                    .select('*, products(*)')
                    .in('invoice_id', invoiceIds);
                  const itemsByInvoice: Record<string, any[]> = {};
                  (allItems || []).forEach((item: any) => {
                    if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
                    itemsByInvoice[item.invoice_id].push(item);
                  });

                  filtered.forEach(inv => {
                    const items = itemsByInvoice[inv.id] || [];
                    const pd = inv.payment_details as any;
                    const paymentBreakdown = inv.payment_method === 'mixed' && pd
                      ? Object.entries(pd).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${String(k).charAt(0).toUpperCase() + String(k).slice(1)}: ₹${Number(v).toLocaleString('en-IN')}`).join(' | ')
                      : inv.payment_method.toUpperCase();
                    
                    // Invoice header row
                    bodyRows += `<tr style="background:#f8f9fa;border-top:2px solid #333;page-break-inside:avoid">
                      <td colspan="6" style="padding:8px;font-size:11px">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                          <div>
                            <strong style="font-size:12px">${inv.invoice_number}</strong>
                            <span style="margin-left:12px;color:#666">${new Date(inv.date).toLocaleString('en-IN', {dateStyle:'medium',timeStyle:'short'})}</span>
                            ${inv.is_gst_bill ? '<span style="margin-left:8px;background:#e8f5e9;color:#2e7d32;padding:1px 6px;border-radius:3px;font-size:9px">GST</span>' : '<span style="margin-left:8px;background:#fff3e0;color:#e65100;padding:1px 6px;border-radius:3px;font-size:9px">Non-GST</span>'}
                          </div>
                          <strong style="font-size:13px">₹${Number(inv.grand_total).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style="margin-top:4px;font-size:10px;color:#555">
                          <strong>Customer:</strong> ${inv.customer_name}${inv.customer_phone ? ' | Ph: ' + inv.customer_phone : ''}${inv.customer_address ? ' | ' + inv.customer_address : ''}${inv.customer_gst ? ' | GSTIN: ' + inv.customer_gst : ''}
                        </div>
                        <div style="margin-top:2px;font-size:10px;color:#555">
                          <strong>Payment:</strong> ${paymentBreakdown}${inv.emi_lending_partner ? ' | EMI Partner: ' + inv.emi_lending_partner : ''}
                          ${Number(inv.total_discount) > 0 ? ' | <strong>Discount:</strong> ₹' + Number(inv.total_discount).toLocaleString('en-IN') : ''}
                          ${inv.is_gst_bill ? ' | CGST: ₹' + Number(inv.cgst).toLocaleString('en-IN') + ' + SGST: ₹' + Number(inv.sgst).toLocaleString('en-IN') : ''}
                        </div>
                      </td>
                    </tr>`;
                    // Item rows
                    items.forEach((item: any) => {
                      const productName = item.products ? `${item.products.brand} ${item.products.model} ${item.products.variant || ''} ${item.products.color || ''}`.trim() : 'Unknown';
                      bodyRows += `<tr style="border-bottom:1px solid #eee;page-break-inside:avoid">
                        <td style="padding:4px 8px 4px 20px;font-size:10px" colspan="2">${productName}</td>
                        <td style="padding:4px 8px;font-size:10px;color:#666">${item.imei || '—'}</td>
                        <td style="padding:4px 8px;font-size:10px;text-align:center">${item.quantity}</td>
                        <td style="padding:4px 8px;font-size:10px;text-align:right">₹${Number(item.unit_price).toLocaleString('en-IN')}</td>
                        <td style="padding:4px 8px;font-size:10px;text-align:right;font-weight:600">₹${Number(item.total).toLocaleString('en-IN')}</td>
                      </tr>`;
                    });
                  });
                  headerRow = `<tr style="background:#e2e8f0;font-weight:700;font-size:9px;text-transform:uppercase">
                    <th style="padding:6px 8px;text-align:left" colspan="2">Product</th>
                    <th style="padding:6px 8px;text-align:left">IMEI</th>
                    <th style="padding:6px 8px;text-align:center">Qty</th>
                    <th style="padding:6px 8px;text-align:right">Price</th>
                    <th style="padding:6px 8px;text-align:right">Total</th>
                  </tr>`;
                  const total = filtered.reduce((s, i) => s + Number(i.grand_total), 0);
                  bodyRows += `<tr style="border-top:2px solid #222;font-weight:900"><td colspan="5" style="padding:8px;text-align:right;font-size:12px">Grand Total</td><td style="padding:8px;text-align:right;font-size:13px">₹${total.toLocaleString('en-IN')}</td></tr>`;
                } else if (rptType === 'brand') {
                  const brandData = stockData.filter((p: any) => rptBrand === 'all' || p.brand === rptBrand);
                  headerRow = `<tr style="background:#f3f4f6;font-weight:700;font-size:10px;text-transform:uppercase"><th style="padding:6px 8px;text-align:left">Brand</th><th style="padding:6px 8px;text-align:left">Model</th><th style="padding:6px 8px;text-align:center">Purchased</th><th style="padding:6px 8px;text-align:center">In Stock</th><th style="padding:6px 8px;text-align:center">Sold</th><th style="padding:6px 8px;text-align:right">Stock Value</th></tr>`;
                  brandData.forEach((p: any) => {
                    bodyRows += `<tr style="border-bottom:1px solid #e5e7eb;page-break-inside:avoid"><td style="padding:5px 8px;font-size:11px">${p.brand}</td><td style="padding:5px 8px;font-size:11px">${p.model} ${p.variant}</td><td style="padding:5px 8px;font-size:11px;text-align:center">${p.total}</td><td style="padding:5px 8px;font-size:11px;text-align:center">${p.inStock}</td><td style="padding:5px 8px;font-size:11px;text-align:center">${p.sold}</td><td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:700">₹${p.stockValue.toLocaleString('en-IN')}</td></tr>`;
                  });
                } else if (rptType === 'gst') {
                  const gstFiltered = filtered.filter(i => i.is_gst_bill);
                  headerRow = `<tr style="background:#f3f4f6;font-weight:700;font-size:10px;text-transform:uppercase"><th style="padding:6px 8px;text-align:left">Invoice</th><th style="padding:6px 8px;text-align:left">Customer</th><th style="padding:6px 8px">Type</th><th style="padding:6px 8px;text-align:right">Taxable</th><th style="padding:6px 8px;text-align:right">CGST</th><th style="padding:6px 8px;text-align:right">SGST</th><th style="padding:6px 8px;text-align:right">Total</th></tr>`;
                  gstFiltered.forEach(inv => {
                    const taxable = Number(inv.grand_total) - Number(inv.cgst) - Number(inv.sgst);
                    bodyRows += `<tr style="border-bottom:1px solid #e5e7eb;page-break-inside:avoid"><td style="padding:5px 8px;font-size:11px">${inv.invoice_number}</td><td style="padding:5px 8px;font-size:11px">${inv.customer_name}</td><td style="padding:5px 8px;font-size:11px;text-align:center">${inv.customer_gst ? 'B2B' : 'B2C'}</td><td style="padding:5px 8px;font-size:11px;text-align:right">₹${taxable.toLocaleString('en-IN')}</td><td style="padding:5px 8px;font-size:11px;text-align:right">₹${Number(inv.cgst).toLocaleString('en-IN')}</td><td style="padding:5px 8px;font-size:11px;text-align:right">₹${Number(inv.sgst).toLocaleString('en-IN')}</td><td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:700">₹${Number(inv.grand_total).toLocaleString('en-IN')}</td></tr>`;
                  });
                } else {
                  const dailyMap: Record<string, {count:number;total:number}> = {};
                  filtered.forEach(inv => {
                    const day = inv.date.slice(0, 10);
                    if (!dailyMap[day]) dailyMap[day] = {count:0,total:0};
                    dailyMap[day].count++;
                    dailyMap[day].total += Number(inv.grand_total);
                  });
                  headerRow = `<tr style="background:#f3f4f6;font-weight:700;font-size:10px;text-transform:uppercase"><th style="padding:6px 8px;text-align:left">Date</th><th style="padding:6px 8px;text-align:center">Invoices</th><th style="padding:6px 8px;text-align:right">Total</th></tr>`;
                  Object.entries(dailyMap).sort(([a],[b]) => b.localeCompare(a)).forEach(([date, d]) => {
                    bodyRows += `<tr style="border-bottom:1px solid #e5e7eb;page-break-inside:avoid"><td style="padding:5px 8px;font-size:11px">${new Date(date).toLocaleDateString('en-IN')}</td><td style="padding:5px 8px;font-size:11px;text-align:center">${d.count}</td><td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:700">₹${d.total.toLocaleString('en-IN')}</td></tr>`;
                  });
                }

                const html = `<div style="font-family:Inter,Arial,sans-serif;padding:0;width:100%">
                  <div style="text-align:center;margin-bottom:16px;border-bottom:2px solid #222;padding-bottom:10px">
                    <div style="font-size:20px;font-weight:900">${title}</div>
                    <div style="font-size:10px;color:#666;margin-top:4px">Period: ${period} · Generated: ${new Date().toLocaleString('en-IN')}</div>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:10px">
                    <thead>${headerRow}</thead>
                    <tbody>${bodyRows}</tbody>
                  </table>
                </div>`;

                printContent(<div dangerouslySetInnerHTML={{ __html: html }} />);
                setTimeout(async () => {
                  await triggerPrint();
                  clearContent();
                }, 200);
                
              }} className="gap-2">
                <FileDown className="w-4 h-4" /> Download PDF
              </Button>
              <span className="text-xs text-muted-foreground">
                {rptDateFrom || rptDateTo
                  ? `${rptDateFrom || '...'} → ${rptDateTo || '...'}`
                  : 'All time data'}
                {rptType === 'brand' && rptBrand !== 'all' && ` • ${rptBrand}`}
              </span>
            </div>
          </div>
        );
      })()}

      {tab === 'brands' && <BrandAnalytics />}

      {selectedInvoice && <InvoicePreview invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
    </div>
  );
};
