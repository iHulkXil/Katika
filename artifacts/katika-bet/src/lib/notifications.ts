import { fetchMarkets, fetchPositions } from '@/lib/markets-api';

export type AppNotificationType = 'win' | 'market' | 'stake' | 'wallet' | 'system';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  timestamp: string;
  href?: string;
  read?: boolean;
};

const ACTIVITY_KEY = 'sidebet_activity_notifications';
const READ_IDS_KEY = 'sidebet_notifications_read_ids';
export const NOTIFICATIONS_EVENT = 'sidebet:notifications-updated';

export function getActivityNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markNotificationRead(id: string) {
  const readSet = getReadNotificationIds();
  readSet.add(id);
  localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(readSet)));
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
}

export function markAllNotificationsRead(ids: string[]) {
  const readSet = getReadNotificationIds();
  ids.forEach((id) => readSet.add(id));
  localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(readSet)));
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
}

export function pushNotification(input: {
  id?: string;
  title: string;
  message: string;
  type: AppNotificationType;
  href?: string;
}) {
  try {
    const existing = getActivityNotifications();
    const entry: AppNotification = {
      id: input.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: input.title,
      message: input.message,
      type: input.type,
      timestamp: new Date().toISOString(),
      href: input.href,
    };
    const updated = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, 25);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
  } catch (err) {
    console.warn('Failed to push notification:', err);
  }
}

export async function loadRealNotifications(walletAddress?: string): Promise<AppNotification[]> {
  const readIds = getReadNotificationIds();
  const activity = getActivityNotifications();

  const [marketsRes, positionsRes] = await Promise.allSettled([
    fetchMarkets(),
    fetchPositions(walletAddress),
  ]);

  const derived: AppNotification[] = [];

  if (positionsRes.status === 'fulfilled') {
    for (const pos of positionsRes.value.slice(0, 12)) {
      if (pos.status === 'won') {
        derived.push({
          id: `pos-won-${pos.id}`,
          title: 'Winning Payout Ready',
          message: `You won +${(pos.payout || pos.amount * pos.odds).toFixed(3)} SOL on "${pos.title.slice(0, 48)}${pos.title.length > 48 ? '...' : ''}"`,
          type: 'win',
          timestamp: pos.placedAt,
          href: '/my-bets',
        });
      } else if (pos.status === 'open') {
        derived.push({
          id: `pos-open-${pos.id}`,
          title: `Active ${pos.side} Position`,
          message: `${pos.amount} SOL staked at ${pos.odds}x on "${pos.title.slice(0, 45)}${pos.title.length > 45 ? '...' : ''}"`,
          type: 'stake',
          timestamp: pos.placedAt,
          href: '/my-bets',
        });
      }
    }
  }

  if (marketsRes.status === 'fulfilled') {
    const resolved = marketsRes.value.filter((m) => m.status === 'resolved').slice(0, 3);
    for (const m of resolved) {
      derived.push({
        id: `mkt-resolved-${m.id}-${m.resolution}`,
        title: `Market Resolved: ${m.resolution}`,
        message: m.title,
        type: 'market',
        timestamp: m.resolvedAt || m.createdAt || new Date().toISOString(),
        href: '/my-bets',
      });
    }

    const openHot = marketsRes.value
      .filter((m) => m.status === 'open')
      .slice(0, 2);
    for (const m of openHot) {
      derived.push({
        id: `mkt-live-${m.id}`,
        title: `Live ${m.category} Market`,
        message: m.title,
        type: 'market',
        timestamp: m.createdAt || new Date().toISOString(),
        href: '/',
      });
    }
  }

  // Merge activity + derived, deduplicate by id, sort newest first
  const map = new Map<string, AppNotification>();
  for (const item of [...activity, ...derived]) {
    if (!map.has(item.id)) {
      map.set(item.id, {
        ...item,
        read: readIds.has(item.id),
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
