import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Delete, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm">
      <div className="bg-card rounded-xl p-8 shadow-2xl w-80 flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">Enter PIN</h2>

        {locked ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Locked. Try again in 30s</span>
          </div>
        ) : error ? (
          <p className="text-destructive text-sm font-medium">Wrong PIN. {3 - attempts} attempts left.</p>
        ) : null}

        {/* PIN dots */}
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-100 ${
                i < pin.length ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/40'
              } ${error ? 'border-destructive' : ''}`}
            />
          ))}
        </div>

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
            <button
              key={i}
              disabled={locked || key === ''}
              onClick={() => key === '⌫' ? handleDelete() : key !== '' && handleDigit(key)}
              className={`w-16 h-14 rounded-lg font-display text-xl font-semibold transition-all duration-75 
                ${key === '' ? 'invisible' : 'bg-secondary hover:bg-accent active:scale-95 text-foreground'}
                ${locked ? 'opacity-40' : ''}`}
            >
              {key === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
          Cancel
        </Button>

        <input ref={inputRef} className="sr-only" />
      </div>
    </div>
  );
};
