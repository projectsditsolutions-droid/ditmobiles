import React from 'react';
import { X, Tag, Layers3 } from 'lucide-react';

interface BillItem {
  id: string;
  product: { brand: string; model: string; variant: string; color: string; sale_price: number };
  imei?: string;
  quantity: number;
  unitPrice: number;
  discountValue: number;
  discountType: 'percentage' | 'flat';
  total: number;
}

interface Props {
  item: BillItem;
  index: number;
  flash: boolean;
  onRemove: () => void;
  onUpdateDiscount: (value: number, type: 'percentage' | 'flat') => void;
  onUpdatePrice: (price: number) => void;
  discountEnabled: boolean;
}

export const BillItemRow: React.FC<Props> = ({ item, index, flash, onRemove, onUpdateDiscount, onUpdatePrice, discountEnabled }) => {
  return (
    <tr className={`border-b border-border/50 hover:bg-accent/30 transition-all duration-150 ${flash ? 'imei-flash' : ''}`}>
      <td className="px-4 py-3 text-muted-foreground font-display text-xs">{index + 1}</td>
      <td className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display font-semibold text-sm">{item.product.brand} {item.product.model}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.product.variant} · {item.product.color}</div>
          </div>
          {item.quantity > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-display font-bold">
              <Layers3 className="w-3 h-3" /> Qty {item.quantity}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs bg-secondary/60 px-2 py-1 rounded-md">{item.imei || '—'}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <input
          type="number"
          value={item.unitPrice || ''}
          onChange={e => onUpdatePrice(Number(e.target.value))}
          className="w-24 h-7 text-right text-sm font-display font-semibold rounded-md border border-input bg-card px-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          min={0}
        />
        {item.quantity > 1 && <div className="text-[10px] text-muted-foreground">× {item.quantity}</div>}
      </td>
      <td className="px-4 py-3 text-right">
        {discountEnabled ? (
          <div className="flex items-center justify-end gap-1">
            <Tag className="w-3 h-3 text-muted-foreground" />
            <input
              type="number"
              value={item.discountValue || ''}
              onChange={e => onUpdateDiscount(Number(e.target.value), item.discountType)}
              className="w-16 h-7 text-right text-xs rounded-md border border-input bg-card px-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              placeholder="0"
            />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="price-text text-sm text-primary">₹{item.total.toLocaleString('en-IN')}</span>
      </td>
      <td className="px-4 py-3">
        <button onClick={onRemove} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};
