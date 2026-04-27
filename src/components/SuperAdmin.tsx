import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Crown, Store, Users, Wallet, BarChart3, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Pause, Play, Trash2, IndianRupee, Shield, Search,
} from 'lucide-react';
import { getCurrentFY, getFYLabel } from '@/lib/financialYear';

type Tab = 'stats' | 'shops' | 'users' | 'fees';

interface Shop {
  id: string; name: string; phone: string; created_at: string; created_by: string;
  approval_status: string; is_suspended: boolean; yearly_fee: number; suspended_reason: string;
}
interface Profile { id: string; email: string | null; full_name: string | null; created_at: string; }
interface Membership { user_id: string; shop_id: string; role: string; }
interface Payment { shop_id: string; fy_year: number; amount: number; paid_at: string; payment_method: string; }
interface RoleRow { user_id: string; role: string; }

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export const SuperAdmin: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const fy = getCurrentFY();

  const fetchAll = async () => {
    setLoading(true);
    const [s, p, m, pay, r] = await Promise.all([
      supabase.from('shops').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('shop_memberships').select('user_id, shop_id, role'),
      supabase.from('maintenance_payments').select('shop_id, fy_year, amount, paid_at, payment_method'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    setShops((s.data as Shop[]) || []);
    setProfiles((p.data as Profile[]) || []);
    setMemberships((m.data as Membership[]) || []);
    setPayments((pay.data as Payment[]) || []);
    setRoles((r.data as RoleRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, []);

  const profileById = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);
  const paidShopFY = useMemo(() => new Set(payments.filter(p => p.fy_year === fy).map(p => p.shop_id)), [payments, fy]);

  const stats = useMemo(() => {
    const approved = shops.filter(s => s.approval_status === 'approved');
    const pending = shops.filter(s => s.approval_status === 'pending');
    const suspended = shops.filter(s => s.is_suspended);
    const paidCount = approved.filter(s => paidShopFY.has(s.id)).length;
    const pendingFY = approved.filter(s => !paidShopFY.has(s.id));
    const expectedRevenue = approved.reduce((sum, s) => sum + Number(s.yearly_fee || 0), 0);
    const collectedRevenue = payments.filter(p => p.fy_year === fy).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      totalUsers: profiles.length,
      totalShops: shops.length,
      approved: approved.length,
      pending: pending.length,
      suspended: suspended.length,
      paidCount,
      pendingCount: pendingFY.length,
      expectedRevenue,
      collectedRevenue,
      pendingRevenue: pendingFY.reduce((sum, s) => sum + Number(s.yearly_fee || 0), 0),
    };
  }, [shops, profiles, payments, paidShopFY, fy]);

  // --- Actions ---
  const updateShop = async (id: string, patch: Partial<Shop>, label: string) => {
    setBusy(id + label);
    const { error } = await supabase.from('shops').update(patch as any).eq('id', id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${label} done`);
    fetchAll();
  };

  const approveShop = (s: Shop) => updateShop(s.id, { approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id } as any, 'Approved');
  const rejectShop = (s: Shop) => {
    if (!confirm(`Reject "${s.name}"? Owner won't be able to use it.`)) return;
    updateShop(s.id, { approval_status: 'rejected' } as any, 'Rejected');
  };
  const toggleSuspend = (s: Shop) => {
    const reason = !s.is_suspended ? prompt('Reason for suspension?') ?? '' : '';
    if (!s.is_suspended && !reason) return;
    updateShop(s.id, { is_suspended: !s.is_suspended, suspended_reason: reason } as any, !s.is_suspended ? 'Suspended' : 'Unsuspended');
  };
  const deleteShop = async (s: Shop) => {
    if (!confirm(`PERMANENT DELETE "${s.name}" and all its data? This cannot be undone.`)) return;
    setBusy(s.id + 'del');
    const { error } = await supabase.from('shops').delete().eq('id', s.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Shop deleted'); fetchAll();
  };
  const updateFee = async (s: Shop) => {
    const v = prompt(`New yearly fee for "${s.name}" (current: ₹${s.yearly_fee})`, String(s.yearly_fee));
    if (!v) return;
    const amt = Number(v);
    if (!amt || amt <= 0) { toast.error('Invalid amount'); return; }
    updateShop(s.id, { yearly_fee: amt } as any, 'Fee updated');
  };
  const markPaid = async (s: Shop) => {
    if (!confirm(`Mark "${s.name}" as paid for ${getFYLabel(fy)} (${fmt(s.yearly_fee)})?`)) return;
    setBusy(s.id + 'pay');
    const { error } = await supabase.from('maintenance_payments').insert({
      shop_id: s.id, fy_year: fy, amount: s.yearly_fee, payment_method: 'manual', paid_by: user?.id, notes: 'Marked by developer',
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Marked as paid'); fetchAll();
  };
  const setUserRole = async (uid: string, role: 'admin' | 'staff' | 'developer', remove: boolean) => {
    setBusy(uid + role);
    if (remove) {
      await supabase.from('user_roles').delete().eq('user_id', uid).eq('role', role);
    } else {
      await supabase.from('user_roles').insert({ user_id: uid, role: role as any });
    }
    setBusy(null);
    toast.success('Role updated'); fetchAll();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const filteredShops = shops.filter(s => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const owner = profileById[s.created_by];
    return s.name.toLowerCase().includes(q)
      || (s.phone || '').toLowerCase().includes(q)
      || (owner?.email || '').toLowerCase().includes(q)
      || (owner?.full_name || '').toLowerCase().includes(q);
  });

  const filteredUsers = profiles.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (p.email || '').toLowerCase().includes(q) || (p.full_name || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-extrabold flex items-center gap-2">Super Admin
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">Developer</span>
          </h1>
          <p className="text-xs text-muted-foreground">Control all shops, users, fees & approvals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {([
          { k: 'stats', l: 'Overview', i: BarChart3 },
          { k: 'shops', l: `Shops (${shops.length})`, i: Store },
          { k: 'users', l: `Users (${profiles.length})`, i: Users },
          { k: 'fees', l: 'Fees & Revenue', i: Wallet },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k as Tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-display font-bold border-b-2 transition whitespace-nowrap ${
              tab === t.k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <t.i className="w-3.5 h-3.5" />{t.l}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={String(stats.totalUsers)} icon={Users} color="text-primary" />
          <StatCard label="Total Shops" value={String(stats.totalShops)} icon={Store} color="text-success" sub={`${stats.approved} active • ${stats.pending} pending`} />
          <StatCard label="Suspended" value={String(stats.suspended)} icon={Pause} color="text-warning" />
          <StatCard label="Pending Approval" value={String(stats.pending)} icon={AlertTriangle} color="text-warning" />
          <StatCard label={`${getFYLabel(fy)} Collected`} value={fmt(stats.collectedRevenue)} icon={IndianRupee} color="text-success" sub={`${stats.paidCount} shops paid`} />
          <StatCard label={`${getFYLabel(fy)} Pending`} value={fmt(stats.pendingRevenue)} icon={AlertTriangle} color="text-destructive" sub={`${stats.pendingCount} shops unpaid`} />
          <StatCard label="Expected Revenue" value={fmt(stats.expectedRevenue)} icon={Wallet} color="text-primary" sub="Per year (active shops)" />
          <StatCard label="Collection %" value={stats.expectedRevenue ? `${Math.round(stats.collectedRevenue * 100 / stats.expectedRevenue)}%` : '0%'} icon={BarChart3} color="text-primary" />
        </div>
      )}

      {/* Search bar (shops/users) */}
      {(tab === 'shops' || tab === 'users' || tab === 'fees') && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'users' ? 'Search by email or name…' : 'Search by shop name, phone, owner email…'}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      )}

      {/* Shops tab */}
      {tab === 'shops' && (
        <div className="space-y-2">
          {filteredShops.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No shops</div>}
          {filteredShops.map(s => {
            const owner = profileById[s.created_by];
            const memberCount = memberships.filter(m => m.shop_id === s.id).length;
            const paid = paidShopFY.has(s.id);
            return (
              <div key={s.id} className={`rounded-xl border p-4 ${s.is_suspended ? 'bg-destructive/5 border-destructive/30' : s.approval_status === 'pending' ? 'bg-warning/5 border-warning/30' : 'bg-card'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-extrabold text-sm">{s.name}</h3>
                      <StatusBadge status={s.approval_status} suspended={s.is_suspended} paid={paid} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Owner: <span className="font-bold text-foreground">{owner?.full_name || owner?.email || 'Unknown'}</span> ({owner?.email || '—'})
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      📞 {s.phone || '—'} • 👥 {memberCount} member{memberCount !== 1 ? 's' : ''} • 💰 Fee: <span className="font-bold text-foreground">{fmt(s.yearly_fee)}</span> • Created {new Date(s.created_at).toLocaleDateString('en-IN')}
                    </p>
                    {s.is_suspended && s.suspended_reason && <p className="text-[11px] text-destructive mt-1">⚠ {s.suspended_reason}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.approval_status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => approveShop(s)} disabled={busy === s.id + 'Approved'} className="h-8 gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectShop(s)} className="h-8 gap-1 text-xs">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {s.approval_status === 'approved' && !paid && (
                      <Button size="sm" onClick={() => markPaid(s)} disabled={busy === s.id + 'pay'} className="h-8 gap-1 text-xs">
                        <IndianRupee className="w-3.5 h-3.5" /> Mark Paid
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => updateFee(s)} className="h-8 gap-1 text-xs">
                      <Wallet className="w-3.5 h-3.5" /> Fee
                    </Button>
                    {s.approval_status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => toggleSuspend(s)} className="h-8 gap-1 text-xs">
                        {s.is_suspended ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Suspend</>}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => deleteShop(s)} className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-display font-semibold text-muted-foreground">User</th>
                <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Roles</th>
                <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Shops</th>
                <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(p => {
                const userRoles = roles.filter(r => r.user_id === p.id).map(r => r.role);
                const userShops = memberships.filter(m => m.user_id === p.id).length;
                const isDev = userRoles.includes('developer');
                const isAdm = userRoles.includes('admin');
                return (
                  <tr key={p.id} className="border-t hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-display font-bold">{p.full_name || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.email || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length === 0 && <span className="text-muted-foreground italic">none</span>}
                        {userRoles.map(r => (
                          <span key={r} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r === 'developer' ? 'bg-primary/15 text-primary' : r === 'admin' ? 'bg-success/15 text-success' : 'bg-secondary'}`}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{userShops}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                          onClick={() => setUserRole(p.id, 'admin', isAdm)} disabled={busy === p.id + 'admin'}>
                          {isAdm ? 'Remove Admin' : '+ Admin'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                          onClick={() => setUserRole(p.id, 'developer', isDev)} disabled={busy === p.id + 'developer' || p.id === user?.id}>
                          {isDev ? 'Remove Dev' : '+ Dev'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Fees tab */}
      {tab === 'fees' && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-display font-semibold text-muted-foreground">Shop</th>
                <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Owner</th>
                <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">Fee/yr</th>
                <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">{getFYLabel(fy)} Status</th>
                <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShops.filter(s => s.approval_status === 'approved').map(s => {
                const paid = paidShopFY.has(s.id);
                const owner = profileById[s.created_by];
                return (
                  <tr key={s.id} className="border-t hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-display font-bold">{s.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{owner?.email || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-display font-bold">{fmt(s.yearly_fee)}</td>
                    <td className="px-3 py-2.5">
                      {paid
                        ? <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-bold uppercase">Paid</span>
                        : <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold uppercase">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => updateFee(s)}>Edit Fee</Button>
                        {!paid && <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => markPaid(s)} disabled={busy === s.id + 'pay'}>Mark Paid</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ElementType; color: string; sub?: string }> = ({ label, value, icon: Icon, color, sub }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
    <p className="font-display font-extrabold text-xl">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const StatusBadge: React.FC<{ status: string; suspended: boolean; paid: boolean }> = ({ status, suspended, paid }) => {
  if (suspended) return <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold uppercase">Suspended</span>;
  if (status === 'pending') return <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-bold uppercase">Pending Approval</span>;
  if (status === 'rejected') return <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold uppercase">Rejected</span>;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${paid ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
      {paid ? 'Active • Paid' : 'Active • Unpaid'}
    </span>
  );
};