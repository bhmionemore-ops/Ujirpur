import fetch from "node-fetch";
import admin from "firebase-admin";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { parseGeminiJson } from "./utils";

let cachedBotToken: string | null = null;
let commandsRegistered = false;

async function registerBotCommands(botToken: string) {
  if (commandsRegistered) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Start or status check of Barnali AI" },
          { command: "bazar", description: "Browse Barnia Local Bazar directory" },
          { command: "ponjika", description: "Check auspicious days & Ponjika dates" },
          { command: "credits", description: "Check remaining AI credits" },
          { command: "link", description: "Connect family tree: /link <email>" },
          { command: "unlink", description: "Disconnect connected family tree" },
          { command: "help", description: "View commands details and manual" }
        ]
      })
    });
    const resData = await response.json() as any;
    if (resData && resData.ok) {
      console.log("[Telegram] Client command shortcut menus registered successfully.");
      commandsRegistered = true;
    } else {
      console.error("[Telegram] setMyCommands failed:", resData);
    }
  } catch (error) {
    console.error("[Telegram] Error registering Telegram client commands:", error);
  }
}

export async function getTelegramBotToken(): Promise<string | null> {
  if (cachedBotToken) {
    return cachedBotToken;
  }

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
  const result = token ? token.trim() : null;
  cachedBotToken = result;
  return result;
}

async function getTelegramFileUrl(fileId: string, botToken: string): Promise<string | null> {
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json() as any;
    if (fileData && fileData.ok && fileData.result && fileData.result.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    }
  } catch (e) {
    console.error("[Telegram Bot] Error getting file path:", e);
  }
  return null;
}

