import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import {
  ChevronDown, ChevronRight, TrendingUp, Package, IndianRupee,
  BarChart3, Search, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type IMEIRecord = Database['public']['Tables']['imei_records']['Row'];

interface BrandData {
  brand: string;
  models: ModelData[];
  totalUnits: number;
  inStock: number;
  sold: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  stockValue: number;
  avgMarginPct: number;
}

interface ModelData {
  model: string;
  variant: string;
  color: string;
  productId: string;
  totalUnits: number;
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

export const BrandAnalytics: React.FC = () => {
  const { activeShopId, isAllShops, allShopIds } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [imeis, setImeis] = useState<IMEIRecord[]>([]);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId && !isAllShops) return;
    const fetch = async () => {
      setLoading(true);
      let pQ = supabase.from('products').select('*');
      let iQ = supabase.from('imei_records').select('*');
      if (isAllShops) {
        pQ = pQ.in('shop_id', allShopIds);
        iQ = iQ.in('shop_id', allShopIds);
      } else {
        pQ = pQ.eq('shop_id', activeShopId!);
        iQ = iQ.eq('shop_id', activeShopId!);
      }
      const [{ data: p }, { data: i }] = await Promise.all([pQ, iQ]);
      if (p) setProducts(p);
      if (i) setImeis(i);
      setLoading(false);
    };
    fetch();
  }, [activeShopId]);

  const brandData = useMemo(() => {
    const map = new Map<string, BrandData>();

    products.forEach(p => {
      const brandKey = (p.brand || 'Other').toLowerCase();
      const brandName = p.brand || 'Other';
      const productImeis = imeis.filter(r => r.product_id === p.id);
      const inStockImeis = productImeis.filter(r => r.status === 'in_stock');
      const soldImeis = productImeis.filter(r => r.status === 'sold');

      const totalCost = soldImeis.reduce((s, r) => s + (Number(r.purchase_price) || Number(p.purchase_price)), 0);
      const totalRevenue = soldImeis.reduce((s, r) => s + (Number(r.sale_price) || Number(p.sale_price)), 0);
      const stockValue = inStockImeis.reduce((s, r) => s + (Number(r.purchase_price) || Number(p.purchase_price)), 0);
      const profit = totalRevenue - totalCost;
      const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      const avgCost = productImeis.length > 0
        ? productImeis.reduce((s, r) => s + (Number(r.purchase_price) || Number(p.purchase_price)), 0) / productImeis.length
        : Number(p.purchase_price);
      const avgSale = productImeis.length > 0
        ? productImeis.reduce((s, r) => s + (Number(r.sale_price) || Number(p.sale_price)), 0) / productImeis.length
        : Number(p.sale_price);

      const modelData: ModelData = {
        model: p.model,
        variant: p.variant || '-',
        color: p.color || '-',
        productId: p.id,
        totalUnits: productImeis.length,
        inStock: inStockImeis.length,
        sold: soldImeis.length,
        avgCost,
        avgSalePrice: avgSale,
        totalCost,
        totalRevenue,
        profit,
        marginPct,
        stockValue,
      };

      if (!map.has(brandKey)) {
        map.set(brandKey, {
          brand: brandName,
          models: [],
          totalUnits: 0, inStock: 0, sold: 0,
          totalCost: 0, totalRevenue: 0, totalProfit: 0,
          stockValue: 0, avgMarginPct: 0,
        });
      }
      const bd = map.get(brandKey)!;
      bd.models.push(modelData);
      bd.totalUnits += productImeis.length;
      bd.inStock += inStockImeis.length;
      bd.sold += soldImeis.length;
      bd.totalCost += totalCost;
      bd.totalRevenue += totalRevenue;
      bd.totalProfit += profit;
      bd.stockValue += stockValue;
    });

    // Compute avg margin
    map.forEach(bd => {
      bd.avgMarginPct = bd.totalRevenue > 0 ? (bd.totalProfit / bd.totalRevenue) * 100 : 0;
      bd.models.sort((a, b) => b.profit - a.profit);
    });

    return Array.from(map.values())
      .filter(bd => !searchQ || bd.brand.toLowerCase().includes(searchQ.toLowerCase()) || bd.models.some(m => m.model.toLowerCase().includes(searchQ.toLowerCase())))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [products, imeis, searchQ]);

  const totals = useMemo(() => ({
    revenue: brandData.reduce((s, b) => s + b.totalRevenue, 0),
    cost: brandData.reduce((s, b) => s + b.totalCost, 0),
    profit: brandData.reduce((s, b) => s + b.totalProfit, 0),
    stock: brandData.reduce((s, b) => s + b.inStock, 0),
    sold: brandData.reduce((s, b) => s + b.sold, 0),
    stockValue: brandData.reduce((s, b) => s + b.stockValue, 0),
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Revenue', value: fmt(totals.revenue), icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Total Cost', value: fmt(totals.cost), icon: Package, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Net Profit', value: fmt(totals.profit), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Units Sold', value: String(totals.sold), icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'In Stock', value: String(totals.stock), icon: Package, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Stock Value', value: fmt(totals.stockValue), icon: IndianRupee, color: 'text-destructive', bg: 'bg-destructive/10' },
        ].map(c => (
          <div key={c.label} className="stat-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground font-display font-medium">{c.label}</span>
            </div>
            <p className="font-display text-lg font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search brand or model..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-input bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all"
        />
      </div>

      {/* Brand Cards */}
      <div className="space-y-3">
        {brandData.map(bd => {
          const isExpanded = expandedBrand === bd.brand;
          const revShare = totals.revenue > 0 ? (bd.totalRevenue / totals.revenue) * 100 : 0;
          return (
            <div key={bd.brand} className="bg-card rounded-xl border overflow-hidden shadow-sm">
              {/* Brand Header */}
              <button
                onClick={() => setExpandedBrand(isExpanded ? null : bd.brand)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className="text-left">
                    <h3 className="font-display font-bold text-base">{bd.brand}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {bd.models.length} models · {bd.totalUnits} units · {fmtPct(revShare)} of revenue
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-display">Revenue</p>
                    <p className="font-display font-bold text-sm">{fmt(bd.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-display">Profit</p>
                    <p className="font-display font-bold text-sm">{fmt(bd.totalProfit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-display">Margin</p>
                    <MarginBadge pct={bd.avgMarginPct} />
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success font-display font-bold">{bd.inStock} stock</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-display font-bold">{bd.sold} sold</span>
                  </div>
                </div>
              </button>

              {/* Expanded: Model/Variant Table */}
              {isExpanded && (
                <div className="border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-4 py-2.5 font-display font-semibold text-muted-foreground">Model</th>
                          <th className="text-left px-3 py-2.5 font-display font-semibold text-muted-foreground">Variant</th>
                          <th className="text-left px-3 py-2.5 font-display font-semibold text-muted-foreground">Color</th>
                          <th className="text-center px-3 py-2.5 font-display font-semibold text-muted-foreground">Stock</th>
                          <th className="text-center px-3 py-2.5 font-display font-semibold text-muted-foreground">Sold</th>
                          <th className="text-right px-3 py-2.5 font-display font-semibold text-muted-foreground">Avg Cost</th>
                          <th className="text-right px-3 py-2.5 font-display font-semibold text-muted-foreground">Avg Sale</th>
                          <th className="text-right px-3 py-2.5 font-display font-semibold text-muted-foreground">Revenue</th>
                          <th className="text-right px-3 py-2.5 font-display font-semibold text-muted-foreground">Cost</th>
                          <th className="text-right px-3 py-2.5 font-display font-semibold text-muted-foreground">Profit</th>
                          <th className="text-center px-3 py-2.5 font-display font-semibold text-muted-foreground">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bd.models.map((m, idx) => (
                          <tr key={m.productId} className={`border-t ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-accent/20 transition-colors`}>
                            <td className="px-4 py-2.5 font-display font-semibold text-foreground">{m.model}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{m.variant}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{m.color}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full font-display font-bold ${m.inStock > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                {m.inStock}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-display font-medium">{m.sold}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt(m.avgCost)}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-medium">{fmt(m.avgSalePrice)}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-primary">{fmt(m.totalRevenue)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt(m.totalCost)}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold">
                              <span className={m.profit >= 0 ? 'text-success' : 'text-destructive'}>{fmt(m.profit)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center"><MarginBadge pct={m.marginPct} /></td>
                          </tr>
                        ))}
                        {/* Brand Totals Row */}
                        <tr className="border-t-2 border-primary/20 bg-primary/5 font-bold">
                          <td className="px-4 py-2.5 font-display" colSpan={3}>Total ({bd.brand})</td>
                          <td className="px-3 py-2.5 text-center font-display">{bd.inStock}</td>
                          <td className="px-3 py-2.5 text-center font-display">{bd.sold}</td>
                          <td className="px-3 py-2.5" colSpan={2}></td>
                          <td className="px-3 py-2.5 text-right font-mono text-primary">{fmt(bd.totalRevenue)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{fmt(bd.totalCost)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-success">{fmt(bd.totalProfit)}</td>
                          <td className="px-3 py-2.5 text-center"><MarginBadge pct={bd.avgMarginPct} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {brandData.length === 0 && (
          <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-display font-medium">No brand data available</p>
          </div>
        )}
      </div>
    </div>
  );
};
