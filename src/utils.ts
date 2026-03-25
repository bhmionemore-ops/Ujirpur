import { toast } from 'sonner';

export const shareContent = async (title: string, text: string, url: string = window.location.href) => {
  // Automatically convert private dev URLs to public shared URLs for social media
  let shareUrl = url;
  if (shareUrl.includes('ais-dev-')) {
    shareUrl = shareUrl.replace('ais-dev-', 'ais-pre-');
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
