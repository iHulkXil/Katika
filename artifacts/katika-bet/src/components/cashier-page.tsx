import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { CreditCard, Zap, CheckCircle2, ShieldCheck, Sparkles, RefreshCw, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CashierPackage = {
  id: string;
  name: string;
  ktkAmount: number;
  priceUsdCents: number;
  popular?: boolean;
  bonus?: string;
};

type OrderItem = {
  id: number;
  packageId: string;
  amountKtk: number;
  fiatAmountCents: number;
  currency: string;
  status: string;
  createdAt: string;
};

export function CashierPage() {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { serverUser, reloadSession } = useServerSession();
  const { toast } = useToast();

  const [packages, setPackages] = useState<CashierPackage[]>([]);
  const [feeMode, setFeeMode] = useState<'stripe' | 'ktk_standin'>('ktk_standin');
  const [loading, setLoading] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string>('pro_1200');
  const [orders, setOrders] = useState<OrderItem[]>([]);

  const loadPackages = async () => {
    try {
      const res = await fetch('/api/cashier/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages ?? []);
        setFeeMode(data.feeMode ?? 'ktk_standin');
      }
    } catch {
      // fallback
    }
  };

  const loadOrders = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/cashier/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    void loadPackages();
  }, []);

  useEffect(() => {
    if (authenticated) {
      void loadOrders();
    }
  }, [authenticated]);

  const handleCheckout = async (pkgId: string) => {
    if (!authenticated) {
      void login();
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/cashier/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId: pkgId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Checkout failed');
      }

      if (data.mode === 'stripe' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: 'Deposit Successful',
          description: `Credited ${data.creditedKtk} KTK to your balance.`,
        });
        await reloadSession();
        await loadOrders();
      }
    } catch (err: any) {
      toast({
        title: 'Checkout Error',
        description: err.message || 'Failed to initiate checkout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 pt-2 pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#35D399]/30 bg-gradient-to-br from-[#0E1A16] via-[#091511] to-[#050C0A] p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#35D399]/20 text-[#35D399]">
              <CreditCard size={18} />
            </span>
            <div>
              <span className="font-mono-custom text-[10px] font-bold uppercase tracking-widest text-[#35D399]">
                Secure Cashier
              </span>
              <h1 className="text-lg font-bold text-[#E8F2EC]">Top Up KTK</h1>
            </div>
          </div>
          <span className="rounded-full border border-[#1C3A2E] bg-[#07110E] px-2.5 py-1 font-mono-custom text-[10px] text-[#35D399]">
            {feeMode === 'stripe' ? 'Stripe Gateway' : 'Instant Demo Deposit'}
          </span>
        </div>
        <p className="mt-2 text-xs text-[#8FA39A] leading-relaxed">
          Fund your KTK bankroll instantly. Purchased tokens are prioritized for play and directly credited to your floor balance.
        </p>
      </div>

      {/* Package Selection */}
      <div className="mt-4 space-y-3">
        {packages.map((pkg) => {
          const isSelected = selectedPkg === pkg.id;
          return (
            <div
              key={pkg.id}
              onClick={() => setSelectedPkg(pkg.id)}
              className={`relative cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-[#35D399] bg-[#0E1A16] shadow-[0_4px_20px_rgba(53,211,153,0.15)]'
                  : 'border-[#1C3A2E] bg-[#07110E] hover:border-[#1C3A2E]/80'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-[#d4af37] to-[#f3d37a] px-2 py-0.5 font-mono-custom text-[9px] font-bold text-black shadow">
                  MOST POPULAR
                </span>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#E8F2EC]">{pkg.name}</h3>
                    {pkg.bonus && (
                      <span className="rounded bg-[#35D399]/20 px-1.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#35D399]">
                        {pkg.bonus}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono-custom text-2xl font-black text-[#f3d37a]">
                    {pkg.ktkAmount.toLocaleString()} <span className="text-sm font-semibold text-[#8FA39A]">KTK</span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="font-mono-custom text-xl font-bold text-[#E8F2EC]">
                    ${(pkg.priceUsdCents / 100).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCheckout(pkg.id);
                    }}
                    className="mt-2 rounded-xl bg-[#35D399] px-4 py-2 text-xs font-bold text-[#062018] shadow hover:opacity-95 disabled:opacity-50"
                  >
                    {loading && selectedPkg === pkg.id ? 'Processing...' : 'Deposit'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security notice */}
      <div className="mt-5 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4 text-xs text-[#8FA39A] space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[#E8F2EC]">
          <ShieldCheck size={16} className="text-[#35D399]" />
          <span>Fair & Secure Protocol</span>
        </div>
        <p>
          All transactions are signed cryptographically via Privy wallet session. Wagers strictly follow the prioritized spend order (purchased funds first).
        </p>
      </div>

      {/* Order History */}
      {orders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8FA39A]">Recent Top-Ups</h3>
          <div className="mt-3 space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-[#07110E] p-3 text-xs"
              >
                <div>
                  <span className="font-bold text-[#E8F2EC]">+{order.amountKtk.toLocaleString()} KTK</span>
                  <p className="text-[10px] text-[#8FA39A]">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono-custom text-[#35D399]">${(order.fiatAmountCents / 100).toFixed(2)}</span>
                  <p className="text-[10px] text-[#5C7368] uppercase">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
