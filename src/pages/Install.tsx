import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle, Share } from 'lucide-react';

const Install: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-lg">
          <img src="/pwa-512x512.png" alt="DIT Mobiles" className="w-full h-full object-cover" />
        </div>
        
        <div>
          <h1 className="font-display text-3xl font-black text-foreground">DIT Mobiles</h1>
          <p className="text-muted-foreground mt-2">POS & Billing App</p>
        </div>

        {isInstalled ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">App is installed!</span>
          </div>
        ) : isIOS ? (
          <div className="bg-card border rounded-xl p-5 text-left space-y-3">
            <p className="font-display font-bold text-sm">Install on iPhone/iPad:</p>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Share className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>Tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Home Screen"</strong></span>
            </div>
          </div>
        ) : deferredPrompt ? (
          <Button size="lg" className="gradient-primary text-primary-foreground w-full h-12 text-base" onClick={handleInstall}>
            <Download className="w-5 h-5 mr-2" /> Install App
          </Button>
        ) : (
          <div className="bg-card border rounded-xl p-5 text-left space-y-3">
            <p className="font-display font-bold text-sm">Install from browser menu:</p>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Smartphone className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>Open browser menu (⋮) → <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></span>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
          Open App in Browser
        </Button>
      </div>
    </div>
  );
};

export default Install;
