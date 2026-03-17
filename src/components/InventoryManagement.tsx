import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package, Upload, ScanLine, Filter, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type IMEIRecord = Database['public']['Tables']['imei_records']['Row'];

const emptyProduct = { brand: '', model: '', variant: '', color: '', purchase_price: 0, sale_price: 0, gst_percent: 18, category: 'mobile' };

export const InventoryManagement: React.FC = () => {
  const { activeShopId } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [imeis, setImeis] = useState<(IMEIRecord & { products?: Product })[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [newIMEI, setNewIMEI] = useState('');
  const [addingIMEIFor, setAddingIMEIFor] = useState<string | null>(null);
  const [tab, setTab] = useState<'products' | 'imei' | 'bulk'>('products');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<'sale_price' | 'purchase_price' | 'gst_percent'>('sale_price');
  const [bulkValue, setBulkValue] = useState('');
  const [imeiFilter, setImeiFilter] = useState<'all' | 'in_stock' | 'sold'>('all');

  const fetchProducts = async () => {
    if (!activeShopId) return;
    const { data } = await supabase.from('products').select('*').eq('shop_id', activeShopId).order('brand');
    if (data) setProducts(data);
  };

  const fetchIMEIs = async () => {
    if (!activeShopId) return;
    const { data } = await supabase.from('imei_records').select('*, products(*)').eq('shop_id', activeShopId).order('created_at', { ascending: false });
    if (data) setImeis(data as any);
  };

  useEffect(() => { fetchProducts(); fetchIMEIs(); }, [activeShopId]);

  const filteredProducts = products.filter(p =>
    !searchQ || `${p.brand} ${p.model} ${p.variant} ${p.color}`.toLowerCase().includes(searchQ.toLowerCase())
  );

  const filteredIMEIs = imeis.filter(r => imeiFilter === 'all' || r.status === imeiFilter);

  const handleSaveProduct = async () => {
    if (!form.brand || !form.model || !activeShopId) { toast.error('Brand and Model are required'); return; }
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
    await supabase.from('products').delete().eq('id', id);
    toast.success('Product deleted');
    fetchProducts();
  };

  const handleEdit = (p: Product) => {
    setForm({ brand: p.brand, model: p.model, variant: p.variant, color: p.color, purchase_price: Number(p.purchase_price), sale_price: Number(p.sale_price), gst_percent: Number(p.gst_percent), category: p.category });
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
  const lowStockProducts = products.filter(p => getStockCount(p.id) <= p.low_stock_threshold);

  return (
    <div className="p-6 max-w-7xl mx-auto overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {products.length} products · {imeis.filter(r => r.status === 'in_stock').length} units in stock
          </p>
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          {([['products', Package, 'Products'], ['imei', ScanLine, 'IMEI Records'], ['bulk', Upload, 'Bulk Update']] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
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

      {tab === 'products' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search products..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
            </div>
            <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyProduct); }} className="gradient-primary border-0 text-primary-foreground">
              <Plus className="w-4 h-4 mr-1.5" /> Add Product
            </Button>
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
              <div className="bg-card rounded-2xl p-6 shadow-2xl w-[520px] animate-scale-in border">
                <h2 className="font-display font-bold text-lg mb-5">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[['brand', 'Brand *'], ['model', 'Model *'], ['variant', 'Variant (RAM/Storage)'], ['color', 'Color']].map(([f, l]) => (
                    <div key={f}>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{l}</label>
                      <Input value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} placeholder={f === 'variant' ? '6GB/128GB' : ''} className="h-10" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Purchase Price (₹)</label>
                    <Input type="number" value={form.purchase_price || ''} onChange={e => setForm({...form, purchase_price: Number(e.target.value)})} className="h-10" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sale Price (₹)</label>
                    <Input type="number" value={form.sale_price || ''} onChange={e => setForm({...form, sale_price: Number(e.target.value)})} className="h-10" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">GST %</label>
                    <Input type="number" value={form.gst_percent} onChange={e => setForm({...form, gst_percent: Number(e.target.value)})} className="h-10" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                      <option value="mobile">Mobile</option>
                      <option value="accessory">Accessory</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
                  <Button onClick={handleSaveProduct} className="gradient-primary border-0 text-primary-foreground">{editingId ? 'Update' : 'Add Product'}</Button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3 text-right">Purchase</th>
                  <th className="px-4 py-3 text-right">Sale</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">IMEI</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const stock = getStockCount(p.id);
                  const isLow = stock <= p.low_stock_threshold;
                  return (
                    <tr key={p.id} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-display font-semibold">{p.brand} {p.model}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.color} · GST {Number(p.gst_percent)}%</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.variant}</td>
                      <td className="px-4 py-3 text-right price-text text-xs">₹{Number(p.purchase_price).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right price-text text-sm">₹{Number(p.sale_price).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-bold ${
                          stock === 0 ? 'bg-destructive/10 text-destructive' : isLow ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        }`}>
                          {stock === 0 && <AlertTriangle className="w-3 h-3" />}{stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {addingIMEIFor === p.id ? (
                          <div className="flex gap-1 justify-center">
                            <input placeholder="15-digit IMEI" value={newIMEI}
                              onChange={e => setNewIMEI(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddIMEI(p.id); if (e.key === 'Escape') setAddingIMEIFor(null); }}
                              className="w-36 h-7 px-2 text-xs rounded-md border border-input bg-card focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                              autoFocus />
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleAddIMEI(p.id)}>Add</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingIMEIFor(p.id)}>
                            <Plus className="w-3 h-3 mr-1" />IMEI
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleEdit(p)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-display font-medium">No products found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'imei' && (
        <>
          <div className="flex gap-2 mb-4">
            {(['all', 'in_stock', 'sold'] as const).map(f => (
              <button key={f} onClick={() => setImeiFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all ${imeiFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                {f === 'all' ? `All (${imeis.length})` : f === 'in_stock' ? `In Stock (${imeis.filter(r => r.status === 'in_stock').length})` : `Sold (${imeis.filter(r => r.status === 'sold').length})`}
              </button>
            ))}
          </div>
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left font-display text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">IMEI</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Purchase Price</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3">Sold</th>
                </tr>
              </thead>
              <tbody>
                {filteredIMEIs.map(r => {
                  const product = r.products as unknown as Product | undefined;
                  return (
                    <tr key={r.id} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold">{r.imei}</td>
                      <td className="px-4 py-2.5 font-display text-sm">{product ? `${product.brand} ${product.model}` : 'Unknown'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-display font-bold ${
                          r.status === 'in_stock' ? 'bg-success/10 text-success' :
                          r.status === 'sold' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning'
                        }`}>{r.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-2.5 price-text text-xs">₹{Number(r.purchase_price).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(r.purchase_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.sold_date ? new Date(r.sold_date).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  );
                })}
                {filteredIMEIs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-display font-medium">No IMEI records</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'bulk' && (
        <div className="bg-card rounded-xl border p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="font-display font-bold text-lg">Bulk Update</h2>
            <p className="text-sm text-muted-foreground mt-1">Select products below and update a field for all selected items at once.</p>
          </div>
          
          <div className="flex gap-3 items-end p-4 rounded-xl bg-accent/50">
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
              <label key={p.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all ${selectedProducts.has(p.id) ? 'bg-accent' : 'hover:bg-secondary'}`}>
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
