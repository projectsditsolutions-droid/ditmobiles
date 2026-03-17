import React from 'react';
import { getShops, getActiveShopId, setActiveShopId } from '@/lib/store';
import { Store } from 'lucide-react';

export const ShopSelector: React.FC = () => {
  const shops = getShops();
  const activeId = getActiveShopId();

  return (
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-primary" />
      <select
        value={activeId}
        onChange={e => {
          setActiveShopId(e.target.value);
          window.location.reload();
        }}
        className="h-9 px-3 rounded-md border bg-background text-sm font-display font-medium focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {shops.map(s => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.gstNumber}
          </option>
        ))}
      </select>
    </div>
  );
};
