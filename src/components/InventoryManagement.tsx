import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package, Upload } from 'lucide-react';
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
  const [tab, setTab] = useState<'products' | 'imei' | 'bulk'>('products');
  const [bulkData, setBulkData] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<'sale_price' | 'purchase_price' | 'gst_percent'>('sale_price');
  const [bulkValue, setBulkValue] = useState('');

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

  const handleSaveProduct = async () => {
    if (!form.brand || !form.model || !activeShopId) { toast.error('Brand and Model are required'); return; }
    if (editingId) {
      await supabase.from('products').update({ ...form, purchase_price: form.purchase_price, sale_price: form.sale_price, gst_percent: form.gst_percent }).eq('id', editingId);
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

    // Update stock count
    await supabase.from('products').update({
      stock_quantity: (products.find(p => p.id === productId)?.stock_quantity || 0) + 1,
    }).eq('id', productId);

    setNewIMEI('');
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

  return (
    <div className="p-4 max-w-6xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          {(['products', 'imei', 'bulk'] as const).map(t => (
            <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)}>
              {t === 'products' ? <><Package className="w-4 h-4 mr-1" /> Products</> : t === 'imei' ? 'IMEI Records' : <><Upload className="w-4 h-4 mr-1" /> Bulk Update</>}
            </Button>
          ))}
        </div>
      </div>

      {tab === 'products' && (
        <>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search products..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyProduct); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
              <div className="bg-card rounded-xl p-6 shadow-2xl w-[500px]">
                <h2 className="font-display font-bold text-lg mb-4">{editingId ? 'Edit Product' : 'Add Product'}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['brand', 'Brand *'], ['model', 'Model *'], ['variant', 'Variant (RAM/Storage)'], ['color', 'Color'],
                  ].map(([f, l]) => (
                    <div key={f}>
                      <label className="text-xs text-muted-foreground mb-1 block">{l}</label>
                      <Input value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} placeholder={f === 'variant' ? '6GB/128GB' : ''} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Purchase Price</label>
                    <Input type="number" value={form.purchase_price || ''} onChange={e => setForm({...form, purchase_price: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Sale Price</label>
                    <Input type="number" value={form.sale_price || ''} onChange={e => setForm({...form, sale_price: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">GST %</label>
                    <Input type="number" value={form.gst_percent} onChange={e => setForm({...form, gst_percent: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="mobile">Mobile</option>
                      <option value="accessory">Accessory</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
                  <Button onClick={handleSaveProduct}>{editingId ? 'Update' : 'Add'}</Button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left font-display text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3 text-right">Purchase</th>
                  <th className="px-4 py-3 text-right">Sale</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3">Add IMEI</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const stock = getStockCount(p.id);
                  return (
                    <tr key={p.id} className="border-t hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <div className="font-medium font-display">{p.brand} {p.model}</div>
                        <div className="text-xs text-muted-foreground">{p.color}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.variant}</td>
                      <td className="px-4 py-3 text-right price-text">₹{Number(p.purchase_price).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right price-text">₹{Number(p.sale_price).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          stock === 0 ? 'bg-destructive/10 text-destructive' : stock <= 3 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        }`}>
                          {stock === 0 && <AlertTriangle className="w-3 h-3" />}{stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <input placeholder="15-digit IMEI" value={newIMEI}
                            onChange={e => setNewIMEI(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddIMEI(p.id); }}
                            className="w-36 h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddIMEI(p.id)}>+</Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(p)} className="text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'imei' && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left font-display text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">IMEI</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3">Sold</th>
              </tr>
            </thead>
            <tbody>
              {imeis.map(r => {
                const product = r.products as unknown as Product | undefined;
                return (
                  <tr key={r.id} className="border-t hover:bg-accent/50">
                    <td className="px-4 py-2 imei-text text-xs">{r.imei}</td>
                    <td className="px-4 py-2">{product ? `${product.brand} ${product.model}` : 'Unknown'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'in_stock' ? 'bg-success/10 text-success' :
                        r.status === 'sold' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning'
                      }`}>{r.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.purchase_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.sold_date ? new Date(r.sold_date).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                );
              })}
              {imeis.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No IMEI records.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bulk' && (
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="font-display font-bold text-lg">Bulk Update Products</h2>
          <p className="text-sm text-muted-foreground">Select products and update a field in bulk.</p>
          
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Field</label>
              <select value={bulkField} onChange={e => setBulkField(e.target.value as any)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none">
                <option value="sale_price">Sale Price</option>
                <option value="purchase_price">Purchase Price</option>
                <option value="gst_percent">GST %</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">New Value</label>
              <Input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="w-32" />
            </div>
            <Button onClick={handleBulkUpdate} disabled={selectedProducts.size === 0}>
              Update {selectedProducts.size} products
            </Button>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto">
            {products.map(p => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <input type="checkbox" checked={selectedProducts.has(p.id)}
                  onChange={e => {
                    const next = new Set(selectedProducts);
                    e.target.checked ? next.add(p.id) : next.delete(p.id);
                    setSelectedProducts(next);
                  }}
                  className="rounded border-input" />
                <span className="font-display font-medium text-sm">{p.brand} {p.model}</span>
                <span className="text-xs text-muted-foreground">{p.variant}</span>
                <span className="ml-auto text-sm price-text">₹{Number(p.sale_price).toLocaleString('en-IN')}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
