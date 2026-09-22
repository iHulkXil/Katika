/**
 * Utility functions for user profile picture detection, upload, and processing
 */

export function extractUserProfilePicture(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, any>;

  // Direct Google / Social handles on Privy user object
  if (u.google?.picture) return u.google.picture;
  if (u.twitter?.profilePictureUrl) return u.twitter.profilePictureUrl;
  if (u.discord?.avatarUrl) return u.discord.avatarUrl;
  if (u.github?.avatarUrl) return u.github.avatarUrl;
  if (u.farcaster?.pfp) return u.farcaster.pfp;

  // Check linked accounts array
  if (Array.isArray(u.linkedAccounts)) {
    for (const acc of u.linkedAccounts) {
      if (acc.picture) return acc.picture;
      if (acc.profilePictureUrl) return acc.profilePictureUrl;
      if (acc.avatarUrl) return acc.avatarUrl;
      if (acc.pfp) return acc.pfp;
    }
  }

  // Check custom metadata
  if (u.customMetadata?.photoUrl) return u.customMetadata.photoUrl;

  return null;
}

export function extractUserDisplayName(user: unknown): string {
  if (!user || typeof user !== 'object') return 'Player';
  const u = user as Record<string, any>;

  if (u.google?.name) return u.google.name.split(' ')[0];
  if (u.twitter?.name) return u.twitter.name;
  if (u.email?.address) return u.email.address.split('@')[0];
  if (u.wallet?.address) {
    const addr = String(u.wallet.address);
    return `KTK-${addr.slice(2, 6).toUpperCase()}`;
  }
  return 'Legend';
}

/**
 * Reads and optionally downsamples an image file to a lightweight data URL
 */
export async function processImageFile(file: File, maxWidth = 800, maxHeight = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export as WebP or JPEG for compact size
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
