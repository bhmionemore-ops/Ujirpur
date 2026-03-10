export const shareContent = async (title: string, text: string, url: string = window.location.href) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
};
