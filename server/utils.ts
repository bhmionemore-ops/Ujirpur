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

  // Try to find markdown code block first
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  if (match) {
    cleaned = match[1].trim();
  } else {
    // Fallback: search for first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
    }
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

export function getNewsPrompt(date: string, lang: 'bn' | 'en'): string {
  const langName = lang === 'bn' ? 'Bengali' : 'English';
  return `Find the latest news and trends for the date: ${date} for the following categories:
  
  1. Local News: 5 latest news items from Barnia, Nadia, West Bengal.
  2. Facebook Trends: 5 latest VIRAL trends for Facebook in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
  3. Instagram Trends: 5 latest VIRAL trends for Instagram in India and West Bengal. Provide a "Viral Content Blueprint" for influencers.
  
  For News items, provide: Title, Content (150-200 words), Source, Date.
  For Trends, provide: Title (e.g., "Top 1 (WB): ..."), Content (Viral Strategy: Why it's trending, Hook Idea, Creation Tips, Viral Secret, Engagement Booster, Monetization Tip, Hashtags), Source, Date.
  
  Return the data in exactly this JSON format:
  {
    "local": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}],
    "fbTrends": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}],
    "igTrends": [{"title": "...", "content": "...", "source": "...", "date": "${date}"}]
  }
  
  IMPORTANT: All text must be in ${langName}.
  Return exactly 5 items per category. Ensure the news is relevant to ${date}.`;
}
