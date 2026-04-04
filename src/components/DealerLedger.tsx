import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Phone, Hash, Building2, Wallet, Package, IndianRupee, RotateCcw, FileText, ArrowDownLeft, ArrowUpRight, TrendingDown, CalendarDays, Filter, X, Smartphone, Tag, HardDrive, Palette, Edit2, Trash2, ChevronDown, ChevronUp, Download, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { DealerStatement } from '@/components/DealerStatement';

type Dealer = Database['public']['Tables']['dealers']['Row'];
type DealerTransaction = Database['public']['Tables']['dealer_transactions']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }> = ({ open, onClose, title, subtitle, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-[560px] animate-scale-in border overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
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

const getQuantityFromTxn = (txn: DealerTransaction) => {
  if (txn.type === 'payment') return '—';
  if (txn.type === 'sale_deduction' || txn.type === 'stock_return') return '1';
  const match = txn.description.match(/(\d+)\s*×/);
  return match ? match[1] : '—';
};

const TXN_META: Record<string, { label: string; colorClass: string; bgClass: string; sign: '+' | '-' | '' }> = {
  purchase: { label: 'Purchase', colorClass: 'text-destructive', bgClass: 'bg-destructive/10', sign: '+' },
  payment: { label: 'Payment', colorClass: 'text-success', bgClass: 'bg-success/10', sign: '-' },
  stock_return: { label: 'Return', colorClass: 'text-warning', bgClass: 'bg-warning/10', sign: '-' },
  sale_deduction: { label: 'Sale', colorClass: 'text-primary', bgClass: 'bg-primary/10', sign: '' },
  opening_adjustment: { label: 'Adjustment', colorClass: 'text-muted-foreground', bgClass: 'bg-accent', sign: '' },
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
  const [showReport, setShowReport] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'credit_desc' | 'credit_asc' | 'recent'>('credit_desc');
  const [txnFilter, setTxnFilter] = useState<'all' | 'purchase' | 'payment' | 'sale_deduction' | 'stock_return' | 'opening_adjustment'>('all');
  const [dealerForm, setDealerForm] = useState({ brand_name: '', dealer_name: '', phone: '', address: '', gstin: '', total_credit: 0 });
  const [stockForm, setStockForm] = useState({ product_id: '', unit_price: 0, sale_price: 0, imeis: '', hsn_code: '' });
  const [stockSearch, setStockSearch] = useState('');
  const [showNewProductInStock, setShowNewProductInStock] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ brand: '', model: '', variant: '', color: '', gst_percent: 18, hsn_code: '', category: 'mobile' });
  const [returnForm, setReturnForm] = useState({ imei: '', reason: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, description: '', paymentMethods: [] as string[], notes: '', settleFrom: 'opening_credit' as 'sold_cost' | 'opening_credit' | 'both' | 'direct', soldCostAmount: 0, openingCreditAmount: 0 });
  const [showEditCredit, setShowEditCredit] = useState(false);
  const [editCreditValue, setEditCreditValue] = useState(0);
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
  const [txnSearchQ, setTxnSearchQ] = useState('');
  const [reportDealerMode, setReportDealerMode] = useState<'selected' | 'all'>('selected');
  const [showStatement, setShowStatement] = useState(false);

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

  const totals = useMemo(() => {
    const purchase = selectedTxns.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount), 0);
    const payment = selectedTxns.filter(t => t.type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
    const sold = selectedTxns.filter(t => t.type === 'sale_deduction').reduce((s, t) => s + Number(t.amount), 0);
    const returned = selectedTxns.filter(t => t.type === 'stock_return').reduce((s, t) => s + Number(t.amount), 0);
    const adjustments = selectedTxns.filter(t => t.type === 'opening_adjustment').reduce((s, t) => s + Number(t.amount), 0);
    const current = Number(selectedDealer?.total_credit || 0);
    const opening = current - purchase + payment + returned;
    const soldCostSettled = selectedTxns.filter(t => t.type === 'payment' && t.description.includes('Sold Cost')).reduce((s, t) => {
      const bothMatch = t.description.match(/Sold Cost: ₹([\d,]+)/);
      if (bothMatch) return s + Number(bothMatch[1].replace(/,/g, ''));
      if (t.description.includes('Settled from Sold Cost')) return s + Number(t.amount);
      return s;
    }, 0);
    const openingCreditSettled = selectedTxns.filter(t => t.type === 'payment' && t.description.includes('Opening Credit')).reduce((s, t) => {
      const bothMatch = t.description.match(/Opening: ₹([\d,]+)/);
      if (bothMatch) return s + Number(bothMatch[1].replace(/,/g, ''));
      if (t.description.includes('Settled from Opening Credit')) return s + Number(t.amount);
      return s;
    }, 0);
    const availableSoldCost = Math.max(0, sold - soldCostSettled);
    const availableOpeningCredit = Math.max(0, opening - openingCreditSettled);
    const purchaseCount = selectedTxns.filter(t => t.type === 'purchase').length;
    const returnCount = selectedTxns.filter(t => t.type === 'stock_return').length;
    const saleCount = selectedTxns.filter(t => t.type === 'sale_deduction').length;
    return { purchase, payment, sold, returned, current, opening, soldCostSettled, openingCreditSettled, availableSoldCost, availableOpeningCredit, purchaseCount, returnCount, saleCount };
  }, [selectedDealer, selectedTxns]);

  const historyTxns = useMemo(() => {
    if (!selectedDealer) return selectedTxns;
    const hasOpeningHistory = selectedTxns.some(t => t.type === 'opening_adjustment');
    if (hasOpeningHistory || totals.opening === 0) return selectedTxns;

    const fallbackOpeningTxn = {
      id: `opening-fallback-${selectedDealer.id}`,
      dealer_id: selectedDealer.id,
      shop_id: selectedDealer.shop_id,
      type: 'opening_adjustment',
      amount: totals.opening,
      running_balance: totals.opening,
      created_at: selectedDealer.created_at,
      invoice_ref: null,
      imei_ref: null,
      description: `Opening credit: ${fmt(totals.opening)}`,
    } as DealerTransaction;

    return [...selectedTxns, fallbackOpeningTxn].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [selectedDealer, selectedTxns, totals.opening]);

  const visibleTxns = historyTxns.filter(t => {
    if (txnFilter !== 'all' && t.type !== txnFilter) return false;
    if (txnSearchQ.trim()) {
      const q = txnSearchQ.toLowerCase().trim();
      const searchable = [t.description, t.imei_ref, t.invoice_ref].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const totalOutstanding = dealers.reduce((sum, dealer) => sum + Number(dealer.total_credit), 0);

  const getBalanceTone = (amount: number) => {
    if (amount >= 200000) return 'text-destructive';
    if (amount >= 50000) return 'text-warning';
    return 'text-success';
  };

  const openEditDealer = (dealer: Dealer) => {
    setDealerForm({ brand_name: dealer.brand_name, dealer_name: dealer.dealer_name, phone: dealer.phone, address: dealer.address, gstin: dealer.gstin, total_credit: Number(dealer.total_credit) });
    setEditingDealerId(dealer.id);
    setShowDealerForm(true);
  };

  const [deletingTxnId, setDeletingTxnId] = useState<string | null>(null);

   const handleDeleteTransaction = async (txn: DealerTransaction) => {
    if (!confirm('Delete this transaction? Running balances and dealer credit will be recalculated.' + 
      (txn.type === 'purchase' ? '\n\nAssociated IMEI records will also be deleted from inventory.' : 
       txn.type === 'stock_return' ? '\n\nReturned IMEI will be reverted back to in-stock.' : ''))) return;
    setDeletingTxnId(txn.id);
    try {
      // Reverse inventory effects based on transaction type
      if (txn.type === 'purchase' && txn.imei_ref) {
        const imeiList = txn.imei_ref.split(',').map(s => s.trim()).filter(Boolean);
        if (imeiList.length > 0) {
          // Find the IMEI records to get product IDs before deleting
          const { data: imeiRecords } = await supabase.from('imei_records')
            .select('id, product_id, status')
            .in('imei', imeiList)
            .eq('dealer_id', txn.dealer_id);
          
          if (imeiRecords && imeiRecords.length > 0) {
            // Only delete in_stock IMEIs (sold ones should remain)
            const inStockRecords = imeiRecords.filter(r => r.status === 'in_stock');
            if (inStockRecords.length > 0) {
              // Delete IMEI records
              await supabase.from('imei_records').delete().in('id', inStockRecords.map(r => r.id));
              
              // Decrement stock for each product
              const productCounts: Record<string, number> = {};
              for (const r of inStockRecords) {
                productCounts[r.product_id] = (productCounts[r.product_id] || 0) + 1;
              }
              for (const [productId, count] of Object.entries(productCounts)) {
                const product = products.find(p => p.id === productId);
              }
            }
          }
        }
      } else if (txn.type === 'stock_return' && txn.imei_ref) {
        // Revert returned IMEI back to in_stock
        const { data: imeiRecord } = await supabase.from('imei_records')
          .select('id, product_id')
          .eq('imei', txn.imei_ref.trim())
          .eq('status', 'returned')
          .maybeSingle();
        if (imeiRecord) {
          await supabase.from('imei_records').update({ status: 'in_stock' }).eq('id', imeiRecord.id);
        }
      }

      // Delete the transaction
      const { error: delError } = await supabase.from('dealer_transactions').delete().eq('id', txn.id);
      if (delError) { toast.error('Failed: ' + delError.message); return; }

      // Fetch all remaining transactions for this dealer, sorted by date
      const { data: remaining } = await supabase
        .from('dealer_transactions')
        .select('*')
        .eq('dealer_id', txn.dealer_id)
        .order('created_at', { ascending: true });

      if (!remaining) { toast.error('Failed to fetch transactions'); return; }

      // Find the dealer to get opening credit (balance without any transactions)
      const dealer = dealers.find(d => d.id === txn.dealer_id);
      if (!dealer) return;

      // Recalculate: compute opening from scratch
      // Opening = current_balance - sum(purchases) + sum(payments) + sum(returns) - sum(adjustments)
      // But after deletion we need to recompute from the base opening
      // Base opening = total_credit - purchases + payments + returns (before this deletion)
      // Simpler: recompute running balances from the first transaction

      // Calculate what the opening balance should be (balance before any transactions)
      const allRemainingTxns = remaining;
      
      // We need to figure out the "base" opening credit
      // The opening is derived: opening = current_total_credit - sum(purchases) + sum(payments) + sum(returns) - sum(adjustments_positive) + sum(adjustments_negative)
      // But current total_credit includes the deleted txn's effect. So let's reverse the deleted txn first.
      let adjustedCredit = Number(dealer.total_credit);
      if (txn.type === 'purchase') adjustedCredit -= Number(txn.amount);
      else if (txn.type === 'payment') adjustedCredit += Number(txn.amount);
      else if (txn.type === 'stock_return') adjustedCredit += Number(txn.amount);
      else if (txn.type === 'opening_adjustment') adjustedCredit -= Number(txn.amount);

      // Now recalculate running balances
      // Opening = adjustedCredit - sum(remaining purchases) + sum(remaining payments) + sum(remaining returns) - sum(remaining adjustments)
      const sumByType = (type: string) => allRemainingTxns.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0);
      const opening = adjustedCredit - sumByType('purchase') + sumByType('payment') + sumByType('stock_return') - sumByType('opening_adjustment');

      let runningBalance = opening;
      for (const t of allRemainingTxns) {
        if (t.type === 'purchase' || (t.type === 'opening_adjustment' && Number(t.amount) > 0)) {
          runningBalance += Number(t.amount);
        } else if (t.type === 'payment' || t.type === 'stock_return' || (t.type === 'opening_adjustment' && Number(t.amount) < 0)) {
          runningBalance -= Math.abs(Number(t.amount));
        }
        // Update running balance in DB
        await supabase.from('dealer_transactions').update({ running_balance: runningBalance }).eq('id', t.id);
      }

      // Update dealer total_credit
      await supabase.from('dealers').update({ total_credit: adjustedCredit }).eq('id', txn.dealer_id);

      toast.success('Transaction deleted and balances recalculated');
      fetchDealers();
      fetchTransactions();
      fetchProducts();
    } finally {
      setDeletingTxnId(null);
    }
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
    if (!activeShopId || !dealerForm.dealer_name.trim()) { toast.error('Dealer name is required'); return; }
    if (editingDealerId) {
      const { error } = await supabase.from('dealers').update({ brand_name: dealerForm.brand_name.trim(), dealer_name: dealerForm.dealer_name.trim(), phone: dealerForm.phone.trim(), address: dealerForm.address.trim(), gstin: dealerForm.gstin.trim() }).eq('id', editingDealerId);
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Dealer updated');
    } else {
      const { error } = await supabase.from('dealers').insert({ shop_id: activeShopId, brand_name: dealerForm.brand_name.trim(), dealer_name: dealerForm.dealer_name.trim(), phone: dealerForm.phone.trim(), address: dealerForm.address.trim(), gstin: dealerForm.gstin.trim(), total_credit: dealerForm.total_credit || 0 });
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Dealer added');
    }
    setShowDealerForm(false);
    setEditingDealerId(null);
    setDealerForm({ brand_name: '', dealer_name: '', phone: '', address: '', gstin: '', total_credit: 0 });
    fetchDealers();
  };

  const handleEditOpeningCredit = async () => {
    if (!selectedDealer) return;
    const oldOpening = totals.opening;
    const diff = editCreditValue - oldOpening;
    if (diff === 0) {
      setShowEditCredit(false);
      return;
    }

    const newBalance = Number(selectedDealer.total_credit) + diff;
    const shopId = selectedDealer.shop_id;

    const { error: dealerError } = await supabase
      .from('dealers')
      .update({ total_credit: newBalance })
      .eq('id', selectedDealer.id);

    if (dealerError) {
      toast.error('Failed: ' + dealerError.message);
      return;
    }

    const { error: txnError } = await supabase.from('dealer_transactions').insert({
      dealer_id: selectedDealer.id,
      shop_id: shopId,
      type: 'opening_adjustment',
      amount: diff,
      running_balance: newBalance,
      description: `Opening credit adjusted from ₹${oldOpening.toLocaleString('en-IN')} to ₹${editCreditValue.toLocaleString('en-IN')}`,
    });

    if (txnError) {
      toast.error('History log failed: ' + txnError.message);
      return;
    }

    setShowEditCredit(false);
    toast.success('Opening credit updated');
    fetchDealers();
    fetchTransactions();
  };

  const defaultPaymentForm = { amount: 0, description: '', paymentMethods: [] as string[], notes: '', settleFrom: 'opening_credit' as 'sold_cost' | 'opening_credit' | 'both' | 'direct', soldCostAmount: 0, openingCreditAmount: 0 };

  const handlePayment = async () => {
    if (!selectedDealer || !activeShopId) return;
    let totalAmount = 0;
    if (paymentForm.settleFrom === 'direct') {
      totalAmount = paymentForm.amount;
      if (totalAmount <= 0) { toast.error('Enter a valid payment amount'); return; }
    } else if (paymentForm.settleFrom === 'both') {
      totalAmount = paymentForm.soldCostAmount + paymentForm.openingCreditAmount;
      if (totalAmount <= 0) { toast.error('Enter valid amounts'); return; }
      if (paymentForm.soldCostAmount > totals.availableSoldCost) { toast.error(`Sold cost amount exceeds available (${fmt(totals.availableSoldCost)})`); return; }
      if (paymentForm.openingCreditAmount > totals.availableOpeningCredit) { toast.error(`Opening credit amount exceeds available (${fmt(totals.availableOpeningCredit)})`); return; }
    } else if (paymentForm.settleFrom === 'sold_cost') {
      totalAmount = paymentForm.amount;
      if (totalAmount <= 0) { toast.error('Enter a valid payment amount'); return; }
      if (totalAmount > totals.availableSoldCost) { toast.error(`Amount exceeds available sold cost (${fmt(totals.availableSoldCost)})`); return; }
    } else {
      totalAmount = paymentForm.amount;
      if (totalAmount <= 0) { toast.error('Enter a valid payment amount'); return; }
      if (totalAmount > totals.availableOpeningCredit) { toast.error(`Amount exceeds available opening credit (${fmt(totals.availableOpeningCredit)})`); return; }
    }
    const methods = paymentForm.paymentMethods.length > 0 ? paymentForm.paymentMethods.join(', ') : 'Not specified';
    const settleLabel = paymentForm.settleFrom === 'direct' ? 'Direct Payment' : paymentForm.settleFrom === 'sold_cost' ? 'Settled from Sold Cost' : paymentForm.settleFrom === 'opening_credit' ? 'Settled from Opening Credit' : `Sold Cost: ₹${paymentForm.soldCostAmount.toLocaleString('en-IN')}, Opening: ₹${paymentForm.openingCreditAmount.toLocaleString('en-IN')}`;
    const desc = [settleLabel, `via ${methods}`, paymentForm.notes ? `Notes: ${paymentForm.notes}` : '', paymentForm.description || ''].filter(Boolean).join(' | ');
    const newBalance = Number(selectedDealer.total_credit) - totalAmount;
    const { error: txnError } = await supabase.from('dealer_transactions').insert({ dealer_id: selectedDealer.id, shop_id: activeShopId, type: 'payment', amount: totalAmount, running_balance: newBalance, description: desc });
    if (txnError) { toast.error('Failed: ' + txnError.message); return; }
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer.id);
    setShowPayment(false);
    setPaymentForm(defaultPaymentForm);
    toast.success('Payment recorded');
    fetchDealers();
    fetchTransactions();
  };

  const handleCreateProductInStock = async () => {
    if (!activeShopId || !newProductForm.brand || !newProductForm.model) { toast.error('Brand and Model are required'); return; }
    const { data, error } = await supabase.from('products').insert({ brand: newProductForm.brand, model: newProductForm.model, variant: newProductForm.variant, color: newProductForm.color, purchase_price: stockForm.unit_price, sale_price: 0, gst_percent: newProductForm.gst_percent, hsn_code: newProductForm.hsn_code, category: newProductForm.category, shop_id: activeShopId, stock_quantity: 0 } as any).select().single();
    if (error) { toast.error('Failed to create product: ' + error.message); return; }
    if (data) { setStockForm({ ...stockForm, product_id: data.id, hsn_code: newProductForm.hsn_code }); setStockSearch(`${data.brand} ${data.model} ${data.variant}`); setShowNewProductInStock(false); toast.success('Product created! Now add IMEIs below.'); fetchProducts(); }
  };

  const handleStockEntry = async () => {
    if (!selectedDealer || !activeShopId || !stockForm.product_id) { toast.error('Select a product'); return; }
    const imeiList = stockForm.imeis.split('\n').map(v => v.trim()).filter(v => /^\d{15}$/.test(v));
    if (imeiList.length === 0) { toast.error('Enter valid 15-digit IMEIs'); return; }
    let added = 0;
    for (const imei of imeiList) {
      const { error } = await supabase.from('imei_records').insert({ imei, product_id: stockForm.product_id, shop_id: activeShopId, dealer_id: selectedDealer.id, status: 'in_stock', purchase_price: stockForm.unit_price, sale_price: stockForm.sale_price });
      if (!error) added++;
    }
    if (added === 0) { toast.error('No IMEIs were added (duplicates?)'); return; }
    const product = products.find(p => p.id === stockForm.product_id);
    if (product) {
      const updateData: any = {};
      if (stockForm.hsn_code) updateData.hsn_code = stockForm.hsn_code;
      if (stockForm.unit_price > 0) updateData.purchase_price = stockForm.unit_price;
      if (stockForm.sale_price > 0) updateData.sale_price = stockForm.sale_price;
      if (Object.keys(updateData).length > 0) {
        await supabase.from('products').update(updateData).eq('id', product.id);
      }
    }
    const purchaseValue = added * stockForm.unit_price;
    const newBalance = Number(selectedDealer.total_credit) + purchaseValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer.id);
    await supabase.from('dealer_transactions').insert({ dealer_id: selectedDealer.id, shop_id: activeShopId, type: 'purchase', amount: purchaseValue, running_balance: newBalance, description: `Purchase ${added} × ${product?.brand || ''} ${product?.model || ''} @ ₹${stockForm.unit_price.toLocaleString('en-IN')}`, imei_ref: imeiList.join(',') });
    setShowStockEntry(false);
    setStockForm({ product_id: '', unit_price: 0, sale_price: 0, imeis: '', hsn_code: '' });
    setShowNewProductInStock(false);
    setNewProductForm({ brand: '', model: '', variant: '', color: '', gst_percent: 18, hsn_code: '', category: 'mobile' });
    setStockSearch('');
    toast.success(`Added ${added} units to inventory and ledger`);
    fetchDealers();
    fetchTransactions();
    fetchProducts();
  };

  const handleStockReturn = async () => {
    if (!selectedDealer || !activeShopId || !returnForm.imei.trim()) { toast.error('Enter IMEI'); return; }
    const { data: imeiRecord } = await supabase.from('imei_records').select('*, products(*)').eq('imei', returnForm.imei.trim()).eq('dealer_id', selectedDealer.id).eq('status', 'in_stock').maybeSingle();
    if (!imeiRecord) { toast.error('IMEI not found in available stock for this dealer'); return; }
    const product = imeiRecord.products as unknown as Product;
    const costValue = Number(imeiRecord.purchase_price || 0);
    await supabase.from('imei_records').update({ status: 'returned' }).eq('id', imeiRecord.id);
    const newBalance = Number(selectedDealer.total_credit) - costValue;
    await supabase.from('dealers').update({ total_credit: newBalance }).eq('id', selectedDealer.id);
    await supabase.from('dealer_transactions').insert({ dealer_id: selectedDealer.id, shop_id: activeShopId, type: 'stock_return', amount: costValue, running_balance: newBalance, description: `Return ${product?.brand || ''} ${product?.model || ''} (IMEI: ${returnForm.imei.trim()})${returnForm.reason ? ` - ${returnForm.reason}` : ''}`, imei_ref: returnForm.imei.trim() });
    setShowReturnForm(false);
    setReturnForm({ imei: '', reason: '' });
    toast.success('Stock return recorded');
    fetchDealers();
    fetchTransactions();
    fetchProducts();
  };

  // ── Dealer Report ──────────────────────────────────────────────────────
  const buildReportData = () => {
    const targetDealers = reportDealerMode === 'all' ? dealers : (selectedDealer ? [selectedDealer] : []);
    return targetDealers.map(dealer => {
      const txns = allTxns.filter(t => t.dealer_id === dealer.id);
      const purchase = txns.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount), 0);
      const payment = txns.filter(t => t.type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
      const sold = txns.filter(t => t.type === 'sale_deduction').reduce((s, t) => s + Number(t.amount), 0);
      const returned = txns.filter(t => t.type === 'stock_return').reduce((s, t) => s + Number(t.amount), 0);
      const opening = Number(dealer.total_credit) - purchase + payment + returned;
      const purchaseCount = txns.filter(t => t.type === 'purchase').length;
      const returnCount = txns.filter(t => t.type === 'stock_return').length;
      const soldCount = txns.filter(t => t.type === 'sale_deduction').length;
      return { dealer, purchase, payment, sold, returned, opening, purchaseCount, returnCount, soldCount, balance: Number(dealer.total_credit) };
    });
  };

  const downloadDealerCSV = () => {
    const rows = buildReportData();
    if (rows.length === 0) { toast.error('No data to export'); return; }
    const headers = ['Dealer Name', 'Brand', 'Phone', 'GSTIN', 'Opening Credit', 'Total Purchases (₹)', 'Purchase Entries', 'Sold Cost (₹)', 'Sold Entries', 'Returns (₹)', 'Return Entries', 'Total Payments (₹)', 'Current Balance (₹)'];
    const csvRows = rows.map(r => [
      `"${r.dealer.dealer_name}"`, `"${r.dealer.brand_name}"`, `"${r.dealer.phone}"`, `"${r.dealer.gstin}"`,
      r.opening, r.purchase, r.purchaseCount, r.sold, r.soldCount, r.returned, r.returnCount, r.payment, r.balance
    ].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealer_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const filteredProducts = products.filter(p => !stockSearch || `${p.brand} ${p.model} ${p.variant} ${p.color}`.toLowerCase().includes(stockSearch.toLowerCase()));

  return (
    <div className="h-full p-5 overflow-y-auto pos-scrollable">
      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-5 h-full">
        {/* ── Dealer List ── */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[700px]">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-lg font-extrabold">Dealer Ledger</h1>
                <p className="text-xs text-muted-foreground">Cost-price payable tracking</p>
              </div>
              <Button size="sm" onClick={() => setShowDealerForm(true)} className="gradient-primary border-0 text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            <div className="rounded-2xl border bg-destructive/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-destructive" />
                <span className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">Total Payable</span>
              </div>
              <div className="font-display text-3xl font-extrabold text-destructive">{fmt(totalOutstanding)}</div>
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
                  <th className="px-4 py-3">Brand / Dealer</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredDealers.map(dealer => (
                  <tr key={dealer.id} onClick={() => setSelectedDealerId(dealer.id)} className={`cursor-pointer border-t transition-colors ${selectedDealerId === dealer.id ? 'bg-accent/60 border-l-2 border-l-primary' : 'hover:bg-accent/30'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm">{dealer.dealer_name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            {dealer.brand_name && <span className="px-1.5 py-0.5 rounded bg-secondary font-semibold">{dealer.brand_name}</span>}
                            <span>{dealer.phone || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-display font-bold ${getBalanceTone(Number(dealer.total_credit))}`}>
                      {fmt(Number(dealer.total_credit))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Dealer Detail ── */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden min-h-[700px]">
          {selectedDealer ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-5 border-b bg-gradient-to-r from-accent/70 to-transparent">
                <div className="flex items-start justify-between gap-4 flex-wrap">
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
                  <div className="flex gap-2 items-center flex-shrink-0 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setReportDealerMode('selected'); setShowReport(true); }}>
                      <BarChart2 className="w-4 h-4 mr-1" /> Report
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowStatement(true)}>
                      <FileText className="w-4 h-4 mr-1" /> Statement
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditDealer(selectedDealer)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteDealer(selectedDealer.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="border-l pl-3 ml-1">
                      <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Balance</p>
                      <p className={`font-display text-3xl font-extrabold ${getBalanceTone(totals.current)}`}>{fmt(totals.current)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Summary Cards */}
              <div className="p-5 border-b">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
                  {/* Opening Credit */}
                  <div className="rounded-xl border bg-background p-3 col-span-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Opening</p>
                      <button onClick={() => { setEditCreditValue(totals.opening); setShowEditCredit(true); }} className="text-primary hover:bg-primary/10 rounded p-0.5 transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="font-display text-lg font-extrabold text-muted-foreground">{fmt(totals.opening)}</p>
                    {totals.availableOpeningCredit > 0 && <p className="text-[9px] text-warning mt-0.5">Pending: {fmt(totals.availableOpeningCredit)}</p>}
                  </div>

                  {/* Purchases */}
                  <div className="rounded-xl border bg-background p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Purchases</p>
                      <span className="text-[9px] text-muted-foreground bg-secondary px-1 rounded">{totals.purchaseCount}×</span>
                    </div>
                    <p className="font-display text-lg font-extrabold text-destructive">+{fmt(totals.purchase)}</p>
                  </div>

                  {/* Sold Cost */}
                  <div className="rounded-xl border bg-background p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Sold Cost</p>
                      <span className="text-[9px] text-muted-foreground bg-secondary px-1 rounded">{totals.saleCount}×</span>
                    </div>
                    <p className="font-display text-lg font-extrabold text-primary">{fmt(totals.sold)}</p>
                    {totals.availableSoldCost > 0 && <p className="text-[9px] text-primary/70 mt-0.5">Pending: {fmt(totals.availableSoldCost)}</p>}
                  </div>

                  {/* Returns */}
                  <div className="rounded-xl border bg-background p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Returns</p>
                      <span className="text-[9px] text-muted-foreground bg-secondary px-1 rounded">{totals.returnCount}×</span>
                    </div>
                    <p className="font-display text-lg font-extrabold text-warning">-{fmt(totals.returned)}</p>
                  </div>

                  {/* Payments */}
                  <div className="rounded-xl border bg-background p-3">
                    <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-1.5">Paid</p>
                    <p className="font-display text-lg font-extrabold text-success">-{fmt(totals.payment)}</p>
                  </div>

                  {/* Net Balance formula */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[10px] font-display uppercase tracking-wider text-primary/70 mb-1.5">Net Balance</p>
                    <p className={`font-display text-lg font-extrabold ${getBalanceTone(totals.current)}`}>{fmt(totals.current)}</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">Opening + Purchase − Paid − Returns</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setShowStockEntry(true)} className="rounded-xl border p-3 text-left hover:bg-accent/40 transition-colors group">
                    <Package className="w-5 h-5 text-destructive mb-1.5" />
                    <p className="font-display font-bold text-sm">Purchase Stock</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Add IMEI + increases balance</p>
                  </button>
                  <button onClick={() => setShowPayment(true)} className="rounded-xl border p-3 text-left hover:bg-accent/40 transition-colors">
                    <IndianRupee className="w-5 h-5 text-success mb-1.5" />
                    <p className="font-display font-bold text-sm">Record Payment</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Reduces dealer balance</p>
                  </button>
                  <button onClick={() => setShowReturnForm(true)} className="rounded-xl border p-3 text-left hover:bg-accent/40 transition-colors">
                    <RotateCcw className="w-5 h-5 text-warning mb-1.5" />
                    <p className="font-display font-bold text-sm">Return Stock</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Removes IMEI + reduces balance</p>
                  </button>
                </div>
              </div>

              {/* Transaction History */}
              <div className="p-5 flex-1 overflow-auto">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h3 className="font-display font-bold">Transaction History</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={txnSearchQ}
                        onChange={e => setTxnSearchQ(e.target.value)}
                        placeholder="Search IMEI, product, invoice..."
                        className="h-9 pl-8 pr-3 w-[220px] rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                      />
                      {txnSearchQ && (
                        <button onClick={() => setTxnSearchQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <select value={txnFilter} onChange={e => setTxnFilter(e.target.value as any)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="all">All Types</option>
                      <option value="purchase">📦 Purchases</option>
                      <option value="sale_deduction">💰 Sales</option>
                      <option value="payment">✅ Payments</option>
                      <option value="stock_return">↩ Returns</option>
                      <option value="opening_adjustment">✏️ Adjustments</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr className="text-left font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Date & Type</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTxns.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No transactions found</td></tr>
                      )}
                      {visibleTxns.map(txn => {
                        const meta = TXN_META[txn.type] || { label: txn.type, colorClass: 'text-foreground', bgClass: 'bg-secondary', sign: '' as const };
                        const isExpanded = expandedTxnId === txn.id;
                        return (
                          <React.Fragment key={txn.id}>
                            <tr onClick={() => setExpandedTxnId(isExpanded ? null : txn.id)} className={`border-t hover:bg-accent/30 transition-colors cursor-pointer ${isExpanded ? 'bg-accent/20' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                <span className={`inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-[10px] font-display font-bold ${meta.bgClass} ${meta.colorClass}`}>
                                  {meta.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-display font-semibold text-sm text-foreground truncate max-w-[180px]">
                                  {txn.invoice_ref || txn.imei_ref || txn.description.split('|')[0].trim()}
                                </div>
                                {getQuantityFromTxn(txn) !== '—' && <div className="text-[10px] text-muted-foreground">Qty: {getQuantityFromTxn(txn)}</div>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-display font-bold ${meta.colorClass}`}>
                                  {txn.type === 'purchase' || (txn.type === 'opening_adjustment' && Number(txn.amount) > 0) ? '+' : txn.type === 'payment' || txn.type === 'stock_return' || (txn.type === 'opening_adjustment' && Number(txn.amount) < 0) ? '−' : ''}{fmt(Number(txn.amount))}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-display font-extrabold text-sm">{fmt(Number(txn.running_balance))}</td>
                              <td className="px-4 py-3">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="border-t bg-accent/10">
                                <td colSpan={5} className="px-5 py-4">
                                  <div className="text-xs space-y-1.5 bg-background rounded-lg p-3 border">
                                    <p className="font-display font-semibold text-sm text-foreground mb-2">Transaction Details</p>
                                    <p className="text-muted-foreground"><span className="font-semibold text-foreground">Description:</span> {txn.description}</p>
                                    {txn.imei_ref && <p className="text-muted-foreground"><span className="font-semibold text-foreground">IMEI:</span> <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">{txn.imei_ref}</span></p>}
                                    {txn.invoice_ref && <p className="text-muted-foreground"><span className="font-semibold text-foreground">Invoice Ref:</span> {txn.invoice_ref}</p>}
                                    <p className="text-muted-foreground"><span className="font-semibold text-foreground">Date & Time:</span> {new Date(txn.created_at).toLocaleString('en-IN')}</p>
                                    <div className="pt-1.5 border-t flex items-end justify-between">
                                      <div className="flex gap-4">
                                        <div><p className="text-[10px] text-muted-foreground">Amount</p><p className={`font-display font-bold ${meta.colorClass}`}>{fmt(Number(txn.amount))}</p></div>
                                        <div><p className="text-[10px] text-muted-foreground">Running Balance</p><p className="font-display font-bold">{fmt(Number(txn.running_balance))}</p></div>
                                      </div>
                                      {!txn.id.startsWith('opening-fallback') && (
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          disabled={deletingTxnId === txn.id}
                                          onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(txn); }}
                                          className="text-xs"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                                          {deletingTxnId === txn.id ? 'Deleting...' : 'Delete'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
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
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-display font-semibold text-muted-foreground">Select a dealer to view their ledger</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add/Edit Dealer Modal ── */}
      <Modal open={showDealerForm} onClose={() => { setShowDealerForm(false); setEditingDealerId(null); }} title={editingDealerId ? 'Edit Dealer' : 'Add New Dealer'}>
        <div className="space-y-3">
          {[['dealer_name', 'Dealer / Person Name *'], ['brand_name', 'Brand Name'], ['phone', 'Phone'], ['gstin', 'GSTIN'], ['address', 'Address']].map(([field, label]) => (
            <div key={field}>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
              <Input value={(dealerForm as any)[field] || ''} onChange={e => setDealerForm({ ...dealerForm, [field]: e.target.value })} className="h-10" />
            </div>
          ))}
          {!editingDealerId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Opening Credit (₹)</label>
              <Input type="number" value={dealerForm.total_credit || ''} onChange={e => setDealerForm({ ...dealerForm, total_credit: parseFloat(e.target.value) || 0 })} className="h-10" placeholder="0" />
            </div>
          )}
          <Button onClick={handleAddDealer} className="w-full gradient-primary border-0 text-primary-foreground">{editingDealerId ? 'Update Dealer' : 'Add Dealer'}</Button>
        </div>
      </Modal>

      {/* ── Stock Entry Modal ── */}
      <Modal open={showStockEntry} onClose={() => setShowStockEntry(false)} title="Purchase Stock" subtitle={`Dealer: ${selectedDealer?.dealer_name}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search Product</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={stockSearch} onChange={e => { setStockSearch(e.target.value); setStockForm({ ...stockForm, product_id: '' }); }} className="h-10 pl-9" placeholder="Brand, model, variant..." />
            </div>
            {stockSearch && !stockForm.product_id && (
              <div className="mt-1 border rounded-xl bg-card shadow-sm max-h-48 overflow-auto">
                {filteredProducts.slice(0, 10).map(p => (
                  <button key={p.id} onClick={() => { setStockForm({ ...stockForm, product_id: p.id, unit_price: Number(p.purchase_price) || 0, sale_price: Number(p.sale_price) || 0, hsn_code: p.hsn_code }); setStockSearch(`${p.brand} ${p.model} ${p.variant}`); }} className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b last:border-0">
                    <div className="font-display font-semibold text-sm">{p.brand} {p.model}</div>
                    <div className="text-xs text-muted-foreground">{p.variant} {p.color} · Stock: {p.stock_quantity}</div>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No product found.
                    <button onClick={() => setShowNewProductInStock(true)} className="text-primary hover:underline ml-1 font-semibold">Create new?</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {showNewProductInStock && (
            <div className="border rounded-xl p-4 space-y-3 bg-accent/30">
              <p className="font-display font-bold text-sm">Create New Product</p>
              <div className="grid grid-cols-2 gap-3">
                {[['brand', 'Brand *'], ['model', 'Model *'], ['variant', 'Variant'], ['color', 'Color']].map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <Input value={(newProductForm as any)[field] || ''} onChange={e => setNewProductForm({ ...newProductForm, [field]: e.target.value })} className="h-9" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">GST %</label>
                  <Input type="number" value={newProductForm.gst_percent || ''} onChange={e => setNewProductForm({ ...newProductForm, gst_percent: parseFloat(e.target.value) || 0 })} className="h-9" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">HSN Code</label>
                  <Input value={newProductForm.hsn_code} onChange={e => setNewProductForm({ ...newProductForm, hsn_code: e.target.value })} className="h-9" placeholder="8517" />
                </div>
              </div>
              <Button size="sm" onClick={handleCreateProductInStock} className="w-full gradient-primary border-0 text-primary-foreground">Create Product</Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cost Price / Unit (₹)</label>
              <Input type="number" value={stockForm.unit_price || ''} onChange={e => setStockForm({ ...stockForm, unit_price: parseFloat(e.target.value) || 0 })} className="h-10" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Selling Price / Unit (₹)</label>
              <Input type="number" value={stockForm.sale_price || ''} onChange={e => setStockForm({ ...stockForm, sale_price: parseFloat(e.target.value) || 0 })} className="h-10" placeholder="0" />
            </div>
          </div>
          {stockForm.unit_price > 0 && stockForm.sale_price > 0 && (
            <div className="text-xs text-muted-foreground">
              Margin per unit: &nbsp;
              <span className={`font-display font-bold ${stockForm.sale_price - stockForm.unit_price >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {fmt(stockForm.sale_price - stockForm.unit_price)} ({((stockForm.sale_price - stockForm.unit_price) / stockForm.unit_price * 100).toFixed(1)}%)
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">HSN Code</label>
              <Input value={stockForm.hsn_code} onChange={e => setStockForm({ ...stockForm, hsn_code: e.target.value })} className="h-10" placeholder="8517" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">IMEIs Scanned</label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-accent/50 text-sm font-display font-bold">
                {stockForm.imeis.split('\n').filter(v => /^\d{15}$/.test(v.trim())).length} units
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">IMEI Numbers (one per line)</label>
            <Textarea value={stockForm.imeis} onChange={e => setStockForm({ ...stockForm, imeis: e.target.value })} rows={5} className="font-mono text-xs" placeholder={"123456789012345\n987654321098765"} />
          </div>
          {(() => {
            const imeiCount = stockForm.imeis.split('\n').filter(v => /^\d{15}$/.test(v.trim())).length;
            const costVal = stockForm.unit_price * imeiCount;
            const saleVal = stockForm.sale_price * imeiCount;
            const margin = saleVal - costVal;
            return (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-destructive/10 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-destructive font-display">Cost Value</p>
                  <p className="font-display font-bold text-sm text-destructive">{fmt(costVal)}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-emerald-600 font-display">Sale Value</p>
                  <p className="font-display font-bold text-sm text-emerald-600">{fmt(saleVal)}</p>
                </div>
                <div className={`${margin >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'} rounded-xl p-2.5 text-center`}>
                  <p className={`text-[10px] font-display ${margin >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>Expected Margin</p>
                  <p className={`font-display font-bold text-sm ${margin >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(margin)}</p>
                </div>
              </div>
            );
          })()}
          <Button onClick={handleStockEntry} className="w-full gradient-primary border-0 text-primary-foreground">Add to Inventory</Button>
        </div>
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment" subtitle={`${selectedDealer?.dealer_name} · Balance: ${fmt(totals.current)}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Settle From</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[['opening_credit', 'Opening Credit', fmt(totals.availableOpeningCredit)], ['sold_cost', 'Sold Cost', fmt(totals.availableSoldCost)], ['both', 'Split Both', ''], ['direct', 'Direct Payment', '']].map(([v, l, avail]) => (
                <button key={v} onClick={() => setPaymentForm({ ...paymentForm, settleFrom: v as any, amount: 0, soldCostAmount: 0, openingCreditAmount: 0 })}
                  className={`p-3 rounded-xl border text-left transition-all ${paymentForm.settleFrom === v ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent/30'}`}>
                  <p className="font-display font-bold text-xs">{l}</p>
                  {avail && <p className="text-[10px] text-muted-foreground mt-0.5">Avail: {avail}</p>}
                </button>
              ))}
            </div>
          </div>

          {paymentForm.settleFrom === 'both' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sold Cost (max: {fmt(totals.availableSoldCost)})</label>
                <Input type="number" value={paymentForm.soldCostAmount || ''} onChange={e => setPaymentForm({ ...paymentForm, soldCostAmount: parseFloat(e.target.value) || 0 })} className="h-10" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Opening (max: {fmt(totals.availableOpeningCredit)})</label>
                <Input type="number" value={paymentForm.openingCreditAmount || ''} onChange={e => setPaymentForm({ ...paymentForm, openingCreditAmount: parseFloat(e.target.value) || 0 })} className="h-10" />
              </div>
              <div className="col-span-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                Total: <span className="font-display font-bold text-primary">{fmt(paymentForm.soldCostAmount + paymentForm.openingCreditAmount)}</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {paymentForm.settleFrom === 'direct' ? 'Amount' : `Amount (max: ${paymentForm.settleFrom === 'sold_cost' ? fmt(totals.availableSoldCost) : fmt(totals.availableOpeningCredit)})`}
              </label>
              <Input type="number" value={paymentForm.amount || ''} onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} className="h-11 text-lg font-mono" placeholder="0" />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Method(s)</label>
            <div className="flex flex-wrap gap-2">
              {['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'].map(m => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={paymentForm.paymentMethods.includes(m)} onCheckedChange={checked => setPaymentForm({ ...paymentForm, paymentMethods: checked ? [...paymentForm.paymentMethods, m] : paymentForm.paymentMethods.filter(x => x !== m) })} />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
            <Input value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="h-10" placeholder="Reference / remarks" />
          </div>
          <Button onClick={handlePayment} className="w-full gradient-primary border-0 text-primary-foreground">Record Payment</Button>
        </div>
      </Modal>

      {/* ── Return Stock Modal ── */}
      <Modal open={showReturnForm} onClose={() => setShowReturnForm(false)} title="Return Stock" subtitle="Removes from inventory and reduces balance">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">IMEI Number</label>
            <Input value={returnForm.imei} onChange={e => setReturnForm({ ...returnForm, imei: e.target.value })} className="h-11 font-mono" placeholder="15-digit IMEI" maxLength={15} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Return Reason (optional)</label>
            <Input value={returnForm.reason} onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })} className="h-10" placeholder="Defective, wrong model..." />
          </div>
          <Button onClick={handleStockReturn} className="w-full gradient-primary border-0 text-primary-foreground">Process Return</Button>
        </div>
      </Modal>

      {/* ── Edit Opening Credit Modal ── */}
      <Modal open={showEditCredit} onClose={() => setShowEditCredit(false)} title="Edit Opening Credit">
        <div className="space-y-4">
          <div className="rounded-xl bg-secondary/50 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Opening:</span><span className="font-bold">{fmt(totals.opening)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Current Balance:</span><span className="font-bold">{fmt(totals.current)}</span></div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Opening Credit (₹)</label>
            <Input type="number" value={editCreditValue || ''} onChange={e => setEditCreditValue(parseFloat(e.target.value) || 0)} className="h-11 text-lg font-mono" />
          </div>
          <Button onClick={handleEditOpeningCredit} className="w-full gradient-primary border-0 text-primary-foreground">Update Opening Credit</Button>
        </div>
      </Modal>

      {/* ── Report Modal ── */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Dealer Report" subtitle="Product purchase, sold and return counts">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setReportDealerMode('selected')} className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold border transition-all ${reportDealerMode === 'selected' ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
              {selectedDealer?.dealer_name || 'Selected Dealer'}
            </button>
            <button onClick={() => setReportDealerMode('all')} className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold border transition-all ${reportDealerMode === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
              All Dealers
            </button>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="text-left font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Dealer</th>
                  <th className="px-3 py-2 text-center">Purchases</th>
                  <th className="px-3 py-2 text-center">Sold</th>
                  <th className="px-3 py-2 text-center">Returns</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {buildReportData().map(r => (
                  <tr key={r.dealer.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-display font-semibold">{r.dealer.dealer_name}</div>
                      <div className="text-[10px] text-muted-foreground">{r.dealer.brand_name}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="font-bold text-destructive">{r.purchaseCount}</div>
                      <div className="text-[10px] text-muted-foreground">{fmt(r.purchase)}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="font-bold text-primary">{r.soldCount}</div>
                      <div className="text-[10px] text-muted-foreground">{fmt(r.sold)}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="font-bold text-warning">{r.returnCount}</div>
                      <div className="text-[10px] text-muted-foreground">{fmt(r.returned)}</div>
                    </td>
                    <td className={`px-3 py-2 text-right font-display font-bold ${getBalanceTone(r.balance)}`}>{fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={downloadDealerCSV} className="w-full" variant="outline">
            <Download className="w-4 h-4 mr-2" /> Download CSV Report
          </Button>
        </div>
      </Modal>

      {/* ── Dealer Statement Modal ── */}
      {showStatement && selectedDealer && (
        <DealerStatement
          dealer={selectedDealer}
          allTxns={allTxns}
          onClose={() => setShowStatement(false)}
        />
      )}
    </div>
  );
};
