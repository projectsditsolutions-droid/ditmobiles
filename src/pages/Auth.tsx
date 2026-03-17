import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome back!');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account created! Check your email to verify, then sign in.');
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] gradient-primary flex-col justify-between p-10 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-6 h-6" />
            </div>
            <span className="font-display text-2xl font-extrabold tracking-tight">MobilePOS</span>
          </div>
          <p className="text-primary-foreground/80 text-sm mt-1">GST Billing & Inventory Management</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            India's Smartest<br />Mobile Shop<br />Billing Software
          </h2>
          <div className="space-y-3">
            {[
              'IMEI-based inventory tracking',
              'GST compliant B2B & B2C billing',
              'Dealer ledger with auto-deduction',
              'Multi-shop, multi-device sync',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">✓</div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/50">
          Trusted by 500+ mobile retailers across Tamil Nadu
        </p>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary-foreground/5" />
        <div className="absolute -bottom-32 -left-16 w-64 h-64 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-3 shadow-lg">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-extrabold">MobilePOS</h1>
            <p className="text-muted-foreground text-sm mt-1">GST Billing & Inventory</p>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold">{isLogin ? 'Welcome back' : 'Create account'}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin ? 'Sign in to access your shop dashboard' : 'Get started with your shop in minutes'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="pl-10 h-11" required />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 h-11" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" className="pl-10 pr-10 h-11" minLength={6} required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full h-12 gradient-primary border-0 text-primary-foreground font-display font-semibold shadow-md hover:shadow-lg transition-shadow" disabled={loading}>
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline">
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
