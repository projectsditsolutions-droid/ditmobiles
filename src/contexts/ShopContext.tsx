import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Shop = Database['public']['Tables']['shops']['Row'];
type ShopSettings = Database['public']['Tables']['shop_settings']['Row'];

interface ShopContextType {
  shops: Shop[];
  activeShop: Shop | null;
  activeShopId: string | null;
  /** All shop IDs the user has access to */
  allShopIds: string[];
  /** True when "All Shops" is selected */
  isAllShops: boolean;
  settings: ShopSettings | null;
  setActiveShopId: (id: string) => void;
  refreshShops: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const ShopContext = createContext<ShopContextType>({
  shops: [], activeShop: null, activeShopId: null, allShopIds: [], isAllShops: false, settings: null,
  setActiveShopId: () => {}, refreshShops: async () => {}, refreshSettings: async () => {},
  loading: true,
});

export const ALL_SHOPS_ID = '__all__';

export const useShop = () => useContext(ShopContext);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShopId, setActiveShopIdState] = useState<string | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const allShopIds = shops.map(s => s.id);
  const isAllShops = activeShopId === ALL_SHOPS_ID;

  const refreshShops = async () => {
    if (!user) return;
    const { data } = await supabase.from('shops').select('*').order('created_at');
    if (data) {
      setShops(data);
      if (!activeShopId && data.length > 0) {
        setActiveShopIdState(data[0].id);
      }
    }
    setLoading(false);
  };

  const refreshSettings = async () => {
    if (!activeShopId || isAllShops) return;
    const { data } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('shop_id', activeShopId)
      .maybeSingle();
    setSettings(data);
  };

  useEffect(() => {
    if (user) refreshShops();
  }, [user]);

  useEffect(() => {
    if (activeShopId && !isAllShops) refreshSettings();
  }, [activeShopId]);

  // Realtime: refresh shops & settings when developer makes changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('shop-updates-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, () => {
        refreshShops();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_settings' }, () => {
        if (activeShopId && !isAllShops) refreshSettings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_payments' }, () => {
        // trigger a window event so MaintenanceCharge / Reminder can refetch
        window.dispatchEvent(new CustomEvent('maintenance-payments-changed'));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeShopId, isAllShops]);

  const setActiveShopId = (id: string) => {
    setActiveShopIdState(id);
    localStorage.setItem('pos_active_shop', id);
  };

  // Restore active shop from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos_active_shop');
    if (saved) setActiveShopIdState(saved);
  }, []);

  const activeShop = isAllShops ? null : (shops.find(s => s.id === activeShopId) || shops[0] || null);

  return (
    <ShopContext.Provider value={{
      shops, activeShop, activeShopId: isAllShops ? ALL_SHOPS_ID : (activeShop?.id || null),
      allShopIds, isAllShops, settings,
      setActiveShopId, refreshShops, refreshSettings, loading,
    }}>
      {children}
    </ShopContext.Provider>
  );
};
