import React from 'react';
import { useShop, ALL_SHOPS_ID } from '@/contexts/ShopContext';
import { Store, Layers } from 'lucide-react';

export const ShopSelector: React.FC = () => {
  const { shops, activeShopId, setActiveShopId, isAllShops } = useShop();

  if (shops.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      {isAllShops ? <Layers className="w-4 h-4 text-primary" /> : <Store className="w-4 h-4 text-primary" />}
      <select
        value={activeShopId || ''}
        onChange={e => setActiveShopId(e.target.value)}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm font-display font-medium focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value={ALL_SHOPS_ID}>🏪 All Shops (Combined)</option>
        {shops.map(s => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.gst_number}
          </option>
        ))}
      </select>
    </div>
  );
};
