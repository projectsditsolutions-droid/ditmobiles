import React from 'react';
import { BillItem } from '@/types';
import { X } from 'lucide-react';

interface Props {
  item: BillItem;
  index: number;
  flash: boolean;
  onRemove: () => void;
  onUpdateDiscount: (value: number, type: 'percentage' | 'flat') => void;
  discountEnabled: boolean;
}

export const BillItemRow: React.FC<Props> = ({ item, index, flash, onRemove, onUpdateDiscount, discountEnabled }) => {
  return (
    <tr className={`border-b hover:bg-accent/50 transition-colors ${flash ? 'imei-flash' : ''}`}>
      <td className="px-3 py-2.5 text-muted-foreground">{index + 1}</td>
      <td className="px-3 py-2.5">
        <div className="font-medium font-display text-sm">{item.product.brand} {item.product.model}</div>
        <div className="text-xs text-muted-foreground">{item.product.variant} · {item.product.color}</div>
      </td>
      <td className="px-3 py-2.5">
        <span className="imei-text text-xs">{item.imei || '—'}</span>
      </td>
      <td className="px-3 py-2.5 text-right price-text">₹{item.unitPrice.toLocaleString('en-IN')}</td>
      <td className="px-3 py-2.5 text-right">
        {discountEnabled ? (
          <input
            type="number"
            value={item.discountValue || ''}
            onChange={e => onUpdateDiscount(Number(e.target.value), item.discountType)}
            className="w-16 h-7 text-right text-xs rounded border bg-background px-1 focus:outline-none focus:border-primary"
            placeholder="0"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right price-text">₹{item.total.toLocaleString('en-IN')}</td>
      <td className="px-3 py-2.5">
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};
