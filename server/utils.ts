export function slugify(text: string | null | undefined) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\u0980-\u09FF-]+/g, '') 
    .replace(/--+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function cleanGeminiJson(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  return cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
    return match
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  });
}

export function parseGeminiJson(text: string, defaultValue: any = {}) {
  try {
    const cleaned = cleanGeminiJson(text);
    return JSON.parse(cleaned);
  } catch (error: any) {
    try {
      const aggressive = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
      const stillCleaned = cleanGeminiJson(aggressive);
      return JSON.parse(stillCleaned);
    } catch (innerError) {
      return defaultValue;
    }
  }
}
