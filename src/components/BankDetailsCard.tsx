import React, { useState } from 'react';
import { Building2, Copy, Check, Smartphone, User } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  amount: number;
  fyLabel?: string;
  compact?: boolean;
}

const BANK = {
  accountName: 'Udhayarasu E',
  accountNumber: '7110374437',
  ifsc: 'IDIB000C045',
  bankName: 'Indian Bank',
};

export const BankDetailsCard: React.FC<Props> = ({ amount, fyLabel, compact = false }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 1500);
  };

  const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-sm font-display font-bold truncate ${mono ? 'tracking-wide' : ''}`}>{value}</p>
      </div>
      <button
        onClick={() => copy(label, value)}
        className="flex-shrink-0 p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
        aria-label={`Copy ${label}`}
      >
        {copied === label ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className={`rounded-xl border-2 border-primary/20 bg-primary/5 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-display font-extrabold">Pay via Bank Transfer / UPI</p>
          <p className="text-[10px] text-muted-foreground">
            Transfer ₹{amount.toLocaleString('en-IN')}{fyLabel ? ` for ${fyLabel}` : ''}, then mark as paid below
          </p>
        </div>
      </div>

      <div className="bg-background rounded-lg px-3">
        <Row label="Account Holder" value={BANK.accountName} />
        <Row label="Account Number" value={BANK.accountNumber} mono />
        <Row label="IFSC Code" value={BANK.ifsc} mono />
        <Row label="Bank" value={BANK.bankName} />
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
        <Smartphone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>After transfer, share screenshot/UTR with admin and click <span className="font-bold text-foreground">"Mark as Paid"</span> with reference number in notes.</p>
      </div>
    </div>
  );
};