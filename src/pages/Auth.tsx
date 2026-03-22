import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff, Smartphone, ShieldCheck, BarChart3, Store } from 'lucide-react';
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

  const features = [
    { icon: Smartphone, title: 'IMEI Tracking', desc: 'Track every device with IMEI-based inventory' },
    { icon: ShieldCheck, title: 'GST Compliant', desc: 'B2B & B2C billing with auto tax split' },
    { icon: BarChart3, title: 'Smart Reports', desc: 'Real-time sales analytics & profit tracking' },
    { icon: Store, title: 'Multi-Shop', desc: 'Manage multiple stores from one dashboard' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[600px] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, hsl(230 80% 52%), hsl(230 80% 40%), hsl(250 70% 35%))' }}>
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-display text-2xl font-extrabold tracking-tight text-white">MobilePOS</span>
              <p className="text-white/60 text-xs font-medium tracking-wide uppercase">GST Billing Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display text-[2.5rem] font-extrabold leading-[1.1] text-white">
              India's Smartest
              <br />
              <span className="text-white/80">Mobile Shop</span>
              <br />
              Billing Software
            </h2>
            <p className="text-white/50 mt-4 text-sm max-w-[320px] leading-relaxed">
              Everything you need to run your mobile retail business — billing, inventory, GST compliance, and more.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="group rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/10 p-4 hover:bg-white/[0.12] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                  <f.icon className="w-4.5 h-4.5 text-white/90" />
                </div>
                <h3 className="text-white font-display font-bold text-sm">{f.title}</h3>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-7 h-7 rounded-full bg-white/20 border-2 border-white/10 flex items-center justify-center text-[10px] font-bold text-white/70">
                {['R', 'S', 'K', 'A'][i - 1]}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40">
            Trusted by <span className="text-white/70 font-semibold">500+</span> retailers across Tamil Nadu
          </p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/[0.03] blur-xl" />
        <div className="absolute -bottom-48 -left-24 w-80 h-80 rounded-full bg-white/[0.03] blur-xl" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4"
              style={{ background: 'linear-gradient(135deg, hsl(230 80% 56%), hsl(250 70% 45%))' }}>
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">MobilePOS</h1>
            <p className="text-muted-foreground text-sm mt-1">GST Billing & Inventory</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-muted rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-display font-semibold rounded-lg transition-all ${
                isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-display font-semibold rounded-lg transition-all ${
                !isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-7">
            <h2 className="font-display text-[1.6rem] font-bold text-foreground leading-tight">
              {isLogin ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isLogin ? 'Sign in to access your shop dashboard' : 'Create your account in seconds'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="pl-11 h-12 rounded-xl bg-muted/50 border-border/60 focus:bg-card text-sm" required />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-11 h-12 rounded-xl bg-muted/50 border-border/60 focus:bg-card text-sm" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" className="pl-11 pr-11 h-12 rounded-xl bg-muted/50 border-border/60 focus:bg-card text-sm" minLength={6} required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 rounded-xl border-0 font-display font-bold text-[15px] shadow-md hover:shadow-lg transition-all mt-2"
              style={{ background: 'linear-gradient(135deg, hsl(230 80% 56%), hsl(250 70% 45%))' }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
