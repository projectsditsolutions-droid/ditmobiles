import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Delete, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PinModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => boolean;
  attempts: number;
  locked: boolean;
}

export const PinModal: React.FC<PinModalProps> = ({ open, onClose, onSubmit, attempts, locked }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);
    if (newPin.length >= 4) {
      const ok = onSubmit(newPin);
      if (!ok) {
        setError(true);
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-md">
      <div className="bg-card rounded-2xl p-8 shadow-2xl w-80 flex flex-col items-center gap-6 animate-scale-in border">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-xl font-extrabold text-foreground">Enter PIN</h2>
          <p className="text-xs text-muted-foreground mt-1">Access protected module</p>
        </div>

        {locked ? (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-display font-semibold">Locked for 30s</span>
          </div>
        ) : error ? (
          <p className="text-destructive text-sm font-display font-semibold bg-destructive/10 px-3 py-1.5 rounded-lg">Wrong PIN · {3 - attempts} left</p>
        ) : null}

        {/* PIN dots */}
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length ? 'bg-primary border-primary scale-125' : 'border-muted-foreground/30'
              } ${error ? 'border-destructive bg-destructive' : ''}`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
            <button key={i} disabled={locked || key === ''}
              onClick={() => key === '⌫' ? handleDelete() : key !== '' && handleDigit(key)}
              className={`w-16 h-14 rounded-xl font-display text-xl font-bold transition-all duration-100
                ${key === '' ? 'invisible' : 'bg-secondary hover:bg-accent active:scale-95 active:bg-primary/10 text-foreground'}
                ${locked ? 'opacity-30' : ''}`}>
              {key === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          Cancel
        </Button>

        <input ref={inputRef} className="sr-only" />
      </div>
    </div>
  );
};
