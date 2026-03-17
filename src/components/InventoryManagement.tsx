import React, { useState, useEffect } from 'react';
import { Product, IMEIRecord } from '@/types';
import { getProducts, saveProducts, getIMEIs, saveIMEIs } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

const emptyProduct: Omit<Product, 'id'> = {
  brand: '', model: '', variant: '', color: '', purchasePrice: 0, salePrice: 0, gstPercent: 18, category: 'mobile',
};

export const InventoryManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [imeis, setImeis] = useState<IMEIRecord[]>(getIMEIs());
  const [searchQ, setSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [newIMEI, setNewIMEI] = useState('');
  const [tab, setTab] = useState<'products' | 'imei'>('products');

  const filteredProducts = products.filter(p =>
    !searchQ || `${p.brand} ${p.model} ${p.variant} ${p.color}`.toLowerCase().includes(searchQ.toLowerCase())
  );

  const handleSaveProduct = () => {
    if (!form.brand || !form.model) { toast.error('Brand and Model are required'); return; }
    
    let updated: Product[];
    if (editingId) {
      updated = products.map(p => p.id === editingId ? { ...form, id: editingId } : p);
    } else {
      updated = [...products, { ...form, id: crypto.randomUUID() }];
    }
    setProducts(updated);
    saveProducts(updated);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyProduct);
    toast.success(editingId ? 'Product updated' : 'Product added');
  };

  const handleDelete = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    saveProducts(updated);
    toast.success('Product deleted');
  };

  const handleEdit = (p: Product) => {
    setForm({ brand: p.brand, model: p.model, variant: p.variant, color: p.color, purchasePrice: p.purchasePrice, salePrice: p.salePrice, gstPercent: p.gstPercent, category: p.category });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleAddIMEI = (productId: string) => {
    const imei = newIMEI.trim();
    if (!imei) return;
    if (imei.length !== 15 || !/^\d+$/.test(imei)) {
      toast.error('IMEI must be 15 digits'); return;
    }
    if (imeis.some(r => r.imei === imei)) {
      toast.error('Duplicate IMEI!'); return;
    }
    const record: IMEIRecord = {
      imei, productId, status: 'in_stock', purchaseDate: new Date().toISOString(),
    };
    const updated = [...imeis, record];
    setImeis(updated);
    saveIMEIs(updated);
    setNewIMEI('');
    toast.success('IMEI added to inventory');
  };

  const getStockCount = (productId: string) => imeis.filter(r => r.productId === productId && r.status === 'in_stock').length;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <Button variant={tab === 'products' ? 'default' : 'outline'} size="sm" onClick={() => setTab('products')}>
            <Package className="w-4 h-4 mr-1" /> Products
          </Button>
          <Button variant={tab === 'imei' ? 'default' : 'outline'} size="sm" onClick={() => setTab('imei')}>
            IMEI Records
          </Button>
        </div>
      </div>

      {tab === 'products' && (
        <>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search products..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyProduct); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </div>

          {/* Product Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
              <div className="bg-card rounded-xl p-6 shadow-2xl w-[500px]">
                <h2 className="font-display font-bold text-lg mb-4">{editingId ? 'Edit Product' : 'Add Product'}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Brand *</label>
                    <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Model *</label>
                    <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Variant (RAM/Storage)</label>
                    <input value={form.variant} onChange={e => setForm({...form, variant: e.target.value})} placeholder="6GB/128GB" className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Color</label>
                    <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Purchase Price</label>
                    <input type="number" value={form.purchasePrice || ''} onChange={e => setForm({...form, purchasePrice: Number(e.target.value)})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Sale Price</label>
                    <input type="number" value={form.salePrice || ''} onChange={e => setForm({...form, salePrice: Number(e.target.value)})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">GST %</label>
                    <input type="number" value={form.gstPercent} onChange={e => setForm({...form, gstPercent: Number(e.target.value)})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value as any})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
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

          {/* Product List */}
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
                      <td className="px-4 py-3 text-right price-text">₹{p.purchasePrice.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right price-text">₹{p.salePrice.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          stock === 0 ? 'bg-destructive/10 text-destructive' : stock <= 3 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        }`}>
                          {stock === 0 && <AlertTriangle className="w-3 h-3" />}
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <input
                            placeholder="15-digit IMEI"
                            value={newIMEI}
                            onChange={e => setNewIMEI(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddIMEI(p.id); }}
                            className="w-36 h-7 px-2 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                          />
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
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No products found. Add your first product above.</td></tr>
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
                const product = products.find(p => p.id === r.productId);
                return (
                  <tr key={r.imei} className="border-t hover:bg-accent/50">
                    <td className="px-4 py-2 imei-text text-xs">{r.imei}</td>
                    <td className="px-4 py-2">{product ? `${product.brand} ${product.model}` : 'Unknown'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'in_stock' ? 'bg-success/10 text-success' :
                        r.status === 'sold' ? 'bg-muted text-muted-foreground' :
                        'bg-warning/10 text-warning'
                      }`}>{r.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.purchaseDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.soldDate ? new Date(r.soldDate).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                );
              })}
              {imeis.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No IMEI records. Add IMEIs from the Products tab.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
