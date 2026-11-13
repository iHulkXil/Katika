import { useEffect, useState } from 'react';
import { usePrivy, type User } from '@privy-io/react-auth';
import { getTelegramUser } from '@/lib/telegram';

const CUSTOM_AVATAR_KEY = 'sidebet_custom_avatar';
const AVATAR_EVENT = 'sidebet:avatar-updated';

const PALETTES = [
  ['#22C55E', '#0F1713'],
  ['#FACC15', '#1C190B'],
  ['#EC4899', '#1F101A'],
  ['#38BDF8', '#0D1924'],
  ['#A855F7', '#181024'],
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildInitialsSvg(seed: string, label: string): string {
  const clean = label.trim();
  const parts = clean.split(/[\s._@-]+/).filter(Boolean);
  let initials = 'SB';
  if (parts.length >= 2) {
    initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  } else if (clean.length >= 2) {
    initials = clean.slice(0, 2).toUpperCase();
  } else if (clean.length === 1) {
    initials = clean.toUpperCase();
  }

  const [fg, bg] = PALETTES[hashString(seed) % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#080C0F"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)"/>
    <circle cx="64" cy="64" r="60" fill="none" stroke="${fg}" stroke-width="4" stroke-opacity="0.7"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="44">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getConnectedAccountAvatar(user: User | null | undefined): string {
  const tg = getTelegramUser();
  if (tg?.photo_url) return tg.photo_url;

  if (user) {
    const u = user as any;
    const twitterPic = user.twitter?.profilePictureUrl?.replace('_normal', '');
    if (twitterPic) return twitterPic;

    if (user.farcaster?.pfp) return user.farcaster.pfp;
    if (user.telegram?.photoUrl) return user.telegram.photoUrl;
    if (user.line?.profilePictureUrl) return user.line.profilePictureUrl;
    if (u.discord?.avatarUrl) return u.discord.avatarUrl;
    if (u.github?.avatarUrl) return u.github.avatarUrl;
    if (u.customOAuth?.profilePictureUrl) return u.customOAuth.profilePictureUrl;
    if (u.google?.picture) return u.google.picture;
    if (u.customMetadata?.photoUrl) return u.customMetadata.photoUrl;

    if (Array.isArray(u.linkedAccounts)) {
      for (const acc of u.linkedAccounts) {
        if (acc?.picture) return acc.picture;
        if (acc?.profilePictureUrl) return acc.profilePictureUrl.replace('_normal', '');
        if (acc?.avatarUrl) return acc.avatarUrl;
        if (acc?.pfp) return acc.pfp;
        if (acc?.photoUrl) return acc.photoUrl;
      }
    }

    const label =
      user.google?.name ||
      user.google?.email ||
      user.email?.address ||
      user.twitter?.name ||
      user.twitter?.username ||
      user.farcaster?.displayName ||
      user.farcaster?.username ||
      user.telegram?.firstName ||
      user.discord?.username ||
      user.github?.username ||
      user.wallet?.address ||
      user.id;

    return buildInitialsSvg(user.id || label || 'sidebet', label || 'SB');
  }

  return buildInitialsSvg(tg?.username || 'sidebet-guest', tg?.first_name || 'SB');
}

export function getCustomAvatar(): string | null {
  try {
    return localStorage.getItem(CUSTOM_AVATAR_KEY);
  } catch {
    return null;
  }
}

export function saveCustomAvatar(avatarUrl: string | null) {
  try {
    if (avatarUrl) {
      localStorage.setItem(CUSTOM_AVATAR_KEY, avatarUrl);
    } else {
      localStorage.removeItem(CUSTOM_AVATAR_KEY);
    }
    window.dispatchEvent(new Event(AVATAR_EVENT));
  } catch (err) {
    console.error('Failed to save custom avatar:', err);
  }
}

export function useUserAvatar() {
  const { user } = usePrivy();
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => getCustomAvatar());

  useEffect(() => {
    const sync = () => setCustomAvatar(getCustomAvatar());
    window.addEventListener(AVATAR_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AVATAR_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const connectedAvatar = getConnectedAccountAvatar(user);
  return {
    avatarUrl: customAvatar || connectedAvatar,
    connectedAvatar,
    hasCustomAvatar: Boolean(customAvatar),
  };
}
