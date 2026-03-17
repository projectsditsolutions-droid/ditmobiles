import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, RotateCcw, TrendingUp, TrendingDown, Package } from 'lucide-react';
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
  const [form, setForm] = useState({ brand_name: '', dealer_name: '', phone: '', address: '', gstin: '', total_credit: 0 });
  const [txnForm, setTxnForm] = useState({ type: 'purchase' as string, amount: 0, description: '' });
  const [stockForm, setStockForm] = useState({ product_id: '', quantity: 1, unit_price: 0, imeis: '' });
  const [returnForm, setReturnForm] = useState({ imei: '', reason: '' });
  const [tab, setTab] = useState<'ledger' | 'stock'>('ledger');

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

  const handleAddTxn = async () => {
    if (!selectedDealer || txnForm.amount <= 0 || !activeShopId) return;
    const dealer = dealers.find(d => d.id === selectedDealer);
    if (!dealer) return;

    const newBalance = txnForm.type === 'purchase'
      ? Number(dealer.total_credit) + txnForm.amount
      : Number(dealer.total_credit) - txnForm.amount;

    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer, shop_id: activeShopId, type: txnForm.type,
      amount: txnForm.amount, running_balance: newBalance, description: txnForm.description,
    });
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer);

    setTxnForm({ type: 'purchase', amount: 0, description: '' });
    toast.success('Transaction recorded'); fetchDealers(); fetchTxns(selectedDealer);
  };

  const handleStockEntry = async () => {
    if (!selectedDealer || !stockForm.product_id || !activeShopId) { toast.error('Select a product'); return; }
    const dealer = dealers.find(d => d.id === selectedDealer);
    if (!dealer) return;

    const imeiList = stockForm.imeis.split('\n').map(s => s.trim()).filter(s => s.length === 15);
    const totalValue = stockForm.quantity * stockForm.unit_price;

    // Add IMEIs to inventory
    for (const imei of imeiList) {
      await supabase.from('imei_records').insert({
        imei, product_id: stockForm.product_id, shop_id: activeShopId,
        dealer_id: selectedDealer, status: 'in_stock', purchase_price: stockForm.unit_price,
      });
    }

    // Update product stock
    const product = products.find(p => p.id === stockForm.product_id);
    if (product) {
      await supabase.from('products').update({
        stock_quantity: product.stock_quantity + imeiList.length,
      }).eq('id', stockForm.product_id);
    }

    // Update dealer credit
    const newBalance = Number(dealer.total_credit) + totalValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer);

    // Record transaction
    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer, shop_id: activeShopId, type: 'purchase',
      amount: totalValue, running_balance: newBalance,
      description: `Stock entry: ${imeiList.length} units of ${product?.brand} ${product?.model} @ ₹${stockForm.unit_price}`,
    });

    setShowStockEntry(false);
    setStockForm({ product_id: '', quantity: 1, unit_price: 0, imeis: '' });
    toast.success(`${imeiList.length} units added to stock, ₹${totalValue.toLocaleString('en-IN')} added to credit`);
    fetchDealers(); fetchTxns(selectedDealer); fetchProducts();
  };

  const handleStockReturn = async () => {
    if (!selectedDealer || !returnForm.imei || !activeShopId) { toast.error('Enter IMEI'); return; }
    const dealer = dealers.find(d => d.id === selectedDealer);
    if (!dealer) return;

    // Find IMEI record
    const { data: imeiRecord } = await supabase.from('imei_records')
      .select('*, products(*)')
      .eq('imei', returnForm.imei)
      .eq('dealer_id', selectedDealer)
      .eq('status', 'in_stock')
      .maybeSingle();

    if (!imeiRecord) { toast.error('IMEI not found in stock for this dealer'); return; }

    const returnValue = Number(imeiRecord.purchase_price);

    // Mark IMEI as returned
    await supabase.from('imei_records').update({ status: 'returned' }).eq('id', imeiRecord.id);

    // Update product stock
    const product = imeiRecord.products as unknown as Product;
    if (product) {
      await supabase.from('products').update({
        stock_quantity: Math.max(0, product.stock_quantity - 1),
      }).eq('id', product.id);
    }

    // Reduce dealer credit
    const newBalance = Number(dealer.total_credit) - returnValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer);

    // Record return transaction
    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer, shop_id: activeShopId, type: 'stock_return',
      amount: returnValue, running_balance: newBalance,
      description: `Stock return: ${product?.brand} ${product?.model} (IMEI: ${returnForm.imei}) - ${returnForm.reason}`,
      imei_ref: returnForm.imei,
    });

    setShowReturnForm(false);
    setReturnForm({ imei: '', reason: '' });
    toast.success(`Stock returned, ₹${returnValue.toLocaleString('en-IN')} deducted from credit`);
    fetchDealers(); fetchTxns(selectedDealer); fetchProducts();
  };

  const selectedDealerObj = dealers.find(d => d.id === selectedDealer);

  return (
    <div className="p-4 max-w-6xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Dealer Ledger</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add Dealer</Button>
      </div>

      {/* Add Dealer Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl p-6 shadow-2xl w-[450px]">
            <h2 className="font-display font-bold text-lg mb-4">Add Dealer</h2>
            <div className="space-y-3">
              {[
                ['brand_name', 'Brand Name (e.g. Oppo, Samsung)'],
                ['dealer_name', 'Dealer Name *'],
                ['phone', 'Phone'],
                ['address', 'Address'],
                ['gstin', 'GSTIN'],
              ].map(([f, l]) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground mb-1 block">{l}</label>
                  <Input value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Initial Credit (₹)</label>
                <Input type="number" value={form.total_credit || ''} onChange={e => setForm({...form, total_credit: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleAddDealer}>Add Dealer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Entry Modal */}
      {showStockEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl p-6 shadow-2xl w-[500px]">
            <h2 className="font-display font-bold text-lg mb-4">Add Stock from Dealer</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Product</label>
                <select value={stockForm.product_id} onChange={e => setStockForm({...stockForm, product_id: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model} {p.variant}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Unit Price (₹)</label>
                  <Input type="number" value={stockForm.unit_price || ''} onChange={e => setStockForm({...stockForm, unit_price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Total Value</label>
                  <div className="h-10 px-3 rounded-md border border-input bg-secondary/50 flex items-center text-sm font-display font-bold">
                    ₹{(stockForm.quantity * stockForm.unit_price).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">IMEIs (one per line, 15 digits each)</label>
                <textarea value={stockForm.imeis}
                  onChange={e => {
                    setStockForm({...stockForm, imeis: e.target.value, quantity: e.target.value.split('\n').filter(s => s.trim().length === 15).length});
                  }}
                  rows={5} placeholder="Enter IMEI numbers, one per line..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stockForm.imeis.split('\n').filter(s => s.trim().length === 15).length} valid IMEIs detected
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowStockEntry(false)}>Cancel</Button>
              <Button onClick={handleStockEntry}>Add Stock & Update Credit</Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Return Modal */}
      {showReturnForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl p-6 shadow-2xl w-[400px]">
            <h2 className="font-display font-bold text-lg mb-4">Return Stock to Dealer</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">IMEI Number</label>
                <Input value={returnForm.imei} onChange={e => setReturnForm({...returnForm, imei: e.target.value})} placeholder="15-digit IMEI" className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Return Reason</label>
                <Input value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})} placeholder="Defective, wrong model, etc." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowReturnForm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleStockReturn}>Return & Deduct</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Dealer List */}
        <div className="col-span-1 space-y-2">
          {dealers.map(d => (
            <button key={d.id} onClick={() => setSelectedDealer(d.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedDealer === d.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
              }`}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="font-display font-medium text-sm">{d.dealer_name}</span>
                  {d.brand_name && <span className="ml-1 text-xs text-primary font-medium">({d.brand_name})</span>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{d.phone}</p>
              <p className={`text-sm font-display font-bold mt-1 ${Number(d.total_credit) > 0 ? 'text-destructive' : 'text-success'}`}>
                ₹{Math.abs(Number(d.total_credit)).toLocaleString('en-IN')} {Number(d.total_credit) > 0 ? 'Credit Due' : 'Clear'}
              </p>
            </button>
          ))}
          {dealers.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No dealers added yet.</p>}
        </div>

        {/* Dealer Detail */}
        <div className="col-span-2">
          {selectedDealerObj ? (
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-display font-bold text-lg">{selectedDealerObj.dealer_name}</h2>
                  {selectedDealerObj.brand_name && (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-display font-semibold">
                      {selectedDealerObj.brand_name}
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{selectedDealerObj.phone} · {selectedDealerObj.gstin}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Credit</p>
                  <p className={`text-2xl font-display font-extrabold ${Number(selectedDealerObj.total_credit) > 0 ? 'text-destructive' : 'text-success'}`}>
                    ₹{Math.abs(Number(selectedDealerObj.total_credit)).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-4">
                <Button size="sm" onClick={() => setShowStockEntry(true)}>
                  <Package className="w-4 h-4 mr-1" /> Add Stock
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReturnForm(true)}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Return Stock
                </Button>
              </div>

              {/* Quick Transaction */}
              <div className="flex gap-2 mb-4 p-3 rounded-lg bg-secondary/30">
                <select value={txnForm.type} onChange={e => setTxnForm({...txnForm, type: e.target.value})}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="purchase">Purchase</option>
                  <option value="payment">Payment</option>
                </select>
                <Input type="number" value={txnForm.amount || ''} onChange={e => setTxnForm({...txnForm, amount: Number(e.target.value)})} placeholder="Amount" className="w-28 h-9" />
                <Input value={txnForm.description} onChange={e => setTxnForm({...txnForm, description: e.target.value})} placeholder="Note" className="flex-1 h-9" />
                <Button size="sm" onClick={handleAddTxn}>Add</Button>
              </div>

              {/* Transaction History */}
              <div className="space-y-1">
                <h3 className="font-display font-semibold text-sm mb-2">Transaction History</h3>
                {txns.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b text-sm">
                    <div className="flex items-center gap-2">
                      {t.type === 'purchase' && <TrendingUp className="w-4 h-4 text-destructive" />}
                      {t.type === 'payment' && <TrendingDown className="w-4 h-4 text-success" />}
                      {t.type === 'sale_deduction' && <TrendingDown className="w-4 h-4 text-primary" />}
                      {t.type === 'stock_return' && <RotateCcw className="w-4 h-4 text-warning" />}
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === 'purchase' ? 'bg-destructive/10 text-destructive' :
                          t.type === 'payment' ? 'bg-success/10 text-success' :
                          t.type === 'sale_deduction' ? 'bg-primary/10 text-primary' :
                          'bg-warning/10 text-warning'
                        }`}>{t.type.replace('_', ' ')}</span>
                        <span className="ml-2 text-muted-foreground text-xs">{t.description}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="price-text">
                        {t.type === 'purchase' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Bal: ₹{Number(t.running_balance).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                ))}
                {txns.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No transactions yet.</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Select a dealer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
