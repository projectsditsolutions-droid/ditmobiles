import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Search, Trash2, Package, ShoppingCart, UserCheck, IndianRupee,
  ScanLine, X, ChevronDown, ChevronUp, Calendar, FileText, Filter,
  Smartphone, Tag, HardDrive, Palette, Hash, ArrowDownLeft, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { BulkIMEIScanner } from '@/components/BulkIMEIScanner';
import type { Database } from '@/integrations/supabase/types';

type Dealer = Database['public']['Tables']['dealers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type DealerTransaction = Database['public']['Tables']['dealer_transactions']['Row'];

interface PurchaseLineItem {
  id: string;
  product_id: string;
  product: Product | null;
  imeis: string;
  unit_price: number;
  sale_price: number;
  hsn_code: string;
  quantity: number; // computed from IMEIs
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }> = ({ open, onClose, title, subtitle, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`bg-card rounded-2xl shadow-2xl w-full ${wide ? 'max-w-[780px]' : 'max-w-[560px]'} animate-scale-in border overflow-hidden max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
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

export const PurchaseEntry: React.FC = () => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'entry' | 'history'>('entry');

  // History state
  const [purchases, setPurchases] = useState<(DealerTransaction & { dealers?: Dealer })[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDealerFilter, setHistoryDealerFilter] = useState('all');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [expandedImeis, setExpandedImeis] = useState<{ imei: string; product_id: string; products?: Product }[]>([]);

  // New product inline form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newLineIndex, setNewLineIndex] = useState<number>(-1);
  const [newProductForm, setNewProductForm] = useState({ brand: '', model: '', variant: '', color: '', purchase_price: 0, sale_price: 0, gst_percent: 18, hsn_code: '', category: 'mobile' });

  // Product search per line
  const [lineSearches, setLineSearches] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    if (!activeShopId && !isAllShops) return;
    const shopFilter = isAllShops ? allShopIds : [activeShopId!];

    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('dealers').select('*').in('shop_id', shopFilter).order('brand_name'),
      supabase.from('products').select('*').in('shop_id', shopFilter).order('brand'),
    ]);
    setDealers(d || []);
    setProducts(p || []);
  }, [activeShopId, isAllShops, allShopIds]);

  const fetchHistory = useCallback(async () => {
    if (!activeShopId && !isAllShops) return;
    const shopFilter = isAllShops ? allShopIds : [activeShopId!];
    const { data } = await supabase
      .from('dealer_transactions')
      .select('*, dealers(*)')
      .in('shop_id', shopFilter)
      .eq('type', 'purchase')
      .order('created_at', { ascending: false })
      .limit(200);
    setPurchases((data || []) as any);
  }, [activeShopId, isAllShops, allShopIds]);

  useEffect(() => { fetchAll(); fetchHistory(); }, [fetchAll, fetchHistory]);

  const selectedDealer = dealers.find(d => d.id === selectedDealerId) || null;

  // Line item management
  const addLineItem = () => {
    const id = crypto.randomUUID();
    setLineItems(prev => [...prev, { id, product_id: '', product: null, imeis: '', unit_price: 0, sale_price: 0, hsn_code: '', quantity: 0 }]);
  };

  const updateLine = (id: string, updates: Partial<PurchaseLineItem>) => {
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, ...updates };
      // Recount quantity from IMEIs
      const imeiList = updated.imeis.split('\n').map(v => v.trim()).filter(v => /^\d{15}$/.test(v));
      updated.quantity = imeiList.length;
      return updated;
    }));
  };

  const removeLine = (id: string) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
    setLineSearches(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const selectProduct = (lineId: string, product: Product) => {
    updateLine(lineId, {
      product_id: product.id,
      product,
      unit_price: Number(product.purchase_price) || 0,
      sale_price: Number(product.sale_price) || 0,
      hsn_code: product.hsn_code || '',
    });
    setLineSearches(prev => ({ ...prev, [lineId]: `${product.brand} ${product.model} ${product.variant}` }));
  };

  // Totals
  const totalItems = lineItems.reduce((s, li) => s + li.quantity, 0);
  const totalValue = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);

  // Save purchase
  const handleSave = async () => {
    if (!selectedDealerId || !activeShopId) { toast.error('Select a dealer'); return; }
    if (lineItems.length === 0) { toast.error('Add at least one product'); return; }

    // Validate
    for (const li of lineItems) {
      if (!li.product_id) { toast.error('Select a product for each line'); return; }
      const imeiList = li.imeis.split('\n').map(v => v.trim()).filter(v => /^\d{15}$/.test(v));
      if (imeiList.length === 0) { toast.error(`Enter valid 15-digit IMEIs for ${li.product?.brand} ${li.product?.model}`); return; }
      if (li.unit_price <= 0) { toast.error(`Enter purchase price for ${li.product?.brand} ${li.product?.model}`); return; }
    }

    setSaving(true);
    try {
      let totalAdded = 0;
      let totalPurchaseValue = 0;
      const productDescs: string[] = [];

      for (const li of lineItems) {
        const imeiList = li.imeis.split('\n').map(v => v.trim()).filter(v => /^\d{15}$/.test(v));
        let added = 0;

        for (const imei of imeiList) {
          const { error } = await supabase.from('imei_records').insert({
            imei,
            product_id: li.product_id,
            shop_id: activeShopId,
            dealer_id: selectedDealerId,
            status: 'in_stock',
            purchase_price: li.unit_price,
          });
          if (!error) added++;
        }

        if (added > 0) {
          // Update product stock, prices & HSN
          const product = products.find(p => p.id === li.product_id);
          if (product) {
            const updateData: Record<string, any> = { stock_quantity: product.stock_quantity + added };
            if (li.hsn_code) updateData.hsn_code = li.hsn_code;
            if (li.unit_price > 0) updateData.purchase_price = li.unit_price;
            if (li.sale_price > 0) updateData.sale_price = li.sale_price;
            await supabase.from('products').update(updateData).eq('id', product.id);
          }
          totalAdded += added;
          totalPurchaseValue += added * li.unit_price;
          productDescs.push(`${added} × ${li.product?.brand || ''} ${li.product?.model || ''} @ ${fmt(li.unit_price)}`);
        }
      }

      if (totalAdded === 0) {
        toast.error('No items added (possible IMEI duplicates)');
        setSaving(false);
        return;
      }

      // Update dealer credit
      const dealer = dealers.find(d => d.id === selectedDealerId)!;
      const newBalance = Number(dealer.total_credit) + totalPurchaseValue;
      await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', dealer.id);

      // Create transaction record
      await supabase.from('dealer_transactions').insert({
        dealer_id: selectedDealerId,
        shop_id: activeShopId,
        type: 'purchase',
        amount: totalPurchaseValue,
        running_balance: newBalance,
        description: `Purchase: ${productDescs.join(' | ')}`,
      });

      toast.success(`✅ ${totalAdded} units added | ${fmt(totalPurchaseValue)} credited to dealer`);
      setLineItems([]);
      setLineSearches({});
      fetchAll();
      fetchHistory();
    } catch (err) {
      toast.error('Something went wrong');
    }
    setSaving(false);
  };

  // Inline new product
  const handleCreateProduct = async () => {
    if (!activeShopId || !newProductForm.brand || !newProductForm.model) { toast.error('Brand & Model required'); return; }
    const { data, error } = await supabase.from('products').insert({
      brand: newProductForm.brand, model: newProductForm.model, variant: newProductForm.variant,
      color: newProductForm.color, purchase_price: newProductForm.purchase_price, sale_price: newProductForm.sale_price,
      gst_percent: newProductForm.gst_percent, hsn_code: newProductForm.hsn_code,
      category: newProductForm.category, shop_id: activeShopId, stock_quantity: 0,
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    if (data && newLineIndex >= 0 && lineItems[newLineIndex]) {
      selectProduct(lineItems[newLineIndex].id, data as Product);
    }
    setShowNewProduct(false);
    setNewProductForm({ brand: '', model: '', variant: '', color: '', purchase_price: 0, sale_price: 0, gst_percent: 18, hsn_code: '', category: 'mobile' });
    toast.success('Product created');
    fetchAll();
  };

  // Expand purchase history to show IMEIs
  const togglePurchase = async (txnId: string, dealerId: string) => {
    if (expandedPurchaseId === txnId) { setExpandedPurchaseId(null); return; }
    setExpandedPurchaseId(txnId);
    // Find IMEIs linked to this dealer around this transaction date
    const txn = purchases.find(p => p.id === txnId);
    if (!txn) return;
    const txnDate = new Date(txn.created_at);
    const from = new Date(txnDate.getTime() - 60000).toISOString();
    const to = new Date(txnDate.getTime() + 60000).toISOString();
    const { data } = await supabase
      .from('imei_records')
      .select('imei, product_id, products(*)')
      .eq('dealer_id', dealerId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false });
    setExpandedImeis((data || []) as any);
  };

  const filteredHistory = useMemo(() => {
    return purchases.filter(p => {
      const matchesSearch = !historySearch || p.description.toLowerCase().includes(historySearch.toLowerCase())
        || ((p as any).dealers?.dealer_name || '').toLowerCase().includes(historySearch.toLowerCase());
      const matchesDealer = historyDealerFilter === 'all' || p.dealer_id === historyDealerFilter;
      return matchesSearch && matchesDealer;
    });
  }, [purchases, historySearch, historyDealerFilter]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Purchase Entry</h1>
          <p className="text-sm text-muted-foreground">Record stock purchases from dealers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        <button onClick={() => setTab('entry')} className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === 'entry' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <ShoppingCart className="w-4 h-4 inline mr-1.5" />New Purchase
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <FileText className="w-4 h-4 inline mr-1.5" />Purchase History
        </button>
      </div>

      {tab === 'entry' && (
        <div className="space-y-5">
          {/* Dealer Selection */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-sm">Select Dealer</h3>
            </div>
            <select
              value={selectedDealerId}
              onChange={e => setSelectedDealerId(e.target.value)}
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium"
            >
              <option value="">-- Choose Dealer --</option>
              {dealers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.brand_name ? `${d.brand_name} — ` : ''}{d.dealer_name} (Balance: {fmt(Number(d.total_credit))})
                </option>
              ))}
            </select>
            {selectedDealer && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {selectedDealer.phone && <span>📞 {selectedDealer.phone}</span>}
                {selectedDealer.gstin && <span>🏢 GSTIN: {selectedDealer.gstin}</span>}
                <span className={`font-display font-bold ${Number(selectedDealer.total_credit) >= 100000 ? 'text-destructive' : 'text-success'}`}>
                  Outstanding: {fmt(Number(selectedDealer.total_credit))}
                </span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-card rounded-xl border">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="font-display font-semibold text-sm">Products</h3>
              </div>
              <Button size="sm" variant="outline" onClick={addLineItem} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Product
              </Button>
            </div>

            {lineItems.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-display">No products added yet</p>
                <p className="text-xs mt-1">Click "Add Product" to start</p>
              </div>
            ) : (
              <div className="divide-y">
                {lineItems.map((li, idx) => {
                  const search = lineSearches[li.id] || '';
                  const matchedProducts = search.length >= 2
                    ? products.filter(p => `${p.brand} ${p.model} ${p.variant} ${p.color}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
                    : [];
                  const imeiCount = li.imeis.split('\n').map(v => v.trim()).filter(v => /^\d{15}$/.test(v)).length;

                  return (
                    <div key={li.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-display font-bold text-muted-foreground uppercase">Item #{idx + 1}</span>
                        <button onClick={() => removeLine(li.id)} className="text-destructive/60 hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Product search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={e => {
                            setLineSearches(prev => ({ ...prev, [li.id]: e.target.value }));
                            if (e.target.value.length < 2) updateLine(li.id, { product_id: '', product: null });
                          }}
                          placeholder="Search product (brand, model...)"
                          className="pl-10 h-10"
                        />
                        {search.length >= 2 && !li.product_id && (
                          <div className="absolute z-20 top-full left-0 right-0 bg-card border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                            {matchedProducts.map(p => (
                              <button key={p.id} onClick={() => selectProduct(li.id, p)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between items-center">
                                <span className="font-medium">{p.brand} {p.model} <span className="text-muted-foreground">{p.variant} · {p.color}</span></span>
                                <span className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</span>
                              </button>
                            ))}
                            {matchedProducts.length === 0 && (
                              <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                                No products found
                                <Button size="sm" variant="link" className="ml-2 text-primary" onClick={() => { setNewLineIndex(idx); setShowNewProduct(true); }}>
                                  + Create New
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {li.product && (
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1 block">Cost Price (₹)</label>
                            <Input
                              type="number"
                              value={li.unit_price || ''}
                              onChange={e => updateLine(li.id, { unit_price: parseFloat(e.target.value) || 0 })}
                              className="h-10"
                              placeholder="Purchase price"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1 block">Selling Price (₹)</label>
                            <Input
                              type="number"
                              value={li.sale_price || ''}
                              onChange={e => updateLine(li.id, { sale_price: parseFloat(e.target.value) || 0 })}
                              className="h-10"
                              placeholder="Sale price"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1 block">HSN Code</label>
                            <Input
                              value={li.hsn_code}
                              onChange={e => updateLine(li.id, { hsn_code: e.target.value })}
                              placeholder={li.product.hsn_code || 'HSN'}
                              className="h-10 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1 block">IMEIs Scanned</label>
                            <div className="h-10 flex items-center px-3 rounded-md border bg-accent/50 text-sm font-display font-bold">
                              <ScanLine className="w-4 h-4 mr-2 text-primary" />{imeiCount} unit{imeiCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {li.unit_price > 0 && li.sale_price > 0 && (
                            <div className="col-span-4 flex items-center gap-4 text-xs px-1">
                              <span className="text-muted-foreground">Margin per unit:</span>
                              <span className="font-display font-bold text-success">
                                {fmt(li.sale_price - li.unit_price)} ({((li.sale_price - li.unit_price) / li.unit_price * 100).toFixed(1)}%)
                              </span>
                              {imeiCount > 0 && (
                                <span className="text-muted-foreground ml-auto">
                                  Total: <span className="font-bold text-foreground">{fmt(li.unit_price * imeiCount)}</span> cost · <span className="font-bold text-foreground">{fmt(li.sale_price * imeiCount)}</span> sale
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {li.product && (
                        <BulkIMEIScanner
                          imeis={li.imeis}
                          onChange={val => updateLine(li.id, { imeis: val })}
                          unitPrice={li.unit_price}
                          imeiCount={imeiCount}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary & Save */}
          {lineItems.length > 0 && (
            <div className="bg-card rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-sm">Purchase Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-accent/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground font-display">Products</p>
                  <p className="font-display font-bold text-lg">{lineItems.filter(l => l.product_id).length}</p>
                </div>
                <div className="bg-accent/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground font-display">Total Units</p>
                  <p className="font-display font-bold text-lg">{totalItems}</p>
                </div>
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground font-display">Total Value</p>
                  <p className="font-display font-bold text-lg text-primary">{fmt(totalValue)}</p>
                </div>
              </div>
              {selectedDealer && (
                <div className="text-xs text-muted-foreground mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <IndianRupee className="w-3.5 h-3.5 inline mr-1" />
                  Dealer balance will update: {fmt(Number(selectedDealer.total_credit))} → <span className="font-bold text-foreground">{fmt(Number(selectedDealer.total_credit) + totalValue)}</span>
                </div>
              )}
              <Button onClick={handleSave} disabled={saving || !selectedDealerId} size="lg" className="w-full h-12 font-display font-bold text-base gradient-primary border-0 text-primary-foreground">
                {saving ? 'Saving...' : `Save Purchase — ${totalItems} units, ${fmt(totalValue)}`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Purchase History ─────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search purchases..."
                className="pl-10"
              />
            </div>
            <select
              value={historyDealerFilter}
              onChange={e => setHistoryDealerFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Dealers</option>
              {dealers.map(d => (
                <option key={d.id} value={d.id}>{d.brand_name ? `${d.brand_name} — ` : ''}{d.dealer_name}</option>
              ))}
            </select>
          </div>

          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-accent/50 text-muted-foreground text-xs font-display uppercase">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Dealer</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Balance After</th>
                  <th className="p-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistory.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No purchase history found</td></tr>
                ) : filteredHistory.map(txn => {
                  const dealer = (txn as any).dealers as Dealer | undefined;
                  const isExpanded = expandedPurchaseId === txn.id;
                  return (
                    <React.Fragment key={txn.id}>
                      <tr className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => togglePurchase(txn.id, txn.dealer_id)}>
                        <td className="p-3 text-xs whitespace-nowrap">
                          <Calendar className="w-3 h-3 inline mr-1 text-muted-foreground" />
                          {new Date(txn.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <br />
                          <span className="text-muted-foreground">{new Date(txn.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{dealer?.dealer_name || '—'}</div>
                          {dealer?.brand_name && <div className="text-xs text-muted-foreground">{dealer.brand_name}</div>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[300px] truncate">{txn.description}</td>
                        <td className="p-3 text-right font-display font-bold text-destructive">{fmt(Number(txn.amount))}</td>
                        <td className="p-3 text-right font-mono text-xs">{fmt(Number(txn.running_balance))}</td>
                        <td className="p-3 text-center">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-accent/20 px-6 py-3">
                            <p className="text-xs font-display font-semibold text-muted-foreground mb-2">IMEI Records from this purchase:</p>
                            {expandedImeis.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No IMEI records found for this time window</p>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {expandedImeis.map((rec, i) => (
                                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-card rounded-lg border text-xs">
                                    <ScanLine className="w-3 h-3 text-primary flex-shrink-0" />
                                    <span className="font-mono">{rec.imei}</span>
                                    {rec.products && <span className="text-muted-foreground truncate">— {(rec.products as any).brand} {(rec.products as any).model}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      <Modal open={showNewProduct} onClose={() => setShowNewProduct(false)} title="Create New Product" subtitle="Add a new product to inventory">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Brand *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={newProductForm.brand} onChange={e => setNewProductForm(f => ({ ...f, brand: e.target.value }))} placeholder="Samsung" className="pl-10 h-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Model *</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={newProductForm.model} onChange={e => setNewProductForm(f => ({ ...f, model: e.target.value }))} placeholder="Galaxy A15" className="pl-10 h-10" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Variant (RAM/Storage)</label>
              <div className="relative">
                <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={newProductForm.variant} onChange={e => setNewProductForm(f => ({ ...f, variant: e.target.value }))} placeholder="6/128" className="pl-10 h-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Color</label>
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={newProductForm.color} onChange={e => setNewProductForm(f => ({ ...f, color: e.target.value }))} placeholder="Black" className="pl-10 h-10" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Sale Price</label>
              <Input type="number" value={newProductForm.sale_price || ''} onChange={e => setNewProductForm(f => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">GST %</label>
              <Input type="number" value={newProductForm.gst_percent} onChange={e => setNewProductForm(f => ({ ...f, gst_percent: parseFloat(e.target.value) || 0 }))} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">HSN Code</label>
              <Input value={newProductForm.hsn_code} onChange={e => setNewProductForm(f => ({ ...f, hsn_code: e.target.value }))} placeholder="8517" className="h-10 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
            <select value={newProductForm.category} onChange={e => setNewProductForm(f => ({ ...f, category: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="mobile">Mobile</option>
              <option value="accessory">Accessory</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Button onClick={handleCreateProduct} className="w-full h-11 mt-2 font-display font-bold gradient-primary border-0 text-primary-foreground">
            Create Product
          </Button>
        </div>
      </Modal>
    </div>
  );
};
