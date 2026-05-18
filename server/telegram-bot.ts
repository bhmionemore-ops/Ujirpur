import fetch from "node-fetch";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";

export async function getTelegramBotToken(): Promise<string | null> {
  const allEnvKeys = Object.keys(process.env);
  let botTokenKey: string | undefined = allEnvKeys.find(k => k === 'TELEGRAM_BOT_TOKEN') || 
                    allEnvKeys.find(k => k === 'VITE_TELEGRAM_BOT_TOKEN');

  if (!botTokenKey) {
    botTokenKey = allEnvKeys.find(k => {
      const uk = k.toUpperCase();
      return uk.includes('TELEGRAM') && uk.includes('TOKEN');
    });
  }

  if (!botTokenKey) {
    botTokenKey = allEnvKeys.find(k => {
      const uk = k.toUpperCase();
      return uk.includes('TELEGRAM') && uk.includes('BOT') && !uk.includes('USER');
    });
  }
  
  const token = botTokenKey ? process.env[botTokenKey] : null;
  return token ? token.trim() : null;
}

export async function handleTelegramWebhook(req: any, res: any, lastPhotos: Map<number, any>, telegramLinkCache: Map<number, any>, db: any, adminDb: any) {
  const body = req.body;
  if (!body || !body.message) {
    return res.status(200).send("OK");
  }

  const { message } = body;
  const chatId = message.chat.id;
  const text = message.text || "";
  const from = message.from;

  console.log(`[Telegram] Message from ${from?.first_name} (${chatId}): ${text.substring(0, 50)}`);
  
  res.status(200).send("OK");

  const botToken = await getTelegramBotToken();
  if (!botToken) {
    console.error("[Telegram] BOT_TOKEN missing");
    return;
  }

  const sendMessage = async (msg: string, options: any = {}) => {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, ...options })
      });
    } catch (e) {
      console.error("[Telegram] sendMessage failed:", e);
    }
  };

  if (text === "/start") {
    await sendMessage("Hello! I am Barnali, your AI assistant for Barnia Digital Hub. How can I help you today?");
    return;
  }

  // Handle images if any
  if (message.photo) {
    const photo = message.photo[message.photo.length - 1]; // Get largest
    await sendMessage("I see you've sent a photo! Let me take a look...");
    // Add image processing logic here if needed
    return;
  }

  // Gemini Response logic
  try {
    const apiKey = await getGeminiApiKey();
    const result = await callGeminiWithRetry(apiKey, {
      model: "gemini-3-flash-preview",
      contents: `You are Barnali, a helpful AI assistant for Barnia Digital Hub. User asks: ${text}`
    });
    
    await sendMessage(result.text);
  } catch (error: any) {
    console.error("[Telegram] Gemini Error:", error.message);
    await sendMessage("I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.");
  }
}
