import React, { useState } from 'react';
import { getDealers, saveDealers, getDealerTxns, saveDealerTxns } from '@/lib/store';
import { Dealer, DealerTransaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, User, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export const DealerLedger: React.FC = () => {
  const [dealers, setDealers] = useState<Dealer[]>(getDealers());
  const [txns, setTxns] = useState<DealerTransaction[]>(getDealerTxns());
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', gstin: '' });
  const [txnForm, setTxnForm] = useState({ type: 'purchase' as 'purchase' | 'payment', amount: 0, description: '' });

  const handleAddDealer = () => {
    if (!form.name) { toast.error('Name required'); return; }
    const dealer: Dealer = { id: crypto.randomUUID(), ...form, outstandingBalance: 0 };
    const updated = [...dealers, dealer];
    setDealers(updated);
    saveDealers(updated);
    setShowForm(false);
    setForm({ name: '', phone: '', address: '', gstin: '' });
    toast.success('Dealer added');
  };

  const handleAddTxn = () => {
    if (!selectedDealer || txnForm.amount <= 0) return;
    const txn: DealerTransaction = {
      id: crypto.randomUUID(), dealerId: selectedDealer, type: txnForm.type,
      amount: txnForm.amount, date: new Date().toISOString(), description: txnForm.description,
    };
    const updatedTxns = [...txns, txn];
    setTxns(updatedTxns);
    saveDealerTxns(updatedTxns);

    // Update balance
    const updatedDealers = dealers.map(d => {
      if (d.id !== selectedDealer) return d;
      return { ...d, outstandingBalance: d.outstandingBalance + (txnForm.type === 'purchase' ? txnForm.amount : -txnForm.amount) };
    });
    setDealers(updatedDealers);
    saveDealers(updatedDealers);
    setTxnForm({ type: 'purchase', amount: 0, description: '' });
    toast.success('Transaction recorded');
  };

  const selectedDealerObj = dealers.find(d => d.id === selectedDealer);
  const dealerTxns = txns.filter(t => t.dealerId === selectedDealer);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Dealer Ledger</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add Dealer</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl p-6 shadow-2xl w-[400px]">
            <h2 className="font-display font-bold text-lg mb-4">Add Dealer</h2>
            <div className="space-y-3">
              {[['name', 'Name *'], ['phone', 'Phone'], ['address', 'Address'], ['gstin', 'GSTIN']].map(([f, l]) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground mb-1 block">{l}</label>
                  <input value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleAddDealer}>Add</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Dealer List */}
        <div className="col-span-1 space-y-2">
          {dealers.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDealer(d.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedDealer === d.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-display font-medium text-sm">{d.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{d.phone}</p>
              <p className={`text-sm font-display font-bold mt-1 ${d.outstandingBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                ₹{Math.abs(d.outstandingBalance).toLocaleString('en-IN')} {d.outstandingBalance > 0 ? 'Due' : 'Credit'}
              </p>
            </button>
          ))}
          {dealers.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No dealers added yet.</p>}
        </div>

        {/* Dealer Detail */}
        <div className="col-span-2">
          {selectedDealerObj ? (
            <div className="bg-card rounded-xl border p-4">
              <h2 className="font-display font-bold text-lg">{selectedDealerObj.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedDealerObj.phone} · {selectedDealerObj.gstin}</p>
              <p className={`text-xl font-display font-extrabold mt-2 ${selectedDealerObj.outstandingBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                ₹{Math.abs(selectedDealerObj.outstandingBalance).toLocaleString('en-IN')} {selectedDealerObj.outstandingBalance > 0 ? 'Outstanding' : 'Credit'}
              </p>

              {/* Add Transaction */}
              <div className="flex gap-2 mt-4">
                <select value={txnForm.type} onChange={e => setTxnForm({...txnForm, type: e.target.value as any})} className="h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="purchase">Purchase</option>
                  <option value="payment">Payment</option>
                </select>
                <input type="number" value={txnForm.amount || ''} onChange={e => setTxnForm({...txnForm, amount: Number(e.target.value)})} placeholder="Amount" className="w-28 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none" />
                <input value={txnForm.description} onChange={e => setTxnForm({...txnForm, description: e.target.value})} placeholder="Note" className="flex-1 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none" />
                <Button size="sm" onClick={handleAddTxn}>Add</Button>
              </div>

              {/* Transactions */}
              <div className="mt-4 space-y-1">
                {dealerTxns.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b text-sm">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'purchase' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {t.type}
                      </span>
                      <span className="ml-2 text-muted-foreground">{t.description}</span>
                    </div>
                    <div className="text-right">
                      <span className="price-text">₹{t.amount.toLocaleString('en-IN')}</span>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                ))}
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
