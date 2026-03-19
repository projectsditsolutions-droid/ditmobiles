import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Phone, Hash, Building2, Wallet, Package, IndianRupee, RotateCcw, FileText, ArrowDownLeft, ArrowUpRight, TrendingDown, CalendarDays, Filter, X, Smartphone, Tag, HardDrive, Palette, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Dealer = Database['public']['Tables']['dealers']['Row'];
type DealerTransaction = Database['public']['Tables']['dealer_transactions']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }> = ({ open, onClose, title, subtitle, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-[560px] max-w-[calc(100vw-2rem)] animate-scale-in border overflow-hidden" onClick={e => e.stopPropagation()}>
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

const getQuantityFromTxn = (txn: DealerTransaction) => {
  if (txn.type === 'payment') return '—';
  if (txn.type === 'sale_deduction' || txn.type === 'stock_return') return '1';
  const match = txn.description.match(/(\d+)\s*×/);
  return match ? match[1] : '—';
};

export const DealerLedger: React.FC = () => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [allTxns, setAllTxns] = useState<DealerTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [showDealerForm, setShowDealerForm] = useState(false);
  const [editingDealerId, setEditingDealerId] = useState<string | null>(null);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'credit_desc' | 'credit_asc' | 'recent'>('credit_desc');
  const [txnFilter, setTxnFilter] = useState<'all' | 'purchase' | 'payment' | 'sale_deduction' | 'stock_return'>('all');
  const [dealerForm, setDealerForm] = useState({ brand_name: '', dealer_name: '', phone: '', address: '', gstin: '', total_credit: 0 });
  const [stockForm, setStockForm] = useState({ product_id: '', unit_price: 0, imeis: '', hsn_code: '' });
  const [stockSearch, setStockSearch] = useState('');
  const [showNewProductInStock, setShowNewProductInStock] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ brand: '', model: '', variant: '', color: '', sale_price: 0, gst_percent: 18, hsn_code: '', category: 'mobile' });
  const [returnForm, setReturnForm] = useState({ imei: '', reason: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, description: '' });

  const fetchDealers = async () => {
    if (!activeShopId && !isAllShops) return;
    let query = supabase.from('dealers').select('*');
    if (isAllShops) query = query.in('shop_id', allShopIds);
    else query = query.eq('shop_id', activeShopId!);
    const { data } = await query.order('brand_name').order('dealer_name');
    setDealers(data || []);
  };

  const fetchTransactions = async () => {
    if (!activeShopId && !isAllShops) return;
    let query = supabase.from('dealer_transactions').select('*');
    if (isAllShops) query = query.in('shop_id', allShopIds);
    else query = query.eq('shop_id', activeShopId!);
    const { data } = await query.order('created_at', { ascending: false });
    setAllTxns(data || []);
  };

  const fetchProducts = async () => {
    if (!activeShopId && !isAllShops) return;
    let query = supabase.from('products').select('*');
    if (isAllShops) query = query.in('shop_id', allShopIds);
    else query = query.eq('shop_id', activeShopId!);
    const { data } = await query.order('brand').order('model');
    setProducts(data || []);
  };

  useEffect(() => {
    fetchDealers();
    fetchTransactions();
    fetchProducts();
  }, [activeShopId]);

  useEffect(() => {
    if (!selectedDealerId && dealers.length > 0) setSelectedDealerId(dealers[0].id);
  }, [dealers, selectedDealerId]);

  const brands = useMemo(() => ['all', ...Array.from(new Set(dealers.map(d => d.brand_name).filter(Boolean)))], [dealers]);

  const lastTxnMap = useMemo(() => {
    const map = new Map<string, string>();
    allTxns.forEach(txn => {
      if (!map.has(txn.dealer_id)) map.set(txn.dealer_id, txn.created_at);
    });
    return map;
  }, [allTxns]);

  const filteredDealers = useMemo(() => {
    const base = dealers.filter(d => {
      const matchesSearch = !searchQ || `${d.brand_name} ${d.dealer_name} ${d.phone}`.toLowerCase().includes(searchQ.toLowerCase());
      const matchesBrand = brandFilter === 'all' || d.brand_name === brandFilter;
      return matchesSearch && matchesBrand;
    });

    return base.sort((a, b) => {
      if (sortBy === 'credit_asc') return Number(a.total_credit) - Number(b.total_credit);
      if (sortBy === 'recent') return new Date(lastTxnMap.get(b.id) || 0).getTime() - new Date(lastTxnMap.get(a.id) || 0).getTime();
      return Number(b.total_credit) - Number(a.total_credit);
    });
  }, [dealers, searchQ, brandFilter, sortBy, lastTxnMap]);

  const selectedDealer = dealers.find(d => d.id === selectedDealerId) || null;
  const selectedTxns = useMemo(() => allTxns.filter(t => t.dealer_id === selectedDealerId), [allTxns, selectedDealerId]);
  const visibleTxns = selectedTxns.filter(t => txnFilter === 'all' || t.type === txnFilter);

  const totals = useMemo(() => {
    const purchase = selectedTxns.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount), 0);
    const payment = selectedTxns.filter(t => t.type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
    const sold = selectedTxns.filter(t => t.type === 'sale_deduction').reduce((s, t) => s + Number(t.amount), 0);
    const returned = selectedTxns.filter(t => t.type === 'stock_return').reduce((s, t) => s + Number(t.amount), 0);
    const current = Number(selectedDealer?.total_credit || 0);
    const opening = current - purchase + payment + sold + returned;
    return { purchase, payment, sold, returned, current, opening };
  }, [selectedDealer, selectedTxns]);

  const totalOutstanding = dealers.reduce((sum, dealer) => sum + Number(dealer.total_credit), 0);

  const getBalanceTone = (amount: number) => {
    if (amount >= 200000) return 'text-destructive';
    if (amount >= 50000) return 'text-warning';
    return 'text-success';
  };

  const openEditDealer = (dealer: Dealer) => {
    setDealerForm({
      brand_name: dealer.brand_name,
      dealer_name: dealer.dealer_name,
      phone: dealer.phone,
      address: dealer.address,
      gstin: dealer.gstin,
      total_credit: Number(dealer.total_credit),
    });
    setEditingDealerId(dealer.id);
    setShowDealerForm(true);
  };

  const handleDeleteDealer = async (id: string) => {
    if (!confirm('Delete this dealer? All transactions will also be deleted.')) return;
    await supabase.from('dealer_transactions').delete().eq('dealer_id', id);
    await supabase.from('dealers').delete().eq('id', id);
    if (selectedDealerId === id) setSelectedDealerId(null);
    toast.success('Dealer deleted');
    fetchDealers();
    fetchTransactions();
  };

  const handleAddDealer = async () => {
    if (!activeShopId || !dealerForm.dealer_name.trim()) {
      toast.error('Dealer name is required');
      return;
    }

    if (editingDealerId) {
      const { error } = await supabase.from('dealers').update({
        brand_name: dealerForm.brand_name.trim(),
        dealer_name: dealerForm.dealer_name.trim(),
        phone: dealerForm.phone.trim(),
        address: dealerForm.address.trim(),
        gstin: dealerForm.gstin.trim(),
      }).eq('id', editingDealerId);
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Dealer updated');
    } else {
      const { error } = await supabase.from('dealers').insert({
        shop_id: activeShopId,
        brand_name: dealerForm.brand_name.trim(),
        dealer_name: dealerForm.dealer_name.trim(),
        phone: dealerForm.phone.trim(),
        address: dealerForm.address.trim(),
        gstin: dealerForm.gstin.trim(),
        total_credit: dealerForm.total_credit || 0,
      });
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Dealer added');
    }

    setShowDealerForm(false);
    setEditingDealerId(null);
    setDealerForm({ brand_name: '', dealer_name: '', phone: '', address: '', gstin: '', total_credit: 0 });
    fetchDealers();
  };

  const handlePayment = async () => {
    if (!selectedDealer || !activeShopId || paymentForm.amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    const newBalance = Number(selectedDealer.total_credit) - paymentForm.amount;
    const { error: txnError } = await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer.id,
      shop_id: activeShopId,
      type: 'payment',
      amount: paymentForm.amount,
      running_balance: newBalance,
      description: paymentForm.description || 'Payment made to dealer',
    });
    if (txnError) { toast.error('Failed: ' + txnError.message); return; }
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer.id);

    setShowPayment(false);
    setPaymentForm({ amount: 0, description: '' });
    toast.success('Payment recorded');
    fetchDealers();
    fetchTransactions();
  };

  const handleCreateProductInStock = async () => {
    if (!activeShopId || !newProductForm.brand || !newProductForm.model) {
      toast.error('Brand and Model are required');
      return;
    }
    const { data, error } = await supabase.from('products').insert({
      brand: newProductForm.brand,
      model: newProductForm.model,
      variant: newProductForm.variant,
      color: newProductForm.color,
      purchase_price: stockForm.unit_price,
      sale_price: newProductForm.sale_price,
      gst_percent: newProductForm.gst_percent,
      hsn_code: newProductForm.hsn_code,
      category: newProductForm.category,
      shop_id: activeShopId,
      stock_quantity: 0,
    } as any).select().single();
    if (error) { toast.error('Failed to create product: ' + error.message); return; }
    if (data) {
      setStockForm({ ...stockForm, product_id: data.id, hsn_code: newProductForm.hsn_code });
      setStockSearch(`${data.brand} ${data.model} ${data.variant}`);
      setShowNewProductInStock(false);
      toast.success('Product created! Now add IMEIs below.');
      fetchProducts();
    }
  };

  const handleStockEntry = async () => {
    if (!selectedDealer || !activeShopId || !stockForm.product_id) {
      toast.error('Select a product');
      return;
    }

    const imeiList = stockForm.imeis.split('\n').map(v => v.trim()).filter(v => /^\d{15}$/.test(v));
    if (imeiList.length === 0) {
      toast.error('Enter valid 15-digit IMEIs');
      return;
    }

    let added = 0;
    for (const imei of imeiList) {
      const { error } = await supabase.from('imei_records').insert({
        imei,
        product_id: stockForm.product_id,
        shop_id: activeShopId,
        dealer_id: selectedDealer.id,
        status: 'in_stock',
        purchase_price: stockForm.unit_price,
      });
      if (!error) added++;
    }

    if (added === 0) {
      toast.error('No IMEIs were added (duplicates?)');
      return;
    }

    const product = products.find(p => p.id === stockForm.product_id);
    if (product) {
      const updateData: any = { stock_quantity: product.stock_quantity + added };
      if (stockForm.hsn_code) updateData.hsn_code = stockForm.hsn_code;
      await supabase.from('products').update(updateData).eq('id', product.id);
    }

    const purchaseValue = added * stockForm.unit_price;
    const newBalance = Number(selectedDealer.total_credit) + purchaseValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer.id);
    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer.id,
      shop_id: activeShopId,
      type: 'purchase',
      amount: purchaseValue,
      running_balance: newBalance,
      description: `Purchase ${added} × ${product?.brand || ''} ${product?.model || ''} @ ₹${stockForm.unit_price.toLocaleString('en-IN')}`,
    });

    setShowStockEntry(false);
    setStockForm({ product_id: '', unit_price: 0, imeis: '', hsn_code: '' });
    setShowNewProductInStock(false);
    setNewProductForm({ brand: '', model: '', variant: '', color: '', sale_price: 0, gst_percent: 18, hsn_code: '', category: 'mobile' });
    setStockSearch('');
    toast.success(`Added ${added} units to inventory and ledger`);
    fetchDealers();
    fetchTransactions();
    fetchProducts();
  };

  const handleStockReturn = async () => {
    if (!selectedDealer || !activeShopId || !returnForm.imei.trim()) {
      toast.error('Enter IMEI');
      return;
    }

    const { data: imeiRecord } = await supabase.from('imei_records').select('*, products(*)').eq('imei', returnForm.imei.trim()).eq('dealer_id', selectedDealer.id).eq('status', 'in_stock').maybeSingle();
    if (!imeiRecord) {
      toast.error('IMEI not found in available stock for this dealer');
      return;
    }

    const product = imeiRecord.products as unknown as Product;
    const costValue = Number(imeiRecord.purchase_price || 0);

    await supabase.from('imei_records').update({ status: 'returned' }).eq('id', imeiRecord.id);
    await supabase.from('products').update({ stock_quantity: Math.max(0, (product?.stock_quantity || 0) - 1) }).eq('id', imeiRecord.product_id);

    const newBalance = Number(selectedDealer.total_credit) - costValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer.id);
    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer.id,
      shop_id: activeShopId,
      type: 'stock_return',
      amount: costValue,
      running_balance: newBalance,
      description: `Return ${product?.brand || ''} ${product?.model || ''} (IMEI: ${returnForm.imei.trim()})${returnForm.reason ? ` - ${returnForm.reason}` : ''}`,
      imei_ref: returnForm.imei.trim(),
    });

    setShowReturnForm(false);
    setReturnForm({ imei: '', reason: '' });
    toast.success('Stock return recorded');
    fetchDealers();
    fetchTransactions();
    fetchProducts();
  };

  return (
    <div className="h-full p-5 overflow-y-auto pos-scrollable">
      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-5 h-full">
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[700px]">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-lg font-extrabold">Dealer Ledger</h1>
                <p className="text-xs text-muted-foreground">Cost-price payable tracking with live balance</p>
              </div>
              <Button size="sm" onClick={() => setShowDealerForm(true)} className="gradient-primary border-0 text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add Dealer
              </Button>
            </div>

            <div className="rounded-2xl border bg-accent/40 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-destructive" />
                <span className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">Total Payable</span>
              </div>
              <div className="font-display text-3xl font-extrabold text-destructive">{fmt(totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">Ledger uses only cost price. Selling price and GST do not affect dealer balance.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQ} onChange={e => setSearchQ(e.target.value)} className="h-10 pl-9" placeholder="Search dealer, brand or phone" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {brands.map(brand => <option key={brand} value={brand}>{brand === 'all' ? 'All brands' : brand}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="credit_desc">High balance first</option>
                <option value="credit_asc">Low balance first</option>
                <option value="recent">Recent activity</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0 z-10">
                <tr className="text-left font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {filteredDealers.map(dealer => (
                  <tr key={dealer.id} onClick={() => setSelectedDealerId(dealer.id)} className={`cursor-pointer border-t transition-colors ${selectedDealerId === dealer.id ? 'bg-accent/60' : 'hover:bg-accent/30'}`}>
                    <td className="px-4 py-3 font-display font-semibold">{dealer.brand_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-display font-semibold">{dealer.dealer_name}</div>
                      <div className="text-[11px] text-muted-foreground">{lastTxnMap.get(dealer.id) ? new Date(lastTxnMap.get(dealer.id) as string).toLocaleDateString('en-IN') : 'No transactions yet'}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{dealer.phone || '—'}</td>
                    <td className={`px-4 py-3 text-right font-display font-bold ${getBalanceTone(Number(dealer.total_credit))}`}>{fmt(Number(dealer.total_credit))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden min-h-[700px]">
          {selectedDealer ? (
            <div className="h-full flex flex-col">
              <div className="p-5 border-b bg-gradient-to-r from-accent/70 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-2xl font-extrabold">{selectedDealer.dealer_name}</h2>
                      {selectedDealer.brand_name && <span className="px-2 py-1 rounded-full text-xs font-display font-bold bg-primary/10 text-primary">{selectedDealer.brand_name}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedDealer.phone || 'No phone'}</span>
                      <span className="flex items-center gap-1"><Hash className="w-4 h-4" /> {selectedDealer.gstin || 'No GSTIN'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-display uppercase tracking-widest text-muted-foreground">Current Balance</p>
                    <p className={`font-display text-4xl font-extrabold ${getBalanceTone(totals.current)}`}>{fmt(totals.current)}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 border-b space-y-4">
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                  {[
                    { label: 'Opening Credit', value: totals.opening, tone: 'text-muted-foreground' },
                    { label: 'Purchases', value: totals.purchase, tone: 'text-destructive' },
                    { label: 'Sold (Cost)', value: totals.sold, tone: 'text-primary' },
                    { label: 'Payments', value: totals.payment, tone: 'text-success' },
                    { label: 'Returns', value: totals.returned, tone: 'text-warning' },
                  ].map(card => (
                    <div key={card.label} className="rounded-2xl border bg-background p-4">
                      <p className="text-xs font-display uppercase tracking-wider text-muted-foreground">{card.label}</p>
                      <p className={`mt-2 font-display text-2xl font-extrabold ${card.tone}`}>{fmt(card.value)}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  <p className="font-display font-bold text-foreground mb-2">Ledger Rules</p>
                  <div className="grid md:grid-cols-2 gap-2">
                    <p>• Purchase adds cost price to dealer credit</p>
                    <p>• Sale deducts only cost price</p>
                    <p>• Payment reduces dealer credit</p>
                    <p>• Stock return reduces dealer credit</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button onClick={() => setShowStockEntry(true)} className="rounded-2xl border p-4 text-left hover:bg-accent/40 transition-colors">
                    <Package className="w-5 h-5 text-destructive mb-2" />
                    <p className="font-display font-bold">Purchase Stock</p>
                    <p className="text-xs text-muted-foreground mt-1">Adds inventory and increases payable balance</p>
                  </button>
                  <button onClick={() => setShowPayment(true)} className="rounded-2xl border p-4 text-left hover:bg-accent/40 transition-colors">
                    <IndianRupee className="w-5 h-5 text-success mb-2" />
                    <p className="font-display font-bold">Record Payment</p>
                    <p className="text-xs text-muted-foreground mt-1">Reduces dealer balance immediately</p>
                  </button>
                  <button onClick={() => setShowReturnForm(true)} className="rounded-2xl border p-4 text-left hover:bg-accent/40 transition-colors">
                    <RotateCcw className="w-5 h-5 text-warning mb-2" />
                    <p className="font-display font-bold">Return Stock</p>
                    <p className="text-xs text-muted-foreground mt-1">Removes inventory and reduces dealer balance</p>
                  </button>
                </div>
              </div>

              <div className="p-5 flex-1 overflow-auto">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <div>
                    <h3 className="font-display font-bold text-lg">Transaction History</h3>
                    <p className="text-xs text-muted-foreground">Every movement updates balance live</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select value={txnFilter} onChange={e => setTxnFilter(e.target.value as any)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="all">All</option>
                      <option value="purchase">Purchase</option>
                      <option value="sale_deduction">Sale</option>
                      <option value="payment">Payment</option>
                      <option value="stock_return">Return</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr className="text-left font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Cost Value</th>
                        <th className="px-4 py-3 text-right">Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTxns.map(txn => (
                        <tr key={txn.id} className="border-t hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{new Date(txn.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-display font-bold ${
                              txn.type === 'purchase' ? 'bg-destructive/10 text-destructive' :
                              txn.type === 'payment' ? 'bg-success/10 text-success' :
                              txn.type === 'stock_return' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                            }`}>
                              {txn.type === 'sale_deduction' ? 'Sale' : txn.type === 'stock_return' ? 'Return' : txn.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-display font-semibold text-foreground">{txn.invoice_ref || txn.imei_ref || 'Manual entry'}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">{txn.description}</div>
                          </td>
                          <td className="px-4 py-3 text-center">{getQuantityFromTxn(txn)}</td>
                          <td className="px-4 py-3 text-right font-display font-bold">{txn.type === 'purchase' ? '+' : '-'}{fmt(Number(txn.amount))}</td>
                          <td className="px-4 py-3 text-right font-display font-extrabold">{fmt(Number(txn.running_balance))}</td>
                        </tr>
                      ))}
                      {visibleTxns.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            No transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-display font-semibold">Select a dealer to view the ledger</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showDealerForm} onClose={() => setShowDealerForm(false)} title="Add Dealer" subtitle="Create dealer master with opening credit">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Brand Name</label>
            <Input value={dealerForm.brand_name} onChange={e => setDealerForm({ ...dealerForm, brand_name: e.target.value })} placeholder="OPPO, Vivo" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Dealer Name</label>
            <Input value={dealerForm.dealer_name} onChange={e => setDealerForm({ ...dealerForm, dealer_name: e.target.value })} placeholder="Dealer contact" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Phone Number</label>
            <Input value={dealerForm.phone} onChange={e => setDealerForm({ ...dealerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">GSTIN</label>
            <Input value={dealerForm.gstin} onChange={e => setDealerForm({ ...dealerForm, gstin: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15) })} placeholder="Optional" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Address</label>
            <Input value={dealerForm.address} onChange={e => setDealerForm({ ...dealerForm, address: e.target.value })} placeholder="Dealer address" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Opening Credit</label>
            <Input type="number" value={dealerForm.total_credit || ''} onChange={e => setDealerForm({ ...dealerForm, total_credit: Number(e.target.value) })} placeholder="Amount payable at start" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowDealerForm(false)}>Cancel</Button>
          <Button onClick={handleAddDealer} className="gradient-primary border-0 text-primary-foreground">Save Dealer</Button>
        </div>
      </Modal>

      <Modal open={showStockEntry} onClose={() => { setShowStockEntry(false); setShowNewProductInStock(false); }} title="Purchase Stock" subtitle={`Adds inventory for ${selectedDealer?.dealer_name || 'dealer'} and increases payable balance`}>
        <div className="space-y-4">
          {/* Product Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-display font-semibold text-muted-foreground">Product</label>
              <button onClick={() => setShowNewProductInStock(!showNewProductInStock)}
                className="text-xs font-display font-semibold text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> {showNewProductInStock ? 'Select Existing' : 'New Product'}
              </button>
            </div>

            {!showNewProductInStock ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={stockSearch}
                    onChange={e => setStockSearch(e.target.value)}
                    placeholder="Search product by name, brand, model..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl border bg-background">
                  {products
                    .filter(p => !stockSearch || `${p.brand} ${p.model} ${p.variant} ${p.color}`.toLowerCase().includes(stockSearch.toLowerCase()))
                    .map(product => (
                      <button key={product.id} onClick={() => {
                        setStockForm({ ...stockForm, product_id: product.id, unit_price: Number(product.purchase_price), hsn_code: (product as any).hsn_code || '' });
                        setStockSearch(`${product.brand} ${product.model} ${product.variant}`);
                      }}
                        className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 flex items-center justify-between hover:bg-accent transition-colors ${stockForm.product_id === product.id ? 'bg-accent/60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-primary" />
                          <div>
                            <span className="font-display font-semibold text-sm">{product.brand} {product.model}</span>
                            <span className="text-xs text-muted-foreground ml-2">{product.variant} {product.color}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</span>
                      </button>
                    ))}
                  {products.filter(p => !stockSearch || `${p.brand} ${p.model} ${p.variant} ${p.color}`.toLowerCase().includes(stockSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                      No products found. <button onClick={() => setShowNewProductInStock(true)} className="text-primary font-semibold hover:underline">Create new product</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Inline New Product Form */
              <div className="rounded-xl border bg-accent/30 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1"><Tag className="w-3 h-3" /> Brand *</label>
                    <Input value={newProductForm.brand} onChange={e => setNewProductForm({ ...newProductForm, brand: e.target.value })} placeholder="Samsung, Oppo..." className="h-9" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1"><Smartphone className="w-3 h-3" /> Model *</label>
                    <Input value={newProductForm.model} onChange={e => setNewProductForm({ ...newProductForm, model: e.target.value })} placeholder="Galaxy A54..." className="h-9" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1"><HardDrive className="w-3 h-3" /> RAM/Storage</label>
                    <Input value={newProductForm.variant} onChange={e => setNewProductForm({ ...newProductForm, variant: e.target.value })} placeholder="6GB/128GB" className="h-9" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1"><Palette className="w-3 h-3" /> Color</label>
                    <Input value={newProductForm.color} onChange={e => setNewProductForm({ ...newProductForm, color: e.target.value })} placeholder="Black, Blue..." className="h-9" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Sale Price (₹)</label>
                    <Input type="number" value={newProductForm.sale_price || ''} onChange={e => setNewProductForm({ ...newProductForm, sale_price: Number(e.target.value) })} className="h-9" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">GST %</label>
                    <Input type="number" value={newProductForm.gst_percent} onChange={e => setNewProductForm({ ...newProductForm, gst_percent: Number(e.target.value) })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">HSN Code</label>
                    <Input value={newProductForm.hsn_code} onChange={e => setNewProductForm({ ...newProductForm, hsn_code: e.target.value })} className="h-9" placeholder="85171300" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Category</label>
                    <select value={newProductForm.category} onChange={e => setNewProductForm({ ...newProductForm, category: e.target.value })}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="mobile">📱 Mobile</option>
                      <option value="accessory">🎧 Accessory</option>
                      <option value="other">📦 Other</option>
                    </select>
                  </div>
                </div>
                <Button size="sm" onClick={handleCreateProductInStock} className="gradient-primary border-0 text-primary-foreground w-full">
                  <Plus className="w-4 h-4 mr-1" /> Create Product & Select
                </Button>
              </div>
            )}
          </div>

          {/* Cost Price & HSN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Cost Price Per Unit (₹)</label>
              <Input type="number" value={stockForm.unit_price || ''} onChange={e => setStockForm({ ...stockForm, unit_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">HSN Code</label>
              <Input value={stockForm.hsn_code} onChange={e => setStockForm({ ...stockForm, hsn_code: e.target.value })} placeholder="85171300" />
            </div>
          </div>

          {/* IMEIs */}
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">IMEI Numbers (one per line)</label>
            <Textarea rows={6} value={stockForm.imeis} onChange={e => setStockForm({ ...stockForm, imeis: e.target.value })} placeholder="Enter 15-digit IMEI numbers&#10;356789012345678&#10;356789012345679" className="font-mono" />
          </div>

          {/* Summary */}
          <div className="rounded-xl border bg-accent/40 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Units</span><span className="font-display font-bold">{stockForm.imeis.split('\n').filter(v => /^\d{15}$/.test(v.trim())).length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cost Price / Unit</span><span className="font-display font-bold">{fmt(stockForm.unit_price)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground font-semibold">Total Purchase Value</span><span className="font-display font-bold text-destructive">{fmt(stockForm.imeis.split('\n').filter(v => /^\d{15}$/.test(v.trim())).length * stockForm.unit_price)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => { setShowStockEntry(false); setShowNewProductInStock(false); }}>Cancel</Button>
          <Button onClick={handleStockEntry} disabled={!stockForm.product_id} className="gradient-primary border-0 text-primary-foreground">Save Purchase</Button>
        </div>
      </Modal>

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment" subtitle="Payment reduces dealer balance immediately">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Amount</label>
            <Input type="number" value={paymentForm.amount || ''} onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Reference / Notes</label>
            <Input value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="Cash, bank transfer, cheque..." />
          </div>
          <div className="rounded-xl border bg-accent/40 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Balance</span><span className="font-display font-bold">{fmt(Number(selectedDealer?.total_credit || 0))}</span></div>
            <div className="flex justify-between mt-2"><span className="text-muted-foreground">After Payment</span><span className="font-display font-bold text-success">{fmt(Number(selectedDealer?.total_credit || 0) - paymentForm.amount)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
          <Button onClick={handlePayment} className="bg-success hover:bg-success/90 text-success-foreground">Save Payment</Button>
        </div>
      </Modal>

      <Modal open={showReturnForm} onClose={() => setShowReturnForm(false)} title="Return Stock" subtitle="Removes inventory and reduces dealer balance by cost price">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">IMEI</label>
            <Input value={returnForm.imei} onChange={e => setReturnForm({ ...returnForm, imei: e.target.value.replace(/\D/g, '').slice(0, 15) })} className="font-mono" placeholder="15-digit IMEI" />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-muted-foreground mb-1.5 block">Reason</label>
            <Input value={returnForm.reason} onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })} placeholder="Damaged / replacement / wrong stock" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowReturnForm(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleStockReturn}>Save Return</Button>
        </div>
      </Modal>
    </div>
  );
};
