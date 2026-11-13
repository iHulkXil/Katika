import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Bell, Trophy, Flame, CheckCircle2, Wallet, Info, CheckCheck } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import {
  loadRealNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  formatRelativeTime,
  NOTIFICATIONS_EVENT,
  type AppNotification,
  type AppNotificationType,
} from '@/lib/notifications';

function NotificationIcon({ type }: { type: AppNotificationType }) {
  if (type === 'win') {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#facc15]/15 border border-[#facc15]/30 text-[#facc15]">
        <Trophy size={14} />
      </div>
    );
  }
  if (type === 'stake') {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#4ade80]">
        <CheckCircle2 size={14} />
      </div>
    );
  }
  if (type === 'wallet') {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
        <Wallet size={14} />
      </div>
    );
  }
  if (type === 'market') {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#ec4899]/15 border border-[#ec4899]/30 text-[#f472b6]">
        <Flame size={14} />
      </div>
    );
  }
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 border border-white/15 text-slate-300">
      <Info size={14} />
    </div>
  );
}

export function NotificationsMenu({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [, setLocation] = useLocation();
  const walletAddress = wallets?.[0]?.address || user?.wallet?.address;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const list = await loadRealNotifications(walletAddress);
    setItems(list);
  }, [walletAddress]);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener(NOTIFICATIONS_EVENT, onUpdate);
    window.addEventListener('storage', onUpdate);
    const poll = setInterval(onUpdate, 20000);
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, onUpdate);
      window.removeEventListener('storage', onUpdate);
      clearInterval(poll);
    };
  }, [refresh]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = items.filter((i) => !i.read).length;

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      void refresh();
    }
  };

  const handleItemClick = (item: AppNotification) => {
    markNotificationRead(item.id);
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    setOpen(false);
    if (item.href) {
      setLocation(item.href);
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(items.map((i) => i.id));
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const btnClasses =
    size === 'md'
      ? 'grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#121820] text-slate-300 hover:text-white hover:border-white/20 transition-colors'
      : 'grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#121820] text-slate-300 hover:text-white hover:border-white/20 transition-colors';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className={btnClasses}
      >
        <Bell size={size === 'md' ? 16 : 15} />
      </button>

      {unreadCount > 0 && (
        <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[9px] font-mono font-bold text-white ring-2 ring-[#080C0F]">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      {open && (
        <div className="absolute right-0 mt-2.5 z-50 w-80 sm:w-96 rounded-3xl border border-white/[0.1] bg-[#0D1217] p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-display">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#22c55e]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#4ade80]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-[#4ade80] transition-colors"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No notifications yet. Place a trade or join an arena to see live updates.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left flex items-start gap-3 rounded-2xl border p-3 transition-all ${
                    item.read
                      ? 'border-white/[0.04] bg-[#080C0F]/60 opacity-75 hover:opacity-100'
                      : 'border-[#22c55e]/25 bg-[#121B16]/70 hover:border-[#22c55e]/50'
                  }`}
                >
                  <NotificationIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{item.title}</span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2 leading-snug">
                      {item.message}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#22c55e]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
