import { toast } from 'sonner';

export const shareContent = async (title: string, text: string, url: string = window.location.href) => {
  // Use APP_URL if set, otherwise use current URL
  let shareUrl = url;
  const configuredAppUrl = process.env.APP_URL;

  // If we have a configured APP_URL, replace the current origin with it
  if (configuredAppUrl && !shareUrl.startsWith(configuredAppUrl)) {
    try {
      const currentUrl = new URL(shareUrl);
      const baseUrl = new URL(configuredAppUrl);
      shareUrl = `${baseUrl.origin}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    } catch (e) {
      console.error('Failed to construct share URL with APP_URL:', e);
    }
  }

  // Fallback for internal dev URLs if no custom domain is configured
  if (!configuredAppUrl && shareUrl.includes('ais-dev-')) {
    shareUrl = shareUrl.replace('ais-dev-', 'ais-pre-');
  }

  // Decode the URL at the very end to ensure human-readable characters (like Bengali) 
  // are preserved instead of showing long %E0%A6... encoded strings in the clipboard/share
  try {
    shareUrl = decodeURIComponent(shareUrl);
  } catch (e) {
    console.warn('Failed to decode share URL:', e);
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: shareUrl });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${shareUrl}`);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  }
};

export const getGoogleDriveImageUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }
  if (url.includes('drive.google.com/open?id=')) {
    const id = url.split('id=')[1]?.split('&')[0];
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }
  return url;
};

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars (only allow English letters, numbers, and hyphens)
    .replace(/--+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
};
