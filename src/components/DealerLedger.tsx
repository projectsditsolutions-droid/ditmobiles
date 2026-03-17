import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, RotateCcw, TrendingUp, TrendingDown, Package, IndianRupee, Search, FileText, X, Phone, Building2, Hash, ArrowUpRight, ArrowDownLeft, Wallet, BarChart3, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Dealer = Database['public']['Tables']['dealers']['Row'];
type DealerTransaction = Database['public']['Tables']['dealer_transactions']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

export const DealerLedger: React.FC = () => {
  const { activeShopId } = useShop();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [txns, setTxns] = useState<DealerTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [txnFilter, setTxnFilter] = useState<'all' | 'purchase' | 'payment' | 'sale_deduction' | 'stock_return'>('all');
  const [form, setForm] = useState({ brand_name: '', dealer_name: '', phone: '', address: '', gstin: '', total_credit: 0 });
  const [stockForm, setStockForm] = useState({ product_id: '', quantity: 1, unit_price: 0, imeis: '' });
  const [returnForm, setReturnForm] = useState({ imei: '', reason: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, description: '' });

  const fetchDealers = async () => {
    if (!activeShopId) return;
    const { data } = await supabase.from('dealers').select('*').eq('shop_id', activeShopId).order('brand_name');
    if (data) setDealers(data);
  };

  const fetchTxns = async (dealerId: string) => {
    const { data } = await supabase.from('dealer_transactions').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false });
    if (data) setTxns(data);
  };

  const fetchProducts = async () => {
    if (!activeShopId) return;
    const { data } = await supabase.from('products').select('*').eq('shop_id', activeShopId);
    if (data) setProducts(data);
  };

  useEffect(() => { fetchDealers(); fetchProducts(); }, [activeShopId]);
  useEffect(() => { if (selectedDealer) fetchTxns(selectedDealer); }, [selectedDealer]);

  const handleAddDealer = async () => {
    if (!form.dealer_name || !activeShopId) { toast.error('Dealer name required'); return; }
    await supabase.from('dealers').insert({ ...form, shop_id: activeShopId });
    setShowForm(false); setForm({ brand_name: '', dealer_name: '', phone: '', address: '', gstin: '', total_credit: 0 });
    toast.success('Dealer added'); fetchDealers();
  };

  const handlePayment = async () => {
    if (!selectedDealer || paymentForm.amount <= 0 || !activeShopId) return;
    const dealer = dealers.find(d => d.id === selectedDealer);
    if (!dealer) return;
    const newBalance = Number(dealer.total_credit) - paymentForm.amount;
    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer, shop_id: activeShopId, type: 'payment',
      amount: paymentForm.amount, running_balance: newBalance,
      description: paymentForm.description || `Payment to dealer`,
    });
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer);
    setShowPayment(false); setPaymentForm({ amount: 0, description: '' });
    toast.success('Payment recorded'); fetchDealers(); fetchTxns(selectedDealer);
  };

  const handleStockEntry = async () => {
    if (!selectedDealer || !stockForm.product_id || !activeShopId) { toast.error('Select a product'); return; }
    const dealer = dealers.find(d => d.id === selectedDealer);
    if (!dealer) return;
    const imeiList = stockForm.imeis.split('\n').map(s => s.trim()).filter(s => s.length === 15);
    const totalValue = imeiList.length * stockForm.unit_price;
    for (const imei of imeiList) {
      await supabase.from('imei_records').insert({
        imei, product_id: stockForm.product_id, shop_id: activeShopId,
        dealer_id: selectedDealer, status: 'in_stock', purchase_price: stockForm.unit_price,
      });
    }
    const product = products.find(p => p.id === stockForm.product_id);
    if (product) {
      await supabase.from('products').update({
        stock_quantity: product.stock_quantity + imeiList.length,
      }).eq('id', stockForm.product_id);
    }
    const newBalance = Number(dealer.total_credit) + totalValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer);
    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer, shop_id: activeShopId, type: 'purchase',
      amount: totalValue, running_balance: newBalance,
      description: `Stock: ${imeiList.length} × ${product?.brand} ${product?.model} @ ₹${stockForm.unit_price.toLocaleString('en-IN')}`,
    });
    setShowStockEntry(false); setStockForm({ product_id: '', quantity: 1, unit_price: 0, imeis: '' });
    toast.success(`${imeiList.length} units added, ₹${totalValue.toLocaleString('en-IN')} credited`);
    fetchDealers(); fetchTxns(selectedDealer); fetchProducts();
  };

  const handleStockReturn = async () => {
    if (!selectedDealer || !returnForm.imei || !activeShopId) { toast.error('Enter IMEI'); return; }
    const dealer = dealers.find(d => d.id === selectedDealer);
    if (!dealer) return;
    const { data: imeiRecord } = await supabase.from('imei_records')
      .select('*, products(*)').eq('imei', returnForm.imei).eq('dealer_id', selectedDealer).eq('status', 'in_stock').maybeSingle();
    if (!imeiRecord) { toast.error('IMEI not found in stock for this dealer'); return; }
    const returnValue = Number(imeiRecord.purchase_price);
    await supabase.from('imei_records').update({ status: 'returned' }).eq('id', imeiRecord.id);
    const product = imeiRecord.products as unknown as Product;
    if (product) {
      await supabase.from('products').update({ stock_quantity: Math.max(0, product.stock_quantity - 1) }).eq('id', product.id);
    }
    const newBalance = Number(dealer.total_credit) - returnValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer);
    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer, shop_id: activeShopId, type: 'stock_return',
      amount: returnValue, running_balance: newBalance,
      description: `Return: ${product?.brand} ${product?.model} (IMEI: ${returnForm.imei}) - ${returnForm.reason}`,
      imei_ref: returnForm.imei,
    });
    setShowReturnForm(false); setReturnForm({ imei: '', reason: '' });
    toast.success(`Returned, ₹${returnValue.toLocaleString('en-IN')} deducted`);
    fetchDealers(); fetchTxns(selectedDealer); fetchProducts();
  };

  const selectedDealerObj = dealers.find(d => d.id === selectedDealer);
  const filteredDealers = dealers.filter(d =>
    !searchQ || `${d.brand_name} ${d.dealer_name}`.toLowerCase().includes(searchQ.toLowerCase())
  );
  const filteredTxns = txns.filter(t => txnFilter === 'all' || t.type === txnFilter);
  const totalOutstanding = dealers.reduce((s, d) => s + Number(d.total_credit), 0);

  // Transaction type config
  const txnConfig: Record<string, { icon: any; bg: string; text: string; sign: string; label: string }> = {
    purchase: { icon: ArrowUpRight, bg: 'bg-destructive/10', text: 'text-destructive', sign: '+', label: 'Stock Purchase' },
    payment: { icon: ArrowDownLeft, bg: 'bg-success/10', text: 'text-success', sign: '-', label: 'Payment Made' },
    sale_deduction: { icon: TrendingDown, bg: 'bg-primary/10', text: 'text-primary', sign: '-', label: 'Sale Deduction' },
    stock_return: { icon: RotateCcw, bg: 'bg-warning/10', text: 'text-warning', sign: '-', label: 'Stock Return' },
  };

  // Modal component
  const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }> = ({ open, onClose, title, subtitle, children }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card rounded-2xl shadow-2xl w-[520px] animate-scale-in border overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div>
              <h2 className="font-display font-bold text-lg">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-destructive/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    );
  };

  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

  return (
    <div className="flex h-full">
      {/* Dealer List Sidebar */}
      <div className="w-80 bg-card border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-lg font-extrabold">Dealer Ledger</h1>
            <Button size="sm" onClick={() => setShowForm(true)} className="gradient-primary border-0 text-primary-foreground h-8">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search dealers..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border-2 border-input bg-background text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all" />
          </div>
          
          {/* Outstanding Summary */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/15">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-destructive/60" />
              <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider font-semibold">Total Outstanding</p>
            </div>
            <p className="font-display text-2xl font-extrabold text-destructive">{fmt(totalOutstanding)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{dealers.length} dealers</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pos-scrollable p-2 space-y-1">
          {filteredDealers.map(d => (
            <button key={d.id} onClick={() => setSelectedDealer(d.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedDealer === d.id ? 'bg-accent border-primary/30 shadow-sm' : 'bg-card border-transparent hover:bg-secondary/80'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-display font-bold ${
                    selectedDealer === d.id ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {d.dealer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-display font-semibold text-sm block leading-tight">{d.dealer_name}</span>
                    {d.brand_name && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-display font-bold">{d.brand_name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-display text-xs font-bold block ${Number(d.total_credit) > 0 ? 'text-destructive' : 'text-success'}`}>
                    {fmt(Number(d.total_credit))}
                  </span>
                  {selectedDealer === d.id && <ChevronRight className="w-3 h-3 text-primary ml-auto mt-1" />}
                </div>
              </div>
            </button>
          ))}
          {filteredDealers.length === 0 && <p className="text-muted-foreground text-xs text-center py-8">No dealers found</p>}
        </div>
      </div>

      {/* Dealer Detail */}
      <div className="flex-1 overflow-y-auto pos-scrollable">
        {selectedDealerObj ? (
          <div className="p-6 max-w-4xl">
            {/* Header Card */}
            <div className="bg-card rounded-2xl border p-5 mb-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="font-display text-xl font-extrabold text-primary">{selectedDealerObj.dealer_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-extrabold">{selectedDealerObj.dealer_name}</h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {selectedDealerObj.brand_name && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-display font-bold">{selectedDealerObj.brand_name}</span>
                      )}
                      {selectedDealerObj.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {selectedDealerObj.phone}
                        </span>
                      )}
                      {selectedDealerObj.gstin && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Hash className="w-3 h-3" /> {selectedDealerObj.gstin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Outstanding Balance</p>
                  <p className={`text-3xl font-display font-extrabold ${Number(selectedDealerObj.total_credit) > 0 ? 'text-destructive' : 'text-success'}`}>
                    {fmt(Number(selectedDealerObj.total_credit))}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <button onClick={() => setShowStockEntry(true)}
                className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5 text-destructive" />
                </div>
                <p className="font-display font-bold text-sm">Add Stock</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Purchase from dealer → increases balance</p>
              </button>
              <button onClick={() => setShowPayment(true)}
                className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <IndianRupee className="w-5 h-5 text-success" />
                </div>
                <p className="font-display font-bold text-sm">Record Payment</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Pay dealer → reduces balance</p>
              </button>
              <button onClick={() => setShowReturnForm(true)}
                className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <RotateCcw className="w-5 h-5 text-warning" />
                </div>
                <p className="font-display font-bold text-sm">Return Stock</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Return to dealer → reduces balance</p>
              </button>
            </div>

            {/* How it works info */}
            <div className="mb-5 p-4 rounded-xl bg-accent/50 border border-accent-foreground/10">
              <p className="text-xs font-display font-bold mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" /> How Dealer Ledger Works
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive"></span>
                  <span><strong className="text-foreground">Stock Purchase</strong> → Balance increases (+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  <span><strong className="text-foreground">Payment to Dealer</strong> → Balance decreases (-)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span><strong className="text-foreground">Product Sold</strong> → Auto-deducts balance (-)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                  <span><strong className="text-foreground">Stock Return</strong> → Balance decreases (-)</span>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" /> Transaction History
                  </h3>
                  <p className="text-xs text-muted-foreground">{txns.length} transactions</p>
                </div>
                {/* Transaction filter */}
                <div className="flex bg-secondary rounded-lg p-0.5 gap-0.5">
                  {[
                    ['all', 'All'],
                    ['purchase', 'Purchases'],
                    ['payment', 'Payments'],
                    ['sale_deduction', 'Sales'],
                  ].map(([key, label]) => (
                    <button key={key} onClick={() => setTxnFilter(key as any)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-display font-semibold transition-all ${
                        txnFilter === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {filteredTxns.map(t => {
                  const config = txnConfig[t.type] || txnConfig.purchase;
                  const TxnIcon = config.icon;
                  return (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.bg}`}>
                          <TxnIcon className={`w-4 h-4 ${config.text}`} />
                        </div>
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">{t.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`price-text text-sm ${config.text}`}>
                          {config.sign}{fmt(Number(t.amount))}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Balance: {fmt(Number(t.running_balance))}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  );
                })}
                {filteredTxns.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-display font-medium">No transactions found</p>
                    <p className="text-xs mt-1">Use the actions above to add stock or record payments</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
              <Building2 className="w-10 h-10 text-accent-foreground/30" />
            </div>
            <p className="font-display font-semibold text-foreground/60">Select a Dealer</p>
            <p className="text-sm text-muted-foreground/60 max-w-xs text-center">Choose a dealer from the left panel to view their ledger, transactions, and manage stock</p>
          </div>
        )}
      </div>

      {/* Add Dealer Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add New Dealer" subtitle="Register a new dealer/supplier">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Brand</label>
              <Input value={form.brand_name} onChange={e => setForm({...form, brand_name: e.target.value})} placeholder="Oppo, Samsung, Vivo..." className="h-10" />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Dealer Name *</label>
              <Input value={form.dealer_name} onChange={e => setForm({...form, dealer_name: e.target.value})} placeholder="Dealer contact name" className="h-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Phone</label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="98765 43210" className="h-10" />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">GSTIN</label>
              <Input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})} placeholder="22AAAAA0000A1Z5" className="h-10 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Address</label>
            <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address" className="h-10" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Initial Credit (₹)</label>
            <Input type="number" value={form.total_credit || ''} onChange={e => setForm({...form, total_credit: Number(e.target.value)})} className="h-10" placeholder="Opening balance" />
            <p className="text-[10px] text-muted-foreground mt-1">Amount owed to the dealer at start</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={handleAddDealer} className="gradient-primary border-0 text-primary-foreground">Add Dealer</Button>
        </div>
      </Modal>

      {/* Stock Entry Modal */}
      <Modal open={showStockEntry} onClose={() => setShowStockEntry(false)} title="Add Stock from Dealer" subtitle={`Purchasing from ${selectedDealerObj?.dealer_name || ''}`}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Product</label>
            <select value={stockForm.product_id} onChange={e => {
              const p = products.find(pr => pr.id === e.target.value);
              setStockForm({...stockForm, product_id: e.target.value, unit_price: p ? Number(p.purchase_price) : 0});
            }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
              <option value="">Select product...</option>
              {products.map(p => (<option key={p.id} value={p.id}>{p.brand} {p.model} {p.variant} (Stock: {p.stock_quantity})</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Unit Price (₹)</label>
              <Input type="number" value={stockForm.unit_price || ''} onChange={e => setStockForm({...stockForm, unit_price: Number(e.target.value)})} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Total Value</label>
              <div className="h-10 px-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center text-sm font-display font-bold text-primary">
                ₹{(stockForm.imeis.split('\n').filter(s => s.trim().length === 15).length * stockForm.unit_price).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">IMEIs (one per line)</label>
            <textarea value={stockForm.imeis}
              onChange={e => setStockForm({...stockForm, imeis: e.target.value, quantity: e.target.value.split('\n').filter(s => s.trim().length === 15).length})}
              rows={5} placeholder="Enter IMEI numbers, one per line..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-display font-bold text-primary">{stockForm.imeis.split('\n').filter(s => s.trim().length === 15).length}</span> valid IMEIs
            </p>
          </div>
          {selectedDealerObj && (
            <div className="p-3 rounded-lg bg-accent/50 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground text-xs">Current Balance</span><span className="font-display font-bold text-destructive">{fmt(Number(selectedDealerObj.total_credit))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground text-xs">After Adding Stock</span>
                <span className="font-display font-bold text-destructive">
                  {fmt(Number(selectedDealerObj.total_credit) + (stockForm.imeis.split('\n').filter(s => s.trim().length === 15).length * stockForm.unit_price))}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowStockEntry(false)}>Cancel</Button>
          <Button onClick={handleStockEntry} className="gradient-primary border-0 text-primary-foreground">Add Stock & Credit</Button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment to Dealer" subtitle={`Paying ${selectedDealerObj?.dealer_name || ''}`}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Payment Amount (₹)</label>
            <Input type="number" value={paymentForm.amount || ''} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} className="h-12 text-lg font-display font-bold" placeholder="Enter payment amount" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Description / Reference</label>
            <Input value={paymentForm.description} onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} className="h-10" placeholder="Bank transfer, cash, cheque no..." />
          </div>
          {selectedDealerObj && (
            <div className="p-4 rounded-xl bg-accent/50 border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Current Outstanding</span>
                <span className="font-display font-bold text-lg text-destructive">{fmt(Number(selectedDealerObj.total_credit))}</span>
              </div>
              <div className="h-px bg-border"></div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">After Payment</span>
                <span className={`font-display font-bold text-lg ${
                  (Number(selectedDealerObj.total_credit) - paymentForm.amount) <= 0 ? 'text-success' : 'text-destructive'
                }`}>{fmt(Number(selectedDealerObj.total_credit) - paymentForm.amount)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
          <Button onClick={handlePayment} className="bg-success hover:bg-success/90 text-success-foreground">Record Payment</Button>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={showReturnForm} onClose={() => setShowReturnForm(false)} title="Return Stock to Dealer" subtitle="Return defective/unwanted stock">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">IMEI Number</label>
            <Input value={returnForm.imei} onChange={e => setReturnForm({...returnForm, imei: e.target.value})} placeholder="15-digit IMEI" className="h-10 font-mono tracking-wider" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Return Reason</label>
            <Input value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})} placeholder="Defective, wrong model, etc." className="h-10" />
          </div>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-muted-foreground">
            <p className="font-display font-semibold text-warning mb-1">⚠ This will:</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li>Mark the IMEI as returned</li>
              <li>Reduce product stock by 1</li>
              <li>Deduct purchase price from dealer balance</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowReturnForm(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleStockReturn}>Return & Deduct</Button>
        </div>
      </Modal>
    </div>
  );
};
