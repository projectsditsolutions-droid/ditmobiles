import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Store, ArrowRight, MapPin, Phone, Hash, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onComplete: () => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', address: '', phone: '', gstNumber: '', invoicePrefix: 'INV',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { data: shop, error: shopError } = await supabase.from('shops').insert({
      name: form.name, address: form.address, phone: form.phone,
      gst_number: form.gstNumber, invoice_prefix: form.invoicePrefix, created_by: user.id,
    }).select().single();

    if (shopError || !shop) {
      toast.error('Failed to create shop: ' + shopError?.message);
      setLoading(false);
      return;
    }

    await supabase.from('shop_memberships').insert({ user_id: user.id, shop_id: shop.id, role: 'admin' as const });
    await supabase.from('shop_settings').insert({ shop_id: shop.id });

    toast.success('Shop created successfully!');
    onComplete();
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map(s => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold transition-all ${
                s <= step ? 'gradient-primary text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground'
              }`}>{s}</div>
              {s < 2 && <div className={`flex-1 h-1 rounded-full transition-all ${s < step ? 'bg-primary' : 'bg-border'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-4">
            <Store className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-2xl font-extrabold">Set Up Your Shop</h1>
          <p className="text-muted-foreground mt-2 text-sm">Let's configure your shop profile for billing</p>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Shop Name *</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="My Mobile Shop" className="pl-10 h-11" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main Road, Chennai" className="pl-10 h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="9876543210" className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Invoice Prefix</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={form.invoicePrefix} onChange={e => setForm({...form, invoicePrefix: e.target.value})} placeholder="INV" className="pl-10 h-11" />
                    </div>
                  </div>
                </div>
                <Button type="button" size="lg" className="w-full" onClick={() => { if (form.name) setStep(2); else toast.error('Shop name is required'); }}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">GST Number (GSTIN)</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value})} placeholder="33XXXXX1234X1Z5" className="pl-10 h-11 font-mono" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">You can add this later in Settings</p>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" size="lg" className="flex-1 gradient-primary border-0 text-primary-foreground" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Shop'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
