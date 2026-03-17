import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, RotateCcw, TrendingUp, TrendingDown, Package, CreditCard, ArrowRight, IndianRupee, Search, FileText } from 'lucide-react';
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

    setShowPayment(false);
    setPaymentForm({ amount: 0, description: '' });
    toast.success('Payment recorded');
    fetchDealers(); fetchTxns(selectedDealer);
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

    setShowStockEntry(false);
    setStockForm({ product_id: '', quantity: 1, unit_price: 0, imeis: '' });
    toast.success(`${imeiList.length} units added, ₹${totalValue.toLocaleString('en-IN')} credited`);
    fetchDealers(); fetchTxns(selectedDealer); fetchProducts();
  };

  const handleStockReturn = async () => {
    if (!selectedDealer || !returnForm.imei || !activeShopId) { toast.error('Enter IMEI'); return; }
    const dealer = dealers.find(d => d.id === selectedDealer);
    if (!dealer) return;

    const { data: imeiRecord } = await supabase.from('imei_records')
      .select('*, products(*)')
      .eq('imei', returnForm.imei)
      .eq('dealer_id', selectedDealer)
      .eq('status', 'in_stock')
      .maybeSingle();

    if (!imeiRecord) { toast.error('IMEI not found in stock for this dealer'); return; }

    const returnValue = Number(imeiRecord.purchase_price);
    await supabase.from('imei_records').update({ status: 'returned' }).eq('id', imeiRecord.id);

    const product = imeiRecord.products as unknown as Product;
    if (product) {
      await supabase.from('products').update({
        stock_quantity: Math.max(0, product.stock_quantity - 1),
      }).eq('id', product.id);
    }

    const newBalance = Number(dealer.total_credit) - returnValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer);

    await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer, shop_id: activeShopId, type: 'stock_return',
      amount: returnValue, running_balance: newBalance,
      description: `Return: ${product?.brand} ${product?.model} (IMEI: ${returnForm.imei}) - ${returnForm.reason}`,
      imei_ref: returnForm.imei,
    });

    setShowReturnForm(false);
    setReturnForm({ imei: '', reason: '' });
    toast.success(`Returned, ₹${returnValue.toLocaleString('en-IN')} deducted`);
    fetchDealers(); fetchTxns(selectedDealer); fetchProducts();
  };

  const selectedDealerObj = dealers.find(d => d.id === selectedDealer);
  const filteredDealers = dealers.filter(d =>
    !searchQ || `${d.brand_name} ${d.dealer_name}`.toLowerCase().includes(searchQ.toLowerCase())
  );

  const totalOutstanding = dealers.reduce((s, d) => s + Number(d.total_credit), 0);

  // Modal component
  const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
        <div className="bg-card rounded-2xl p-6 shadow-2xl w-[500px] animate-scale-in border">
          <h2 className="font-display font-bold text-lg mb-5">{title}</h2>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Dealer List */}
      <div className="w-72 bg-card border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-lg font-extrabold">Dealers</h1>
            <Button size="sm" onClick={() => setShowForm(true)} className="gradient-primary border-0 text-primary-foreground h-8">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search dealers..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>
          <div className="mt-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
            <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Total Outstanding</p>
            <p className="font-display text-lg font-extrabold text-destructive">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pos-scrollable p-2 space-y-1">
          {filteredDealers.map(d => (
            <button key={d.id} onClick={() => setSelectedDealer(d.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedDealer === d.id ? 'bg-accent border-primary/30 shadow-sm' : 'bg-card border-transparent hover:bg-secondary'
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-display font-semibold text-sm block">{d.dealer_name}</span>
                  {d.brand_name && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-display font-bold">{d.brand_name}</span>
                  )}
                </div>
                <span className={`font-display text-xs font-bold ${Number(d.total_credit) > 0 ? 'text-destructive' : 'text-success'}`}>
                  ₹{Math.abs(Number(d.total_credit)).toLocaleString('en-IN')}
                </span>
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
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold">{selectedDealerObj.dealer_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {selectedDealerObj.brand_name && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-display font-bold">{selectedDealerObj.brand_name}</span>
                  )}
                  {selectedDealerObj.phone && <span className="text-sm text-muted-foreground">{selectedDealerObj.phone}</span>}
                  {selectedDealerObj.gstin && <span className="text-xs text-muted-foreground font-mono">GSTIN: {selectedDealerObj.gstin}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Outstanding</p>
                <p className={`text-3xl font-display font-extrabold ${Number(selectedDealerObj.total_credit) > 0 ? 'text-destructive' : 'text-success'}`}>
                  ₹{Math.abs(Number(selectedDealerObj.total_credit)).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-6">
              <Button size="sm" onClick={() => setShowStockEntry(true)} className="gradient-primary border-0 text-primary-foreground">
                <Package className="w-4 h-4 mr-1.5" /> Add Stock
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPayment(true)}>
                <IndianRupee className="w-4 h-4 mr-1.5" /> Record Payment
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReturnForm(true)}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Return Stock
              </Button>
            </div>

            {/* Transaction History */}
            <div className="bg-card rounded-xl border shadow-sm">
              <div className="px-4 py-3 border-b">
                <h3 className="font-display font-bold text-sm">Transaction History</h3>
                <p className="text-xs text-muted-foreground">{txns.length} transactions</p>
              </div>
              <div className="divide-y divide-border/50">
                {txns.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        t.type === 'purchase' ? 'bg-destructive/10' : t.type === 'payment' ? 'bg-success/10' : t.type === 'sale_deduction' ? 'bg-primary/10' : 'bg-warning/10'
                      }`}>
                        {t.type === 'purchase' && <TrendingUp className="w-4 h-4 text-destructive" />}
                        {t.type === 'payment' && <TrendingDown className="w-4 h-4 text-success" />}
                        {t.type === 'sale_deduction' && <TrendingDown className="w-4 h-4 text-primary" />}
                        {t.type === 'stock_return' && <RotateCcw className="w-4 h-4 text-warning" />}
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
                          t.type === 'purchase' ? 'bg-destructive/10 text-destructive' :
                          t.type === 'payment' ? 'bg-success/10 text-success' :
                          t.type === 'sale_deduction' ? 'bg-primary/10 text-primary' :
                          'bg-warning/10 text-warning'
                        }`}>{t.type.replace(/_/g, ' ')}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{t.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`price-text text-sm ${t.type === 'purchase' ? 'text-destructive' : 'text-success'}`}>
                        {t.type === 'purchase' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                      </span>
                      <p className="text-[10px] text-muted-foreground font-mono">Bal: ₹{Number(t.running_balance).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                ))}
                {txns.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-display font-medium">No transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
              <User className="w-8 h-8 text-accent-foreground/40" />
            </div>
            <p className="font-display font-medium">Select a dealer to view details</p>
          </div>
        )}
      </div>

      {/* Add Dealer Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add New Dealer">
        <div className="space-y-3">
          {[['brand_name', 'Brand (e.g. Oppo, Samsung)'], ['dealer_name', 'Dealer Name *'], ['phone', 'Phone'], ['address', 'Address'], ['gstin', 'GSTIN']].map(([f, l]) => (
            <div key={f}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{l}</label>
              <Input value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} className="h-10" />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Initial Credit (₹)</label>
            <Input type="number" value={form.total_credit || ''} onChange={e => setForm({...form, total_credit: Number(e.target.value)})} className="h-10" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={handleAddDealer} className="gradient-primary border-0 text-primary-foreground">Add Dealer</Button>
        </div>
      </Modal>

      {/* Stock Entry Modal */}
      <Modal open={showStockEntry} onClose={() => setShowStockEntry(false)} title="Add Stock from Dealer">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product</label>
            <select value={stockForm.product_id} onChange={e => setStockForm({...stockForm, product_id: e.target.value})}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
              <option value="">Select product...</option>
              {products.map(p => (<option key={p.id} value={p.id}>{p.brand} {p.model} {p.variant}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Unit Price (₹)</label>
              <Input type="number" value={stockForm.unit_price || ''} onChange={e => setStockForm({...stockForm, unit_price: Number(e.target.value)})} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Total Value</label>
              <div className="h-10 px-3 rounded-lg border border-input bg-accent/50 flex items-center text-sm font-display font-bold text-primary">
                ₹{(stockForm.imeis.split('\n').filter(s => s.trim().length === 15).length * stockForm.unit_price).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">IMEIs (one per line)</label>
            <textarea value={stockForm.imeis}
              onChange={e => setStockForm({...stockForm, imeis: e.target.value, quantity: e.target.value.split('\n').filter(s => s.trim().length === 15).length})}
              rows={5} placeholder="Enter IMEI numbers, one per line..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-display font-bold text-primary">{stockForm.imeis.split('\n').filter(s => s.trim().length === 15).length}</span> valid IMEIs
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowStockEntry(false)}>Cancel</Button>
          <Button onClick={handleStockEntry} className="gradient-primary border-0 text-primary-foreground">Add Stock & Credit</Button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment to Dealer">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount (₹)</label>
            <Input type="number" value={paymentForm.amount || ''} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} className="h-10" placeholder="Enter payment amount" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
            <Input value={paymentForm.description} onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} className="h-10" placeholder="Payment via bank transfer, etc." />
          </div>
          {selectedDealerObj && (
            <div className="p-3 rounded-lg bg-accent/50 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Current Outstanding</span><span className="font-display font-bold text-destructive">₹{Number(selectedDealerObj.total_credit).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted-foreground">After Payment</span><span className="font-display font-bold text-success">₹{(Number(selectedDealerObj.total_credit) - paymentForm.amount).toLocaleString('en-IN')}</span></div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
          <Button onClick={handlePayment} className="bg-success hover:bg-success/90 text-success-foreground">Record Payment</Button>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={showReturnForm} onClose={() => setShowReturnForm(false)} title="Return Stock to Dealer">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">IMEI Number</label>
            <Input value={returnForm.imei} onChange={e => setReturnForm({...returnForm, imei: e.target.value})} placeholder="15-digit IMEI" className="h-10 font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Return Reason</label>
            <Input value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})} placeholder="Defective, wrong model, etc." className="h-10" />
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
