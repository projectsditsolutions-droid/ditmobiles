import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Search, Phone, User, MapPin, Hash, Mail, Edit2, Trash2, X,
  ShoppingBag, CalendarDays, FileText, ChevronRight, Users, Printer, Eye, Pencil,
  IndianRupee, AlertCircle, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoicePreview } from './InvoicePreview';
import type { InvoiceData } from './POSBilling';

interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  address: string;
  gstin: string;
  email: string;
  notes: string;
  total_purchases: number;
  last_purchase_date: string | null;
  created_at: string;
  pending_amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  grand_total: number;
  payment_method: string;
  status: string;
  is_gst_bill: boolean;
}

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }> = ({ open, onClose, title, subtitle, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in border overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-destructive/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto pos-scrollable">{children}</div>
      </div>
    </div>
  );
};

interface CustomerManagementProps {
  onEditInvoice?: (invoice: InvoiceData) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ onEditInvoice }) => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [invoiceSearchQ, setInvoiceSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Invoice[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', address: '', gstin: '', email: '', notes: '' });
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [showPendingModal, setShowPendingModal] = useState<'add' | 'pay' | null>(null);
  const [pendingInput, setPendingInput] = useState('');

  const fetchCustomers = async () => {
    if (!activeShopId && !isAllShops) return;
    let query = supabase.from('customers').select('*');
    if (isAllShops) query = query.in('shop_id', allShopIds);
    else query = query.eq('shop_id', activeShopId!);
    const { data } = await query.order('name');
    setCustomers((data as Customer[]) || []);
  };

  useEffect(() => { fetchCustomers(); }, [activeShopId]);

  const selected = customers.find(c => c.id === selectedId) || null;

  useEffect(() => {
    if (!selected) { setCustomerHistory([]); return; }
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, date, grand_total, payment_method, status, is_gst_bill')
        .eq('customer_phone', selected.phone)
        .eq('shop_id', selected.shop_id)
        .order('date', { ascending: false })
        .limit(50);
      setCustomerHistory((data as Invoice[]) || []);
    };
    fetchHistory();
  }, [selected]);

  const filtered = useMemo(() =>
    customers.filter(c =>
      !searchQ || `${c.name} ${c.phone} ${c.address} ${c.gstin}`.toLowerCase().includes(searchQ.toLowerCase())
    ), [customers, searchQ]);

  const filteredHistory = useMemo(() =>
    customerHistory.filter(inv =>
      !invoiceSearchQ || `${inv.invoice_number} ${inv.payment_method} ${inv.status}`.toLowerCase().includes(invoiceSearchQ.toLowerCase())
    ), [customerHistory, invoiceSearchQ]);

  const resetForm = () => {
    setForm({ name: '', phone: '', address: '', gstin: '', email: '', notes: '' });
    setEditingId(null);
  };

  const openEdit = (c: Customer) => {
    setForm({ name: c.name, phone: c.phone, address: c.address, gstin: c.gstin, email: c.email, notes: c.notes });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!activeShopId || !form.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (editingId) {
      const { error } = await supabase.from('customers').update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        gstin: form.gstin.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      } as any).eq('id', editingId);
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Customer updated');
    } else {
      const { error } = await supabase.from('customers').insert({
        shop_id: activeShopId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        gstin: form.gstin.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      } as any);
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Customer added');
    }
    setShowForm(false);
    resetForm();
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    await supabase.from('customers').delete().eq('id', id);
    if (selectedId === id) setSelectedId(null);
    toast.success('Customer deleted');
    fetchCustomers();
  };

  const openInvoice = async (invoice: Invoice, autoPrint = false) => {
    const { data: fullInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice.id)
      .single();
    if (!fullInvoice) { toast.error('Invoice not found'); return; }

    const { data: items } = await supabase
      .from('invoice_items')
      .select('*, products(*)')
      .eq('invoice_id', invoice.id);

    const invoiceData: InvoiceData = {
      id: fullInvoice.id,
      invoice_number: fullInvoice.invoice_number,
      shop_id: fullInvoice.shop_id,
      date: fullInvoice.date,
      customer_name: fullInvoice.customer_name,
      customer_phone: fullInvoice.customer_phone,
      customer_gst: fullInvoice.customer_gst || undefined,
      items: (items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        product: item.products,
        imei: item.imei || '',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        discount: Number(item.discount),
        discountType: item.discount_type,
        discountValue: Number(item.discount_value),
        total: Number(item.total),
      })),
      subtotal: Number(fullInvoice.subtotal),
      total_discount: Number(fullInvoice.total_discount),
      bill_discount: Number(fullInvoice.bill_discount),
      bill_discount_type: fullInvoice.bill_discount_type,
      cgst: Number(fullInvoice.cgst),
      sgst: Number(fullInvoice.sgst),
      grand_total: Number(fullInvoice.grand_total),
      payment_method: fullInvoice.payment_method,
      is_gst_bill: fullInvoice.is_gst_bill,
      gst_bearer: fullInvoice.gst_bearer,
      print_type: fullInvoice.print_type,
      status: fullInvoice.status,
      billing_business_name: fullInvoice.billing_business_name || undefined,
      billing_address: fullInvoice.billing_address || undefined,
      billing_phone: fullInvoice.billing_phone || undefined,
      billing_gst_number: fullInvoice.billing_gst_number || undefined,
      warranty_mobile: fullInvoice.warranty_mobile || undefined,
      warranty_accessories: fullInvoice.warranty_accessories || undefined,
      customer_address: fullInvoice.customer_address || undefined,
      billing_sub_heading: fullInvoice.billing_sub_heading || undefined,
      billing_logo_url: fullInvoice.billing_logo_url || undefined,
      emi_lending_partner: fullInvoice.emi_lending_partner || undefined,
    };
    (invoiceData as any).payment_details = fullInvoice.payment_details;

    setSelectedInvoice(invoiceData);
    if (autoPrint) {
      setTimeout(() => window.print(), 500);
    }
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((s, c) => s + Number(c.total_purchases), 0);

  return (
    <div className="h-full p-4 md:p-5 overflow-y-auto pos-scrollable">
      <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-4 md:gap-5">
        {/* Left: Customer List */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[400px] xl:min-h-[700px]">
          <div className="p-4 border-b space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-lg font-extrabold">Customers</h1>
                <p className="text-xs text-muted-foreground">{totalCustomers} customers · {fmt(totalRevenue)} revenue</p>
              </div>
              <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gradient-primary border-0 text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQ} onChange={e => setSearchQ(e.target.value)} className="h-10 pl-9" placeholder="Search name, phone, address..." />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-4 py-3 border-b flex items-center gap-3 transition-colors ${selectedId === c.id ? 'bg-accent/60' : 'hover:bg-accent/30'}`}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm truncate">{c.name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone || 'No phone'} · {c.address || 'No address'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-display font-bold text-primary">{fmt(Number(c.total_purchases))}</p>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No customers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer Detail */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden min-h-[400px] xl:min-h-[700px]">
          {selected ? (
            <div className="h-full flex flex-col">
              <div className="p-5 border-b bg-gradient-to-r from-accent/70 to-transparent flex-shrink-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-display text-2xl font-extrabold">{selected.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selected.phone || 'No phone'}</span>
                      <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {selected.email || 'No email'}</span>
                      {selected.gstin && <span className="flex items-center gap-1"><Hash className="w-4 h-4" /> {selected.gstin}</span>}
                    </div>
                    {selected.address && (
                      <p className="flex items-center gap-1 mt-1 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> {selected.address}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(selected.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-5 border-b flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs font-display uppercase tracking-wider text-muted-foreground">Total Purchases</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-primary">{fmt(Number(selected.total_purchases))}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs font-display uppercase tracking-wider text-muted-foreground">Invoices</p>
                    <p className="mt-2 font-display text-2xl font-extrabold">{customerHistory.length}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs font-display uppercase tracking-wider text-muted-foreground">Last Purchase</p>
                    <p className="mt-2 font-display text-lg font-extrabold">
                      {selected.last_purchase_date ? new Date(selected.last_purchase_date).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                </div>
                {selected.notes && (
                  <div className="mt-3 rounded-xl bg-secondary/30 p-3 text-sm text-muted-foreground">
                    <span className="font-display font-semibold text-foreground">Notes: </span>{selected.notes}
                  </div>
                )}
              </div>

              {/* Purchase History */}
              <div className="p-5 flex-1 overflow-auto pos-scrollable">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h3 className="font-display font-bold text-lg">Purchase History</h3>
                  <div className="relative w-full max-w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={invoiceSearchQ}
                      onChange={e => setInvoiceSearchQ(e.target.value)}
                      className="h-9 pl-9 text-sm"
                      placeholder="Search invoice number..."
                    />
                  </div>
                </div>
                <div className="rounded-2xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50">
                        <tr className="text-left font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Invoice</th>
                          <th className="px-4 py-3">Payment</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map(inv => (
                          <tr key={inv.id} className="border-t hover:bg-accent/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3 font-display font-semibold whitespace-nowrap">{inv.invoice_number}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-[10px] font-display font-bold bg-secondary">
                                {inv.payment_method}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-display font-bold">{fmt(Number(inv.grand_total))}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-display font-bold ${
                                inv.status === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                              }`}>{inv.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openInvoice(inv)}
                                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                  title="View Invoice"
                                >
                                  <Eye className="w-4 h-4 text-primary" />
                                </button>
                                {onEditInvoice && (
                                  <button
                                    onClick={async () => {
                                      // Build InvoiceData from the invoice
                                      const { data: fullInvoice } = await supabase.from('invoices').select('*').eq('id', inv.id).single();
                                      if (!fullInvoice) { toast.error('Invoice not found'); return; }
                                      const { data: itms } = await supabase.from('invoice_items').select('*, products(*)').eq('invoice_id', inv.id);
                                      const invoiceData: InvoiceData = {
                                        id: fullInvoice.id, invoice_number: fullInvoice.invoice_number, shop_id: fullInvoice.shop_id,
                                        date: fullInvoice.date, customer_name: fullInvoice.customer_name, customer_phone: fullInvoice.customer_phone,
                                        customer_gst: fullInvoice.customer_gst || undefined,
                                        items: (itms || []).map((item: any) => ({
                                          id: item.id, productId: item.product_id, product: item.products, imei: item.imei || '',
                                          quantity: item.quantity, unitPrice: Number(item.unit_price), discount: Number(item.discount),
                                          discountType: item.discount_type, discountValue: Number(item.discount_value), total: Number(item.total),
                                        })),
                                        subtotal: Number(fullInvoice.subtotal), total_discount: Number(fullInvoice.total_discount),
                                        bill_discount: Number(fullInvoice.bill_discount), bill_discount_type: fullInvoice.bill_discount_type,
                                        cgst: Number(fullInvoice.cgst), sgst: Number(fullInvoice.sgst), grand_total: Number(fullInvoice.grand_total),
                                        payment_method: fullInvoice.payment_method, is_gst_bill: fullInvoice.is_gst_bill, gst_bearer: fullInvoice.gst_bearer,
                                        print_type: fullInvoice.print_type, status: fullInvoice.status,
                                        billing_business_name: fullInvoice.billing_business_name || undefined,
                                        billing_address: fullInvoice.billing_address || undefined,
                                        billing_phone: fullInvoice.billing_phone || undefined,
                                        billing_gst_number: fullInvoice.billing_gst_number || undefined,
                                        warranty_mobile: fullInvoice.warranty_mobile || undefined,
                                        warranty_accessories: fullInvoice.warranty_accessories || undefined,
                                        customer_address: fullInvoice.customer_address || undefined,
                                        billing_sub_heading: fullInvoice.billing_sub_heading || undefined,
                                        billing_logo_url: fullInvoice.billing_logo_url || undefined,
                                        emi_lending_partner: fullInvoice.emi_lending_partner || undefined,
                                      };
                                      (invoiceData as any).payment_details = fullInvoice.payment_details;
                                      onEditInvoice(invoiceData);
                                    }}
                                    className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center hover:bg-warning/20 transition-colors"
                                    title="Edit Invoice"
                                  >
                                    <Pencil className="w-4 h-4 text-warning" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openInvoice(inv, true)}
                                  className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center hover:bg-success/20 transition-colors"
                                  title="Reprint Invoice"
                                >
                                  <Printer className="w-4 h-4 text-success" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              {invoiceSearchQ ? 'No invoices match your search' : 'No purchase history'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-display font-semibold">Select a customer to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editingId ? 'Edit Customer' : 'Add Customer'} subtitle="Store customer details for quick billing">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Customer Name *</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Phone</label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Email</label>
            <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Address</label>
            <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">GSTIN</label>
            <Input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15) })} placeholder="Optional" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Notes</label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
          <Button onClick={handleSave} className="gradient-primary border-0 text-primary-foreground">
            {editingId ? 'Update Customer' : 'Save Customer'}
          </Button>
        </div>
      </Modal>

      {/* Invoice Preview */}
      {selectedInvoice && (
        <InvoicePreview invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};
