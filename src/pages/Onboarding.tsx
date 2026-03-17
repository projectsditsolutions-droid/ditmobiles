import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Store, ArrowRight } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Create shop
    const { data: shop, error: shopError } = await supabase.from('shops').insert({
      name: form.name,
      address: form.address,
      phone: form.phone,
      gst_number: form.gstNumber,
      invoice_prefix: form.invoicePrefix,
      created_by: user.id,
    }).select().single();

    if (shopError || !shop) {
      toast.error('Failed to create shop: ' + shopError?.message);
      setLoading(false);
      return;
    }

    // Create shop membership
    await supabase.from('shop_memberships').insert({
      user_id: user.id,
      shop_id: shop.id,
      role: 'admin' as const,
    });

    // Create default settings
    await supabase.from('shop_settings').insert({
      shop_id: shop.id,
    });

    toast.success('Shop created successfully!');
    onComplete();
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-primary/5">
      <div className="w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Set Up Your Shop</h1>
          <p className="text-muted-foreground mt-2">Create your first shop profile to get started</p>
        </div>

        <div className="bg-card rounded-2xl border shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Shop Name *</label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="My Mobile Shop" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main Road, Chennai" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="9876543210" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Invoice Prefix</label>
                <Input value={form.invoicePrefix} onChange={e => setForm({...form, invoicePrefix: e.target.value})} placeholder="INV" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">GST Number</label>
              <Input value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value})} placeholder="33XXXXX1234X1Z5" />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Shop & Start'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