export async function handleTelegramWebhook(req: any, res: any, lastPhotos: Map<number, any>, telegramLinkCache: Map<number, any>, db: any, adminDb: any) {
  const body = req.body;
  if (!body || !body.message) {
    return res.status(200).send("OK");
  }

  const { message } = body;
  const chatId = message.chat.id;
  const text = message.text || "";
  const from = message.from || {};

  console.log(`[Telegram] Message from ${from?.first_name} (${chatId}): ${text.substring(0, 55)}`);
  
  res.status(200).send("OK");

  const botToken = await getTelegramBotToken();
  if (!botToken) {
    console.error("[Telegram] BOT_TOKEN missing");
    return;
  }

  // Register modern quick command shortcut menus dynamically to the user's client app
  registerBotCommands(botToken).catch(console.error);

  const quickChatMenuMarkup = {
    keyboard: [
      [{ text: "🌳 My Family Tree" }, { text: "🌽 Barnia Bazar" }],
      [{ text: "📅 Local Ponjika" }, { text: "💳 Check Credits" }, { text: "❓ Help" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  const sendMessage = async (msg: string, options: any = {}) => {
    try {
      const payloadOptions = {
        reply_markup: quickChatMenuMarkup,
        ...options
      };
      const rawRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, ...payloadOptions })
      });
      if (!rawRes.ok && options.parse_mode) {
        // Fallback to plain text if markdown formatting failed
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, reply_markup: quickChatMenuMarkup })
        });
      }
    } catch (e) {
      console.error("[Telegram] sendMessage failed:", e);
    }
  };

  // 1. Fetch Telegram state database & bootstrap if missing (or use memory cache)
  let linkedProfileId: string | null = null;
  let linkedEmail: string | null = null;
  let linkedShareId: string | null = null;
  let currentCredits = 10;
  let linkedProfile: any = null;
  let isNewUser = false;
  let telegramName = `${from.first_name || ""} ${from.last_name || ""}`.trim() || from.username || "Friend";

  const cachedUser = telegramLinkCache.get(chatId);
  const cacheAge = cachedUser ? (Date.now() - cachedUser.timestamp) : Infinity;

  if (cachedUser && cacheAge < 10 * 60 * 1000) { // 10 minutes cache
    linkedProfileId = cachedUser.linkedProfileId || null;
    linkedEmail = cachedUser.linkedEmail || null;
    linkedShareId = cachedUser.linkedShareId || null;
    currentCredits = cachedUser.currentCredits !== undefined ? cachedUser.currentCredits : 10;
    linkedProfile = cachedUser.linkedProfile || null;
    telegramName = cachedUser.telegramName || telegramName;
    console.log(`[Telegram Cache Hit] User: ${chatId} (${telegramName}), LinkedProfileId: ${linkedProfileId}, ShareId: ${linkedShareId}`);
  } else {
    if (adminDb) {
      try {
        const userRef = adminDb.collection("telegram_users").doc(chatId.toString());
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          const udata = userSnap.data();
          currentCredits = udata.credits !== undefined ? udata.credits : 10;
          linkedProfileId = udata.linkedProfileId || null;
          linkedEmail = udata.linkedEmail || null;
          linkedShareId = udata.linkedShareId || null;
          telegramName = udata.name || telegramName;
        } else {
          isNewUser = true;
          await userRef.set({
            id: chatId.toString(),
            name: telegramName,
            username: from.username || null,
            credits: 10,
            role: "user",
            createdAt: new Date().toISOString()
          });
        }

        // Fetch linked tree profile
        if (linkedProfileId) {
          const snap = await adminDb.collection("vamshavali_profiles").doc(linkedProfileId).get();
          if (snap.exists) {
            linkedProfile = { id: snap.id, ...snap.data() };
            linkedShareId = linkedProfile.shareId || null;
          }
        }

        // Save to cache
        telegramLinkCache.set(chatId, {
          linkedProfileId,
          linkedEmail,
          linkedShareId,
          currentCredits,
          linkedProfile,
          telegramName,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("[Telegram] State retrieval / bootstrap error:", err);
      }
    }
  }

  // Support quick menu buttons mapping: map quick buttons text to clean actions
  let cleanText = text.trim();
  if (cleanText.startsWith("🌳 ") || cleanText.startsWith("🌽 ") || cleanText.startsWith("📅 ") || cleanText.startsWith("💳 ") || cleanText.startsWith("❓ ") || cleanText.startsWith("⚙️ ")) {
    const rawNoEmoji = cleanText.substring(2).trim();
    if (rawNoEmoji.toLowerCase().includes("family tree")) {
      cleanText = "view my family tree";
    } else if (rawNoEmoji.toLowerCase().includes("bazar")) {
      cleanText = "tell me about barnia bazar";
    } else if (rawNoEmoji.toLowerCase().includes("ponjika")) {
      cleanText = "check local ponjika";
    } else if (rawNoEmoji.toLowerCase().includes("credits")) {
      cleanText = "/credits";
    } else if (rawNoEmoji.toLowerCase().includes("help")) {
      cleanText = "/help";
    }
  }

  // Handle explicit non-slash commands that came from menus in lower case
  let textLower = cleanText.toLowerCase().trim();

  if (textLower === "view my family tree" || textLower === "/tree") {
    if (linkedProfile && linkedProfile.shareId) {
      const treeLink = `https://barnia.in/vamshavali/v/${linkedProfile.shareId}`;
      await sendMessage(
        `🌳 *Your Connected Family Tree* 🌳\n\n` +
        `👤 *Name:* ${linkedProfile.name}\n` +
        `🔗 *Public Link:* [My Family Tree Link](${treeLink})\n\n` +
        `You can easily view or link other family relatives by chatting with me directly here!`,
        { parse_mode: "Markdown" }
      );
      return;
    } else {
      await sendMessage(
        `⚠️ *No Family Tree Connected*\n\n` +
        `To link your family tree to this Telegram chat, please type:\n` +
        `/link <your-email> (for example: \`/link contact@barnia.in\`).`,
        { parse_mode: "Markdown" }
      );
      return;
    }
  }

  if (textLower === "/credits" || textLower === "check credits") {
    await sendMessage(
      `💳 *AI Assistant Credits Check* 💳\n\n` +
      `👤 *User:* ${telegramName}\n` +
      `✨ *Current Credit Balance:* \`${currentCredits}\`\n\n` +
      `Every query or custom tree update uses 1 credit.\n` +
      `Need more? Visit [barnia.in/ai-router](https://barnia.in/ai-router) to recharge!`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (textLower === "/help" || textLower === "help") {
    const linkStatus = linkedProfile 
      ? `✅ Linked to *"${linkedProfile.name}"*`
      : `❌ Not connected yet. Use \`/link <email>\` to link.`;
      
    await sendMessage(
      `🌸 *Barnali AI Bot Help Manual* 🌸\n\n` +
      `I am Barnali, your conversational AI companion for **Barnia Digital Hub** (\`barnia.in\`).\n\n` +
      `🚦 *Current Connection Status:*\n` +
      `• *User Profile:* ${linkStatus}\n` +
      `• *Your Balance:* \`${currentCredits}\` credits\n\n` +
      `🛠️ *Available Commands:*\n` +
      `• \`/start\` - Boot/status check\n` +
      `• \`/link <email>\` - Connect tree via registered email\n` +
      `• \`/unlink\` - Disconnect tree from Telegram\n` +
      `• \`/credits\` - Check remaining AI credits\n` +
      `• \`/help\` - Show helpful commands manual\n\n` +
      `✨ *Quick Chat Menu Buttons:*\n` +
      `Use the simple buttons at the bottom of your screen to trigger immediate actions:\n` +
      `• *🌳 My Family Tree* - Display your registered Vamshavali page link\n` +
      `• *🌽 Barnia Bazar* - Check market items, local prices & shops\n` +
      `• *📅 Local Ponjika* - Check rural Hindu calendars & auspicious timings\n` +
      `• *💳 Check Credits* - Show remaining assistant credits\n\n` +
      `Type any general queries about Barnia village, directories, or your lineage, and I'll assist!`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Support /start and /start <param> (deeplink)
  const startParts = cleanText.trim().split(/\s+/);
  const isStartCmd = startParts[0].toLowerCase() === "/start";

  if (isStartCmd) {
    const startParam = startParts.length > 1 ? startParts[1].trim() : null;

    if (startParam) {
      let foundProfile: any = null;
      if (adminDb) {
        try {
          const queryEmail = await adminDb.collection("vamshavali_profiles").where("email", "==", startParam.toLowerCase().trim()).limit(1).get();
          if (!queryEmail.empty) {
            foundProfile = { id: queryEmail.docs[0].id, ...queryEmail.docs[0].data() };
          } else {
            const queryShare = await adminDb.collection("vamshavali_profiles").where("shareId", "==", startParam.toUpperCase().trim()).limit(1).get();
            if (!queryShare.empty) {
              foundProfile = { id: queryShare.docs[0].id, ...queryShare.docs[0].data() };
            }
          }
        } catch (err) {
          console.error("[Telegram] Error searching family tree on automatic start linking:", err);
        }
      }

      if (foundProfile) {
        if (adminDb) {
          await adminDb.collection("telegram_users").doc(chatId.toString()).set({
            linkedProfileId: foundProfile.id,
            linkedEmail: foundProfile.email || null,
            linkedShareId: foundProfile.shareId || null,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Update memory cache
        telegramLinkCache.set(chatId, {
          linkedProfileId: foundProfile.id,
          linkedEmail: foundProfile.email || null,
          linkedShareId: foundProfile.shareId || null,
          currentCredits,
          linkedProfile: foundProfile,
          telegramName,
          timestamp: Date.now()
        });

        await sendMessage(
          `💖 *Connected Automatically!*\n\n` +
          `I have automatically linked your Telegram chat to the family tree of *"${foundProfile.name}"* (ID: \`${foundProfile.shareId || foundProfile.id}\`).\n\n` +
          `From now on, I will remember this tree! Whenever you send a message or a picture, we'll consult and update this tree.\n\n` +
          `Enjoy using your voice, text, or pictures to build your tree on [barnia.in/vamshavali](https://barnia.in/vamshavali)!`,
          { parse_mode: "Markdown" }
        );
        return;
      } else {
        // Auto-bootstrap if the parameter looks like email
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        if (startParam.match(emailRegex)) {
          try {
            const { bootstrapProfile } = await import("./vamshavali-logic");
            const newProfile = await bootstrapProfile(startParam.toLowerCase().trim(), db, adminDb, admin);
            if (newProfile) {
              if (adminDb) {
                await adminDb.collection("telegram_users").doc(chatId.toString()).set({
                  linkedProfileId: newProfile.id,
                  linkedEmail: newProfile.email || null,
                  linkedShareId: newProfile.shareId || null,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              }

              // Update memory cache
              telegramLinkCache.set(chatId, {
                linkedProfileId: newProfile.id,
                linkedEmail: newProfile.email || null,
                linkedShareId: newProfile.shareId || null,
                currentCredits,
                linkedProfile: newProfile,
                telegramName,
                timestamp: Date.now()
              });

              await sendMessage(
                `✨ *Tree Initialized & Connected!*\n\n` +
                `I have initialized a fresh family tree for *"${startParam.toLowerCase().trim()}"* and automatically linked it to this chat.\n\n` +
                `You can view/edit it on [barnia.in/vamshavali](https://barnia.in/vamshavali) or make updates here in this chat!`,
                { parse_mode: "Markdown" }
              );
              return;
            }
          } catch (bootstrapErr: any) {
            console.error("[Telegram] Auto-bootstrap error during start param:", bootstrapErr);
          }
        }

        await sendMessage(
          `👋 Welcome! I am Barnali 🌸, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n` +
          `⚠️ *Link ID Not Found*\n` +
          `I tried to automatically link your tree using parameter *"${startParam}"*, but couldn't find a matching family tree.\n\n` +
          `Please link your profile first by typing:\n` +
          `\`/link <your-email>\` or \`/link <shareId>\` (e.g., \`/link contact@barnia.in\`).\n\n` +
          `Let me know how I can assist you today with the *barnia.in* app!`,
          { parse_mode: "Markdown" }
        );
        return;
      }
    } else {
      const userFirstName = from.first_name || from.username || "Friend";
      
      if (linkedProfile) {
        // Welcoming back a linked returning user
        const treeLink = linkedProfile.shareId 
          ? `[My Family Tree](https://barnia.in/vamshavali/v/${linkedProfile.shareId})`
          : `[My Family Tree](https://barnia.in/vamshavali)`;
          
        await sendMessage(
          `🌸 *Welcome back, ${userFirstName}!* 🌸\n\n` +
          `I am Barnali, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n` +
          `💖 *Active Connection:*\n` +
          `• *Linked Tree:* *"${linkedProfile.name}"*\n` +
          `• *Linked Email:* \`${linkedEmail || "N/A"}\`\n` +
          `• *Tree Link:* ${treeLink}\n\n` +
          `I remember you and your family tree! Tell me or send me a photo to update it, or ask me anything about the local Bazar or Ponjika!`,
          { parse_mode: "Markdown" }
        );
      } else if (!isNewUser) {
        // Welcoming back an unlinked returning user
        await sendMessage(
          `🌸 *Welcome back, ${userFirstName}!* 🌸\n\n` +
          `I am Barnali, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n` +
          `🔗 *Link Your Family Tree:*\n` +
          `To enable tree updates, please link your profile first by typing:\n` +
          `\`/link <your-email>\` or \`/link <shareId>\` (or say: 'link my tree with xyz@gmail.com').\n\n` +
          `Let me know how I can assist you today with the *barnia.in* app!`,
          { parse_mode: "Markdown" }
        );
      } else {
        // First-time start
        await sendMessage(
          `Hello ${userFirstName}! I am Barnali 🌸, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n` +
          `I am dedicated specifically to helping you manage your village profile, browse the local marketplace (Bazar), see auspicious dates on the Ponjika calendar, and view or edit your family tree (*Vamshavali*).\n\n` +
          `🔗 *Link Your Family Tree:*\n` +
          `To enable tree updates, please link your profile first by typing:\n` +
          `\`/link <your-email>\` or \`/link <shareId>\` (or say: 'link my tree with xyz@gmail.com').\n\n` +
          `Let me know how I can assist you today with the *barnia.in* app!`,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }
  }

  if (textLower === "/unlink") {
    if (adminDb) {
      try {
        await adminDb.collection("telegram_users").doc(chatId.toString()).set({
          linkedProfileId: null,
          linkedEmail: null,
          linkedShareId: null
        }, { merge: true });

        // Update memory cache
        telegramLinkCache.set(chatId, {
          linkedProfileId: null,
          linkedEmail: null,
          linkedShareId: null,
          currentCredits,
          linkedProfile: null,
          telegramName,
          timestamp: Date.now()
        });

        await sendMessage("🔓 *Successfully unlinked your family tree.* You can link to another account anytime using `/link <email>`!", { parse_mode: "Markdown" });
      } catch (e: any) {
        await sendMessage("Could not complete unlinking. Please try again later.");
      }
    }
    return;
  }

  // 2. Handling Direct & Conversational Family Tree Linking
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = text.match(emailRegex);
  const isLinkCmd = textLower.startsWith("/link");
  const isLinkMention = (textLower.includes("link") && (emailMatch || textLower.match(/\b([A-Z0-9]{8})\b/i))) || (!linkedProfileId && emailMatch);

  // If customer credit is 0, they should not be able to do anything except start, link, or unlink commands.
  if (currentCredits <= 0 && textLower !== "/start" && !isLinkCmd && !isLinkMention && textLower !== "/unlink") {
    await sendMessage(
      "⚠️ *No Credits Remaining*\n\n" +
      "Your credit balance is 0. You cannot use Barnali AI assistant features. Please recharge your credits on [barnia.in/ai-router](https://barnia.in/ai-router) to continue using our services.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (isLinkCmd || isLinkMention) {
    let linkArg = "";
    if (isLinkCmd) {
      linkArg = text.replace(/^\s*\/link/i, "").trim();
    } else if (emailMatch) {
      linkArg = emailMatch[1];
    } else {
      const shareIdMatch = text.match(/\b([A-Z0-9]{8})\b/i);
      if (shareIdMatch) linkArg = shareIdMatch[1];
    }

    if (!linkArg) {
      await sendMessage("Please specify your email or family tree share ID to link. Example:\n`/link contact@barnia.in` or `/link AB12CD34`", { parse_mode: "Markdown" });
      return;
    }

    let foundProfile: any = null;
    if (adminDb) {
      try {
        const queryEmail = await adminDb.collection("vamshavali_profiles").where("email", "==", linkArg.toLowerCase().trim()).limit(1).get();
        if (!queryEmail.empty) {
          foundProfile = { id: queryEmail.docs[0].id, ...queryEmail.docs[0].data() };
        } else {
          const queryShare = await adminDb.collection("vamshavali_profiles").where("shareId", "==", linkArg.toUpperCase().trim()).limit(1).get();
          if (!queryShare.empty) {
            foundProfile = { id: queryShare.docs[0].id, ...queryShare.docs[0].data() };
          }
        }
      } catch (err) {
        console.error("[Telegram] Error searching family tree:", err);
      }
    }

    if (foundProfile) {
      if (adminDb) {
        await adminDb.collection("telegram_users").doc(chatId.toString()).set({
          linkedProfileId: foundProfile.id,
          linkedEmail: foundProfile.email || null,
          linkedShareId: foundProfile.shareId || null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Update memory cache
      telegramLinkCache.set(chatId, {
        linkedProfileId: foundProfile.id,
        linkedEmail: foundProfile.email || null,
        linkedShareId: foundProfile.shareId || null,
        currentCredits,
        linkedProfile: foundProfile,
        telegramName,
        timestamp: Date.now()
      });

      await sendMessage(
        `💖 *Connected Successfully!*\n\n` +
        `I have linked your Telegram chat to the family tree of *"${foundProfile.name}"*.\n\n` +
        `From now on, I will remember this tree. You can ask me questions about it or make updates anytime!`,
        { parse_mode: "Markdown" }
      );
      return;
    } else {
      // Let's check if the linkArg looks like a valid email. If so, we can auto-bootstrap a profile for them!
      if (linkArg.match(emailRegex)) {
        try {
          const { bootstrapProfile } = await import("./vamshavali-logic");
          const newProfile = await bootstrapProfile(linkArg.toLowerCase().trim(), db, adminDb, admin);
          if (newProfile) {
            if (adminDb) {
              await adminDb.collection("telegram_users").doc(chatId.toString()).set({
                linkedProfileId: newProfile.id,
                linkedEmail: newProfile.email || null,
                linkedShareId: newProfile.shareId || null,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }

            // Update memory cache
            telegramLinkCache.set(chatId, {
              linkedProfileId: newProfile.id,
              linkedEmail: newProfile.email || null,
              linkedShareId: newProfile.shareId || null,
              currentCredits,
              linkedProfile: newProfile,
              telegramName,
              timestamp: Date.now()
            });

            await sendMessage(
              `✨ *Tree Initialized & Connected!*\n\n` +
              `I couldn't find an existing family tree for *"${linkArg.toLowerCase().trim()}"*, so I have initialized a fresh tree for you and linked it to this chat.\n\n` +
              `You can view/edit it on [barnia.in/vamshavali](https://barnia.in/vamshavali) or make updates directly here in this chat!`,
              { parse_mode: "Markdown" }
            );
            return;
          }
        } catch (bootstrapErr: any) {
          console.error("[Telegram] Auto-bootstrap error during linking:", bootstrapErr);
        }
      }

      await sendMessage(
        `❌ *Family Tree Not Found*\n\n` +
        `I couldn't find any family tree under the email or share ID: *"${linkArg}"*.\n\n` +
        `Make sure the email is registered in the *Vamshavali* section of [barnia.in](https://barnia.in) or supply a valid email to bootstrap a fresh tree!`,
        { parse_mode: "Markdown" }
      );
      return;
    }
  }

  // 3. Process Photo upload (caching / capturing URL)
  let activePhotoUrl: string | null = null;
  const unifiedPrompt = message.caption || cleanText || "";

  if (message.photo) {
    const photo = message.photo[message.photo.length - 1]; // maximum size
    await sendMessage("Receiving photo... 📸");
    activePhotoUrl = await getTelegramFileUrl(photo.file_id, botToken);
    
    if (activePhotoUrl) {
      lastPhotos.set(chatId, { url: activePhotoUrl, timestamp: Date.now() });
    }
  }

  // If no photo in current event, try to lookup cache if text prompt contains updating picture/photo
  if (!activePhotoUrl && lastPhotos.has(chatId) && unifiedPrompt.toLowerCase().match(/\b(photo|picture|face|image|avatar|img|profile)\b/)) {
    const cached = lastPhotos.get(chatId);
    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) { // 5 mins threshold
      activePhotoUrl = cached.url;
    }
  }

  // 4. Fetch the linked family tree data if exists (already fetched in step 1 or cached, but fallback just in case)
  if (!linkedProfile && adminDb && linkedProfileId) {
    try {
      const snap = await adminDb.collection("vamshavali_profiles").doc(linkedProfileId).get();
      if (snap.exists) {
        linkedProfile = { id: snap.id, ...snap.data() };
        linkedShareId = linkedProfile.shareId || null;
        
        // Update memory cache
        telegramLinkCache.set(chatId, {
          linkedProfileId,
          linkedEmail,
          linkedShareId,
          currentCredits,
          linkedProfile,
          telegramName,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error("[Telegram] Error fetching linked tree profile:", err);
    }
  }

  // Grounding & Intercepting if they attempt to edit an unlinked tree
  const hasUpdateKeyword = unifiedPrompt.toLowerCase().match(/\b(update|change|set|add|modify|delete|remove|photo|picture|image|avatar|img|profile|kuldevi|kuldavi|viva|wife|partner|spouse|upload)\b/);
  const isUpdatingTree = !!activePhotoUrl || !!hasUpdateKeyword;
  if (isUpdatingTree && !linkedProfile) {
    await sendMessage(
      "⚠️ *Family Tree Link Required*\n\n" +
      "I see you want to modify family tree parameters or upload a picture, but I don't know which family tree belongs to you.\n\n" +
      "Please link your family tree first by supplying your email, chat, or share ID:\n" +
      "`/link contact@barnia.in` or `my email is contact@barnia.in` or `/link AB12CD34`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // 5. Construct Gemini Grounding & Task Prompt
  try {
    const apiKey = await getGeminiApiKey();

    const systemPrompt = `You are Barnali 🌸, the smart, friendly, and helpful AI assistant for the barnia.in app (Barnia Digital Hub).

The user you are chatting with is named: ${telegramName}.
When greeting them or welcoming them, ALWAYS make sure to treat them with warmth and refer to them as "${telegramName}".
If they are starting, returning, or continuing the conversation, you should naturally greet them with a polite phrase like "Welcome back, ${telegramName}!" or "Hello again, ${telegramName}!".

STRICT COMPLIANCE RULES:
1. **Scope Limits**: You MUST ONLY answer questions about the barnia.in application, its features, and Barnia village. 
   Features of barnia.in include:
   - **Vamshavali (Family Tree)**: Interactive digital family lineage mapping.
   - **AI Router Hub**: SaaS API and AI Tiers playground (optimizing cost details and model routing).
   - **Barnia Bazar**: Local market retailer and vendor directory.
   - **Barnia Influencers**: Local digital content creators registry.
   - **Ponjika Calendar**: Pure Hindu astrological panchanga & rural lunar calendar.
   - **Sanatani Fact Check**: Dedicated Vedic references validation engine.
   - **Village Transport**: Transits and booking directories for Barnia.
2. If the user's inquiry is unrelated to barnia.in, Barnia village, or their linked lineage, you MUST politely decline and ground yourself. Example: "I am Barnali, dedicated specifically to helping you on barnia.in. I can only assist with platform modules, community directories, or linked genealogy trees."

FAMILY TREE (VAMSHAVALI) MUTATION INTEGRATION & LINK SHARING:
The user's currently linked Vamshavali profile is:
${linkedProfile ? JSON.stringify(linkedProfile) : "None (Not linked)"}

${linkedProfile && linkedProfile.shareId ? `The user's family tree share ID is '${linkedProfile.shareId}' and their public tree link is 'https://barnia.in/vamshavali/v/${linkedProfile.shareId}'.` : "The user does not have a fully linked active tree share ID yet."}

- If the user asks for their family tree link, asks to view/see their family tree, asks where their family tree is, or asks how to visit it, you MUST ALWAYS provide their personal public view link: https://barnia.in/vamshavali/v/${linkedProfile?.shareId || ""} (if they are linked, formatting the link nicely in Markdown like [My Family Tree](https://barnia.in/vamshavali/v/${linkedProfile?.shareId || ""})), or ask them to link their tree if not linked.
- If the user asks to UPDATE, CHANGE, ADD, or REMOVE information or images/pictures in their family tree:
  1. Produce a structured JSON payload response matching this exact shape ONLY if the required files or metadata are actually supplied:
  {
    "isUpdate": true,
    "updatedProfile": { <insert the FULL updated profile JSON incorporating all original details with the newly requested modifications applied> },
    "summary": "A friendly scannable summary in Markdown describing exactly what changes you performed (e.g. 'Updated Savitri Devi\\'s birth year to 1944.')."
  }
  2. Each member has properties: id, name, role, birthYear, photo, partner { name, birthYear, photo }, and children []. For nested member array updates, traverse and modify the recursive 'members' list.
  3. Generating member additions: generate unique IDs (e.g., 'member_id_xyz123') for new children/spouses.
  4. PICTURE/PHOTO UPDATES INSTRUCTIONS:
     - The user has provided an image/picture URL to associate: "${activePhotoUrl || ""}"
     - **CRITICAL - Handling Missing Photos**: If the user asks or expresses the intent to set, change, add, or update a photo/picture/avatar for themselves, Kuldevi, or any relative (e.g., "add my kuldavi picture", "update Abhay's picture", "set a photo of Abhay") but they HAVE NOT attached any image/photo in their message (and the image/picture URL provided above is empty/blank: "${activePhotoUrl || ""}"), you MUST NOT perform a tree update or output JSON. Instead, you MUST directly respond with friendly standard human-readable text (not JSON) in Bengali or English politely instructing them to attach/upload the actual picture file along with their message in Telegram so that you can receive the image and apply it to their tree.
     - **Kuldevi / Kuldavi (Deity)**: If they express the intent to upload or set the image of "Kuldevi" or "Kuldavi" (or family goddess/deity) AND they have provided a valid non-empty photo URL, set the root-level property 'kuldeviPhoto' of the profile to "${activePhotoUrl || ""}".
     - **Specific Relative by Name**: If they name a member (e.g., "upload this picture of Abhay", "this is Abhay's picture", "update Abhay's picture") and have provided a photo URL, recursively find a member whose name is "Abhay" (case-insensitive, fuzzy or partial match) and update their 'photo' property to "${activePhotoUrl || ""}".
     - **Spouse / Wife / "viva" / Partner**:
       - If they say "upload this picture of [Name]'s wife / partner / sponsor / spouse / viva" and have provided a photo URL, locate the member with that name (e.g., "Abhay") and set their 'partner.photo' property to "${activePhotoUrl || ""}". If the 'partner' object is missing or null under that member, initialize it like 'partner: { name: "Spouse of " + Name, photo: "${activePhotoUrl || ""}" }'.
       - If they say "upload this picture of my partner / wife / viva / spouse" and have provided a photo URL, locate the main/root member of the family tree and update their 'partner.photo' property to "${activePhotoUrl || ""}".
     - **By Relation description**: If they say "my grandmother's picture" or "my daughter's photo" and have provided a photo URL, trace the relation starting from the main root node and update the matching member's 'photo' to "${activePhotoUrl || ""}".
- If the request is NOT a family tree modification (e.g., just general help, asking about Bazar, asking about auspicious dates, or querying details from their tree), proceed by returning standard human-readable text directly (do NOT wrap inside JSON structure).

Format answers beautifully. Speak in Bengali or English based on the user's language. Keep answers concise.`;

    const response = await callGeminiWithRetry(apiKey, {
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [ { text: `${systemPrompt}\n\nUser request: ${unifiedPrompt}` } ] }
      ]
    });

    const replyText = (response.text || "").trim();
    let isTreeUpdated = false;

    // Detect and parse JSON payloads for tree updates
    if (replyText.startsWith("{") || replyText.includes('"isUpdate"')) {
      try {
        const payload = parseGeminiJson(replyText);
        if (payload && payload.isUpdate && payload.updatedProfile && linkedProfileId) {
          const profileRef = adminDb.collection("vamshavali_profiles").doc(linkedProfileId);
          
          const finalizedProfile = {
            ...payload.updatedProfile,
            id: linkedProfileId,
            updatedAt: new Date().toISOString()
          };
          delete finalizedProfile.serverKey; // ensure clean persistence
          
          await profileRef.set(finalizedProfile, { merge: true });
          
          // Clear cached state photo
          lastPhotos.delete(chatId);

          // Update memory cache
          telegramLinkCache.set(chatId, {
            linkedProfileId,
            linkedEmail,
            linkedShareId: finalizedProfile.shareId || linkedShareId || null,
            currentCredits,
            linkedProfile: finalizedProfile,
            telegramName,
            timestamp: Date.now()
          });
          
          const traceLink = finalizedProfile.shareId 
            ? `\n\nLive preview updated on [barnia.in/vamshavali/v/${finalizedProfile.shareId}](https://barnia.in/vamshavali/v/${finalizedProfile.shareId}).`
            : `\n\nLive preview updated on [barnia.in/vamshavali](https://barnia.in/vamshavali).`;

          await sendMessage(`✅ *Family Tree Updated In Cloud Ledger!*\n\n${payload.summary || "Changes saved."}${traceLink}`, { parse_mode: "Markdown" });
          isTreeUpdated = true;
        }
      } catch (err: any) {
        console.error("[Telegram Bot] JSON update logic failed:", err.message);
      }
    }

    if (!isTreeUpdated) {
      let finalMsg = replyText;
      // Strip any raw json summary fallback if model outputted JSON structure on simple query
      try {
        if (replyText.startsWith("{")) {
          const payload = parseGeminiJson(replyText);
          finalMsg = payload.summary || payload.message || finalMsg;
        }
      } catch (e) {}

      await sendMessage(finalMsg, { parse_mode: "Markdown" });
    }

  } catch (error: any) {
    console.error("[Telegram] Gemini Execution Error:", error.message);
    await sendMessage("I encountered an issue processing that query. Please try again later.");
  }
}

