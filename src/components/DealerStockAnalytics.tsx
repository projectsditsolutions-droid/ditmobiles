import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import {
  ChevronDown, ChevronRight, Package, IndianRupee,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type IMEIRecord = Database['public']['Tables']['imei_records']['Row'];

interface ModelData {
  model: string;
  variant: string;
  color: string;
  productId: string;
  inStock: number;
  sold: number;
  avgCost: number;
  avgSalePrice: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  marginPct: number;
  stockValue: number;
}

interface BrandGroup {
  brand: string;
  models: ModelData[];
  inStock: number;
  sold: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  stockValue: number;
  avgMarginPct: number;
}

interface Props {
  dealerId: string;
}

export const DealerStockAnalytics: React.FC<Props> = ({ dealerId }) => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [imeis, setImeis] = useState<IMEIRecord[]>([]);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId && !isAllShops) return;
    const fetchData = async () => {
      setLoading(true);
      let iQ = supabase.from('imei_records').select('*').eq('dealer_id', dealerId);
      if (isAllShops) iQ = iQ.in('shop_id', allShopIds);
      else iQ = iQ.eq('shop_id', activeShopId!);

      const { data: imeiData } = await iQ;
      if (!imeiData || imeiData.length === 0) {
        setImeis([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      const productIds = [...new Set(imeiData.map(r => r.product_id))];
      // Fetch products in batches of 100
      const allProducts: Product[] = [];
      for (let i = 0; i < productIds.length; i += 100) {
        const batch = productIds.slice(i, i + 100);
        const { data: pData } = await supabase.from('products').select('*').in('id', batch);
        if (pData) allProducts.push(...pData);
      }

      setImeis(imeiData);
      setProducts(allProducts);
      setLoading(false);
    };
    fetchData();
  }, [dealerId, activeShopId]);

  const brandData = useMemo(() => {
    const map = new Map<string, BrandGroup>();

    products.forEach(p => {
      const brandKey = (p.brand || 'Other').toLowerCase();
      const brandName = p.brand || 'Other';
      const productImeis = imeis.filter(r => r.product_id === p.id);
      if (productImeis.length === 0) return;

      const inStockImeis = productImeis.filter(r => r.status === 'in_stock');
      const soldImeis = productImeis.filter(r => r.status === 'sold');

      const totalCost = soldImeis.reduce((s, r) => s + (Number(r.purchase_price) > 0 ? Number(r.purchase_price) : Number(p.purchase_price)), 0);
      const totalRevenue = soldImeis.reduce((s, r) => s + (Number(r.sale_price) > 0 ? Number(r.sale_price) : Number(p.sale_price)), 0);
      const stockValue = inStockImeis.reduce((s, r) => s + (Number(r.purchase_price) > 0 ? Number(r.purchase_price) : Number(p.purchase_price)), 0);
      const profit = totalRevenue - totalCost;
      const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      const avgCost = productImeis.length > 0
        ? productImeis.reduce((s, r) => s + (Number(r.purchase_price) > 0 ? Number(r.purchase_price) : Number(p.purchase_price)), 0) / productImeis.length
        : Number(p.purchase_price);
      const avgSale = productImeis.length > 0
        ? productImeis.reduce((s, r) => s + (Number(r.sale_price) > 0 ? Number(r.sale_price) : Number(p.sale_price)), 0) / productImeis.length
        : Number(p.sale_price);

      const modelData: ModelData = {
        model: p.model, variant: p.variant || '-', color: p.color || '-', productId: p.id,
        inStock: inStockImeis.length, sold: soldImeis.length,
        avgCost, avgSalePrice: avgSale, totalCost, totalRevenue, profit, marginPct, stockValue,
      };

      if (!map.has(brandKey)) {
        map.set(brandKey, {
          brand: brandName, models: [],
          inStock: 0, sold: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0, stockValue: 0, avgMarginPct: 0,
        });
      }
      const bd = map.get(brandKey)!;
      bd.models.push(modelData);
      bd.inStock += inStockImeis.length;
      bd.sold += soldImeis.length;
      bd.totalCost += totalCost;
      bd.totalRevenue += totalRevenue;
      bd.totalProfit += profit;
      bd.stockValue += stockValue;
    });

    map.forEach(bd => {
      bd.avgMarginPct = bd.totalRevenue > 0 ? (bd.totalProfit / bd.totalRevenue) * 100 : 0;
      bd.models.sort((a, b) => b.profit - a.profit);
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [products, imeis]);

  const totals = useMemo(() => ({
    revenue: brandData.reduce((s, b) => s + b.totalRevenue, 0),
    cost: brandData.reduce((s, b) => s + b.totalCost, 0),
    profit: brandData.reduce((s, b) => s + b.totalProfit, 0),
    stock: brandData.reduce((s, b) => s + b.inStock, 0),
    sold: brandData.reduce((s, b) => s + b.sold, 0),
    stockValue: brandData.reduce((s, b) => s + b.stockValue, 0),
    total: brandData.reduce((s, b) => s + b.inStock + b.sold, 0),
  }), [brandData]);

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  const MarginBadge = ({ pct }: { pct: number }) => {
    const color = pct > 10 ? 'text-success bg-success/10' : pct > 0 ? 'text-warning bg-warning/10' : 'text-destructive bg-destructive/10';
    const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-display font-bold ${color}`}>
        <Icon className="w-3 h-3" />{fmtPct(pct)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (brandData.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Package className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
        <p className="text-xs font-display font-medium">No stock data from this dealer</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total Units', value: String(totals.total), color: 'text-foreground' },
          { label: 'In Stock', value: String(totals.stock), color: 'text-warning' },
          { label: 'Sold', value: String(totals.sold), color: 'text-success' },
          { label: 'Revenue', value: fmt(totals.revenue), color: 'text-primary' },
          { label: 'Profit', value: fmt(totals.profit), color: 'text-success' },
          { label: 'Stock Value', value: fmt(totals.stockValue), color: 'text-destructive' },
        ].map(c => (
          <div key={c.label} className="rounded-lg border bg-background p-2.5 text-center">
            <p className="text-[9px] font-display uppercase tracking-wider text-muted-foreground mb-0.5">{c.label}</p>
            <p className={`font-display text-sm font-extrabold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Brand accordion */}
      {brandData.map(bd => {
        const isExpanded = expandedBrand === bd.brand;
        return (
          <div key={bd.brand} className="rounded-xl border overflow-hidden">
            <button
              onClick={() => setExpandedBrand(isExpanded ? null : bd.brand)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/30 transition-colors text-xs"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="font-display font-bold text-sm">{bd.brand}</span>
                <span className="text-[10px] text-muted-foreground">{bd.models.length} models</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-display font-bold">{bd.inStock} stock</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-display font-bold">{bd.sold} sold</span>
                <span className="font-display font-bold text-xs">{fmt(bd.totalRevenue)}</span>
                <MarginBadge pct={bd.avgMarginPct} />
                <span className="font-display font-bold text-xs text-warning">{fmt(bd.stockValue)}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Model</th>
                      <th className="text-left px-2 py-2 font-display font-semibold text-muted-foreground">Variant</th>
                      <th className="text-left px-2 py-2 font-display font-semibold text-muted-foreground">Color</th>
                      <th className="text-center px-2 py-2 font-display font-semibold text-muted-foreground">Stock</th>
                      <th className="text-center px-2 py-2 font-display font-semibold text-muted-foreground">Sold</th>
                      <th className="text-right px-2 py-2 font-display font-semibold text-muted-foreground">Avg Cost</th>
                      <th className="text-right px-2 py-2 font-display font-semibold text-muted-foreground">Avg Sale</th>
                      <th className="text-right px-2 py-2 font-display font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right px-2 py-2 font-display font-semibold text-muted-foreground">Cost</th>
                      <th className="text-right px-2 py-2 font-display font-semibold text-muted-foreground">Profit</th>
                      <th className="text-right px-2 py-2 font-display font-semibold text-muted-foreground">Stock Val</th>
                      <th className="text-center px-2 py-2 font-display font-semibold text-muted-foreground">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bd.models.map((m, idx) => (
                      <tr key={m.productId} className={`border-t ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-accent/20 transition-colors`}>
                        <td className="px-3 py-2 font-display font-semibold">{m.model}</td>
                        <td className="px-2 py-2 text-muted-foreground">{m.variant}</td>
                        <td className="px-2 py-2 text-muted-foreground">{m.color}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full font-display font-bold ${m.inStock > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {m.inStock}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center font-display font-medium">{m.sold}</td>
                        <td className="px-2 py-2 text-right font-mono text-muted-foreground">{fmt(m.avgCost)}</td>
                        <td className="px-2 py-2 text-right font-mono font-medium">{fmt(m.avgSalePrice)}</td>
                        <td className="px-2 py-2 text-right font-mono font-semibold text-primary">{fmt(m.totalRevenue)}</td>
                        <td className="px-2 py-2 text-right font-mono text-muted-foreground">{fmt(m.totalCost)}</td>
                        <td className="px-2 py-2 text-right font-mono font-bold">
                          <span className={m.profit >= 0 ? 'text-success' : 'text-destructive'}>{fmt(m.profit)}</span>
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-warning font-medium">{m.stockValue > 0 ? fmt(m.stockValue) : '—'}</td>
                        <td className="px-2 py-2 text-center"><MarginBadge pct={m.marginPct} /></td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/20 bg-primary/5 font-bold text-[11px]">
                      <td className="px-3 py-2 font-display" colSpan={3}>Total ({bd.brand})</td>
                      <td className="px-2 py-2 text-center font-display">{bd.inStock}</td>
                      <td className="px-2 py-2 text-center font-display">{bd.sold}</td>
                      <td className="px-2 py-2" colSpan={2}></td>
                      <td className="px-2 py-2 text-right font-mono text-primary">{fmt(bd.totalRevenue)}</td>
                      <td className="px-2 py-2 text-right font-mono">{fmt(bd.totalCost)}</td>
                      <td className="px-2 py-2 text-right font-mono text-success">{fmt(bd.totalProfit)}</td>
                      <td className="px-2 py-2 text-right font-mono text-warning">{fmt(bd.stockValue)}</td>
                      <td className="px-2 py-2 text-center"><MarginBadge pct={bd.avgMarginPct} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
