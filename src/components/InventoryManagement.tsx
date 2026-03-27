import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package, Upload, ScanLine, Filter, X, BoxIcon, Smartphone, Cpu, HardDrive, Palette, IndianRupee, Tag, BarChart3, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type IMEIRecord = Database['public']['Tables']['imei_records']['Row'];

const emptyProduct = { brand: '', model: '', variant: '', color: '', purchase_price: 0, sale_price: 0, gst_percent: 18, category: 'mobile', hsn_code: '' };

export const InventoryManagement: React.FC = () => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [imeis, setImeis] = useState<(IMEIRecord & { products?: Product })[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [newIMEI, setNewIMEI] = useState('');
  const [addingIMEIFor, setAddingIMEIFor] = useState<string | null>(null);
  const [tab, setTab] = useState<'products' | 'imei' | 'bulk'>('products');
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [expandedImeiBrand, setExpandedImeiBrand] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<'sale_price' | 'purchase_price' | 'gst_percent'>('sale_price');
  const [bulkValue, setBulkValue] = useState('');
  const [imeiFilter, setImeiFilter] = useState<'all' | 'in_stock' | 'sold'>('all');

  const fetchProducts = async () => {
    if (!activeShopId && !isAllShops) return;
    let query = supabase.from('products').select('*');
    if (isAllShops) query = query.in('shop_id', allShopIds);
    else query = query.eq('shop_id', activeShopId!);
    const { data } = await query.order('brand');
    if (data) setProducts(data);
  };

  const fetchIMEIs = async () => {
    if (!activeShopId && !isAllShops) return;
    let query = supabase.from('imei_records').select('*, products(*)');
    if (isAllShops) query = query.in('shop_id', allShopIds);
    else query = query.eq('shop_id', activeShopId!);
    const { data } = await query.order('created_at', { ascending: false });
    if (data) setImeis(data as any);
  };

  useEffect(() => { fetchProducts(); fetchIMEIs(); }, [activeShopId]);

  const filteredProducts = products.filter(p =>
    !searchQ || `${p.brand} ${p.model} ${p.variant} ${p.color}`.toLowerCase().includes(searchQ.toLowerCase())
  );

  const [imeiSearchQ, setImeiSearchQ] = useState('');

  const filteredIMEIs = imeis.filter(r => {
    const statusMatch = imeiFilter === 'all' || r.status === imeiFilter;
    if (!statusMatch) return false;
    if (!imeiSearchQ) return true;
    const product = r.products as unknown as Product | undefined;
    const searchStr = `${r.imei} ${product ? `${product.brand} ${product.model} ${product.variant} ${product.color}` : ''}`.toLowerCase();
    return searchStr.includes(imeiSearchQ.toLowerCase());
  });

  // Detect duplicate IMEIs
  const imeiCountMap = new Map<string, number>();
  imeis.forEach(r => imeiCountMap.set(r.imei, (imeiCountMap.get(r.imei) || 0) + 1));
  const duplicateIMEIs = filteredIMEIs.filter(r => (imeiCountMap.get(r.imei) || 0) > 1);

  const handleDeleteIMEI = async (record: IMEIRecord & { products?: Product }) => {
    if (!confirm(`Delete IMEI record ${record.imei}?`)) return;
    const { error } = await supabase.from('imei_records').delete().eq('id', record.id);
    if (error) { toast.error(error.message); return; }
    if (record.status === 'in_stock') {
      await supabase.from('products').update({
        stock_quantity: Math.max(0, (products.find(p => p.id === record.product_id)?.stock_quantity || 1) - 1),
      }).eq('id', record.product_id);
      fetchProducts();
    }
    toast.success('IMEI record removed');
    fetchIMEIs();
  };


  const handleSaveProduct = async () => {
    if (!form.brand || !form.model || !activeShopId) { toast.error('Brand and Model are required'); return; }
    
    // Check if product already exists (auto-increase qty logic)
    if (!editingId) {
      const existing = products.find(p => 
        p.brand.toLowerCase() === form.brand.toLowerCase() && 
        p.model.toLowerCase() === form.model.toLowerCase() && 
        p.variant.toLowerCase() === (form.variant || '').toLowerCase() &&
        p.color.toLowerCase() === (form.color || '').toLowerCase()
      );
      if (existing) {
        toast.info(`Product already exists: ${existing.brand} ${existing.model}. Use Dealer Ledger → Purchase Stock to add units.`);
        setShowForm(false);
        return;
      }
    }

    if (editingId) {
      await supabase.from('products').update({ ...form }).eq('id', editingId);
      toast.success('Product updated');
    } else {
      await supabase.from('products').insert({ ...form, shop_id: activeShopId, stock_quantity: 0 });
      toast.success('Product added');
    }
    setShowForm(false); setEditingId(null); setForm(emptyProduct);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? Related IMEI records will also be removed.')) return;
    // Delete related records first to avoid foreign key constraint errors
    await supabase.from('invoice_items').delete().eq('product_id', id);
    await supabase.from('imei_records').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
      return;
    }
    toast.success('Product deleted');
    fetchProducts();
  };

  const handleEdit = (p: Product) => {
    setForm({ brand: p.brand, model: p.model, variant: p.variant, color: p.color, purchase_price: Number(p.purchase_price), sale_price: Number(p.sale_price), gst_percent: Number(p.gst_percent), category: p.category, hsn_code: (p as any).hsn_code || '' });
    setEditingId(p.id); setShowForm(true);
  };

  const handleAddIMEI = async (productId: string) => {
    const imei = newIMEI.trim();
    if (!imei || !activeShopId) return;
    if (imei.length !== 15 || !/^\d+$/.test(imei)) { toast.error('IMEI must be 15 digits'); return; }

    const { error } = await supabase.from('imei_records').insert({
      imei, product_id: productId, shop_id: activeShopId, status: 'in_stock',
      purchase_price: products.find(p => p.id === productId)?.purchase_price || 0,
    });

    if (error) {
      if (error.code === '23505') toast.error('Duplicate IMEI!');
      else toast.error(error.message);
      return;
    }

    await supabase.from('products').update({
      stock_quantity: (products.find(p => p.id === productId)?.stock_quantity || 0) + 1,
    }).eq('id', productId);

    setNewIMEI('');
    setAddingIMEIFor(null);
    toast.success('IMEI added to inventory');
    fetchProducts(); fetchIMEIs();
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.size === 0 || !bulkValue) { toast.error('Select products and enter a value'); return; }
    const val = Number(bulkValue);
    for (const id of selectedProducts) {
      await supabase.from('products').update({ [bulkField]: val }).eq('id', id);
    }
    toast.success(`Updated ${selectedProducts.size} products`);
    setSelectedProducts(new Set()); setBulkValue('');
    fetchProducts();
  };

  const getStockCount = (productId: string) => imeis.filter(r => r.product_id === productId && r.status === 'in_stock').length;
  const getProductIMEIs = (productId: string) => imeis.filter(r => r.product_id === productId && r.status === 'in_stock');
  const lowStockProducts = products.filter(p => getStockCount(p.id) <= p.low_stock_threshold);
  const totalStockValue = products.reduce((s, p) => s + Number(p.purchase_price) * getStockCount(p.id), 0);

  // Brand grouping
  const brandGroups = useMemo(() => {
    const groups = new Map<string, Product[]>();
    filteredProducts.forEach(p => {
      const brand = p.brand || 'Other';
      if (!groups.has(brand)) groups.set(brand, []);
      groups.get(brand)!.push(p);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredProducts]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto overflow-y-auto h-full">
      {/* Header with stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Inventory Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage products, stock entries, and IMEI records</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Products</span>
            </div>
            <p className="font-display text-xl font-extrabold">{products.length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <ScanLine className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">In Stock</span>
            </div>
            <p className="font-display text-xl font-extrabold">{imeis.filter(r => r.status === 'in_stock').length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Low Stock</span>
            </div>
            <p className="font-display text-xl font-extrabold text-warning">{lowStockProducts.length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Stock Value</span>
            </div>
            <p className="font-display text-lg font-extrabold">₹{totalStockValue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-secondary rounded-xl p-1 gap-0.5">
          {([
            ['products', Package, 'Products'],
            ['imei', ScanLine, 'IMEI Records'],
            ['bulk', Upload, 'Bulk Update'],
          ] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all ${
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && tab === 'products' && (
        <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-3 animate-in">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <div>
            <p className="text-sm font-display font-semibold text-warning">Low Stock Alert</p>
            <p className="text-xs text-muted-foreground">{lowStockProducts.map(p => `${p.brand} ${p.model}`).join(', ')}</p>
          </div>
        </div>
      )}

      {/* ============ PRODUCTS TAB ============ */}
      {tab === 'products' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search by brand, model, variant..."
                className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-input bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all" />
            </div>
          </div>

          {/* Brand-Grouped Products with inline IMEIs */}
          <div className="space-y-3">
            {brandGroups.map(([brand, brandProducts]) => {
              const brandStock = brandProducts.reduce((s, p) => s + getStockCount(p.id), 0);
              const isExpanded = expandedBrand === brand;
              return (
                <div key={brand} className="bg-card rounded-xl border overflow-hidden shadow-sm">
                  {/* Brand Header */}
                  <button onClick={() => setExpandedBrand(isExpanded ? null : brand)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-display font-bold text-base">{brand}</span>
                      <span className="text-xs text-muted-foreground">({brandProducts.length} models)</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display font-bold ${
                      brandStock === 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                    }`}>
                      {brandStock} units
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t">
                      {brandProducts.map(p => {
                        const stock = getStockCount(p.id);
                        const isLow = stock <= p.low_stock_threshold;
                        const productImeis = getProductIMEIs(p.id);
                        return (
                          <div key={p.id} className="border-b border-border/30 last:border-b-0">
                            {/* Product row */}
                            <div className="flex items-center gap-4 px-4 py-3 hover:bg-accent/20 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="font-display font-semibold">{p.model}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {p.variant && <span>{p.variant} · </span>}
                                  {p.color && <span>{p.color} · </span>}
                                  GST {Number(p.gst_percent)}%
                                  {(p as any).hsn_code ? ` · HSN: ${(p as any).hsn_code}` : ''}
                                  {' · '}{p.category}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Purchase</div>
                                <div className="price-text text-xs">₹{Number(p.purchase_price).toLocaleString('en-IN')}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Sale</div>
                                <div className="price-text text-sm font-semibold">₹{Number(p.sale_price).toLocaleString('en-IN')}</div>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-bold ${
                                stock === 0 ? 'bg-destructive/10 text-destructive' : isLow ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                              }`}>
                                {stock === 0 && <AlertTriangle className="w-3 h-3" />}{stock} units
                              </span>
                            </div>
                            {/* Always-visible IMEI list */}
                            {productImeis.length > 0 && (
                              <div className="bg-accent/15 border-t border-border/20">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left font-display text-[10px] text-muted-foreground uppercase tracking-wider">
                                      <th className="px-6 py-1.5 pl-8">IMEI</th>
                                      <th className="px-4 py-1.5 text-right">Cost</th>
                                      <th className="px-4 py-1.5 text-right">Sale Price</th>
                                      <th className="px-4 py-1.5 text-right">Margin</th>
                                      <th className="px-4 py-1.5">Purchased</th>
                                      <th className="px-4 py-1.5 w-10"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productImeis.map(r => (
                                      <tr key={r.id} className="border-t border-border/10 hover:bg-accent/30 transition-colors">
                                        <td className="px-6 py-1.5 pl-8 font-mono font-semibold">{r.imei}</td>
                                        <td className="px-4 py-1.5 text-right price-text">₹{Number(r.purchase_price).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-1.5 text-right price-text">₹{Number(r.sale_price).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-1.5 text-right">
                                          <span className={Number(r.sale_price) - Number(r.purchase_price) >= 0 ? 'text-success' : 'text-destructive'}>
                                            ₹{(Number(r.sale_price) - Number(r.purchase_price)).toLocaleString('en-IN')}
                                          </span>
                                        </td>
                                        <td className="px-4 py-1.5 text-muted-foreground">{new Date(r.purchase_date).toLocaleDateString('en-IN')}</td>
                                        <td className="px-4 py-1.5">
                                          <button onClick={() => handleDeleteIMEI(r)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {brandGroups.length === 0 && (
              <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-display font-medium">No products found</p>
                <p className="text-xs mt-1">Add products via Dealer Ledger → Purchase Stock</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ IMEI TAB ============ */}
      {tab === 'imei' && (
        <>
          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={imeiSearchQ} onChange={e => setImeiSearchQ(e.target.value)} placeholder="Search by IMEI, brand, model..."
                className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-input bg-card text-sm font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all" />
            </div>
            <div className="flex gap-2">
              {(['all', 'in_stock', 'sold'] as const).map(f => (
                <button key={f} onClick={() => setImeiFilter(f)}
                  className={`px-4 py-2 rounded-lg text-xs font-display font-semibold transition-all ${imeiFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {f === 'all' ? `All (${imeis.length})` : f === 'in_stock' ? `In Stock (${imeis.filter(r => r.status === 'in_stock').length})` : `Sold (${imeis.filter(r => r.status === 'sold').length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Duplicate warning */}
          {duplicateIMEIs.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 animate-in">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-display font-semibold text-destructive">Duplicate IMEIs Detected ({new Set(duplicateIMEIs.map(r => r.imei)).size})</p>
                <p className="text-xs text-muted-foreground">Use the delete button to remove duplicate entries</p>
              </div>
            </div>
          )}

          {/* Brand-grouped IMEI records */}
          <div className="space-y-3">
            {(() => {
              const brandMap = new Map<string, typeof filteredIMEIs>();
              filteredIMEIs.forEach(r => {
                const product = r.products as unknown as Product | undefined;
                const brand = product?.brand || 'Unknown';
                if (!brandMap.has(brand)) brandMap.set(brand, []);
                brandMap.get(brand)!.push(r);
              });
              const brandEntries = Array.from(brandMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

              if (brandEntries.length === 0) {
                return (
                  <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
                    <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-display font-medium">No IMEI records</p>
                  </div>
                );
              }

              return brandEntries.map(([brand, brandImeis]) => {
                const isExp = expandedImeiBrand === brand;
                const inStockCount = brandImeis.filter(r => r.status === 'in_stock').length;
                return (
                  <div key={brand} className="bg-card rounded-xl border overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedImeiBrand(isExp ? null : brand)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExp ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-display font-bold text-base">{brand}</span>
                        <span className="text-xs text-muted-foreground">({brandImeis.length} records)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-display font-bold bg-success/10 text-success">{inStockCount} in stock</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-display font-bold bg-muted text-muted-foreground">{brandImeis.length - inStockCount} sold/returned</span>
                      </div>
                    </button>
                    {isExp && (
                      <div className="border-t">
                        <table className="w-full text-sm">
                          <thead className="bg-secondary/40">
                            <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                              <th className="px-4 py-2">IMEI</th>
                              <th className="px-4 py-2">Model</th>
                              <th className="px-4 py-2">Status</th>
                              <th className="px-4 py-2 text-right">Cost</th>
                              <th className="px-4 py-2 text-right">Sale Price</th>
                              <th className="px-4 py-2 text-right">Margin</th>
                              <th className="px-4 py-2">Added</th>
                              <th className="px-4 py-2">Sold</th>
                              <th className="px-4 py-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {brandImeis.map(r => {
                              const product = r.products as unknown as Product | undefined;
                              const isDuplicate = (imeiCountMap.get(r.imei) || 0) > 1;
                              const margin = Number(r.sale_price) - Number(r.purchase_price);
                              return (
                                <tr key={r.id} className={`border-t border-border/50 hover:bg-accent/30 transition-colors ${isDuplicate ? 'bg-destructive/5' : ''}`}>
                                  <td className="px-4 py-2 font-mono text-xs font-semibold">
                                    <span className="flex items-center gap-1.5">
                                      {r.imei}
                                      {isDuplicate && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-display font-bold">DUP</span>}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-display text-xs">{product?.model || '—'}</td>
                                  <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
                                      r.status === 'in_stock' ? 'bg-success/10 text-success' :
                                      r.status === 'sold' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning'
                                    }`}>{r.status.replace('_', ' ')}</span>
                                  </td>
                                  <td className="px-4 py-2 text-right price-text text-xs">₹{Number(r.purchase_price).toLocaleString('en-IN')}</td>
                                  <td className="px-4 py-2 text-right price-text text-xs">₹{Number(r.sale_price).toLocaleString('en-IN')}</td>
                                  <td className="px-4 py-2 text-right text-xs">
                                    <span className={margin >= 0 ? 'text-success' : 'text-destructive'}>₹{margin.toLocaleString('en-IN')}</span>
                                  </td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.purchase_date).toLocaleDateString('en-IN')}</td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.sold_date ? new Date(r.sold_date).toLocaleDateString('en-IN') : '—'}</td>
                                  <td className="px-4 py-2">
                                    <button onClick={() => handleDeleteIMEI(r)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}

      {/* ============ BULK TAB ============ */}
      {tab === 'bulk' && (
        <div className="bg-card rounded-2xl border p-6 space-y-5 shadow-sm animate-in">
          <div>
            <h2 className="font-display font-bold text-lg">Bulk Update</h2>
            <p className="text-sm text-muted-foreground mt-1">Select products and update a field for all at once.</p>
          </div>
          
          <div className="flex gap-3 items-end p-4 rounded-xl bg-accent/50 border">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Field</label>
              <select value={bulkField} onChange={e => setBulkField(e.target.value as any)}
                className="h-10 px-3 rounded-lg border border-input bg-card text-sm font-display focus:outline-none focus:ring-2 focus:ring-ring/20">
                <option value="sale_price">Sale Price</option>
                <option value="purchase_price">Purchase Price</option>
                <option value="gst_percent">GST %</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Value</label>
              <Input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="w-32 h-10" placeholder="Enter value" />
            </div>
            <Button onClick={handleBulkUpdate} disabled={selectedProducts.size === 0} className="gradient-primary border-0 text-primary-foreground">
              Update {selectedProducts.size} products
            </Button>
            {selectedProducts.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedProducts(new Set())}>Clear</Button>
            )}
          </div>

          <div className="flex gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedProducts(new Set(products.map(p => p.id)))}>Select All</Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedProducts(new Set())}>Deselect All</Button>
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto pos-scrollable">
            {products.map(p => (
              <label key={p.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all ${selectedProducts.has(p.id) ? 'bg-accent border border-primary/20' : 'hover:bg-secondary border border-transparent'}`}>
                <input type="checkbox" checked={selectedProducts.has(p.id)}
                  onChange={e => {
                    const next = new Set(selectedProducts);
                    e.target.checked ? next.add(p.id) : next.delete(p.id);
                    setSelectedProducts(next);
                  }}
                  className="rounded border-input accent-primary" />
                <span className="font-display font-semibold text-sm">{p.brand} {p.model}</span>
                <span className="text-xs text-muted-foreground">{p.variant}</span>
                <span className="ml-auto price-text text-sm">₹{Number(p.sale_price).toLocaleString('en-IN')}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
