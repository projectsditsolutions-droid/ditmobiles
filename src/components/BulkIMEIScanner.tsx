import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ScanLine, Trash2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface Props {
  imeis: string;
  onChange: (val: string) => void;
  unitPrice: number;
  imeiCount: number;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const BulkIMEIScanner: React.FC<Props> = ({ imeis, onChange, unitPrice, imeiCount }) => {
  const [scanBuffer, setScanBuffer] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imeiList = imeis.split('\n').map(v => v.trim()).filter(Boolean);
  const validImeis = imeiList.filter(v => /^\d{15}$/.test(v));
  const invalidImeis = imeiList.filter(v => v && !/^\d{15}$/.test(v));

  const commitIMEI = useCallback((imei: string) => {
    const trimmed = imei.trim();
    if (!/^\d{15}$/.test(trimmed)) return;

    // Check duplicates
    const existing = imeis.split('\n').map(v => v.trim()).filter(Boolean);
    if (existing.includes(trimmed)) {
      setDuplicateWarning(trimmed);
      setTimeout(() => setDuplicateWarning(''), 2000);
      setScanBuffer('');
      return;
    }

    const updated = existing.length > 0 ? [...existing, trimmed].join('\n') : trimmed;
    onChange(updated);
    setLastScanned(trimmed);
    setScanBuffer('');
    setDuplicateWarning('');

    // Flash success
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 600);
  }, [imeis, onChange]);

  const handleScanInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setScanBuffer(val);

    // Auto-commit when 15 digits reached
    if (val.length >= 15) {
      const imei = val.slice(0, 15);
      // Small delay to let barcode scanner finish
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => commitIMEI(imei), 50);
    }
  }, [commitIMEI]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanBuffer.length > 0) {
      e.preventDefault();
      if (/^\d{15}$/.test(scanBuffer)) {
        commitIMEI(scanBuffer);
      }
    }
  }, [scanBuffer, commitIMEI]);

  const removeIMEI = useCallback((idx: number) => {
    const list = imeis.split('\n').map(v => v.trim()).filter(Boolean);
    list.splice(idx, 1);
    onChange(list.join('\n'));
  }, [imeis, onChange]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-primary" />
        Bulk IMEI Scanner (auto-detects 15-digit codes)
      </label>

      {/* Scanner input */}
      <div className={`relative transition-all duration-300 ${flashSuccess ? 'ring-2 ring-green-500/60 rounded-xl' : ''}`}>
        <ScanLine className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${flashSuccess ? 'text-green-500' : 'text-primary'}`} />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={scanBuffer}
          onChange={handleScanInput}
          onKeyDown={handleKeyDown}
          placeholder="Scan or type IMEI — auto-adds at 15 digits"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/60"
          autoComplete="off"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
          {scanBuffer.length}/15
        </span>
      </div>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5" />
          Duplicate IMEI: {duplicateWarning}
        </div>
      )}

      {/* Last scanned feedback */}
      {lastScanned && !duplicateWarning && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Last scanned: {lastScanned}
        </div>
      )}

      {/* Scanned IMEI list */}
      {validImeis.length > 0 && (
        <div className="bg-accent/30 rounded-xl border max-h-40 overflow-y-auto">
          <div className="divide-y divide-border/50">
            {validImeis.map((imei, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-1.5 group hover:bg-accent/50 transition-colors">
                <span className="font-mono text-xs">{imei}</span>
                <button
                  onClick={() => removeIMEI(idx)}
                  className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invalid warnings */}
      {invalidImeis.length > 0 && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {invalidImeis.length} invalid IMEI(s) detected
        </div>
      )}

      {/* Summary */}
      {imeiCount > 0 && (
        <p className="text-xs text-green-600 dark:text-green-400 font-display font-semibold">
          Line total: {imeiCount} × {fmt(unitPrice)} = {fmt(imeiCount * unitPrice)}
        </p>
      )}
    </div>
  );
};
