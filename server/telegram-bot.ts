import fetch from "node-fetch";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { parseGeminiJson } from "./utils";

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

  const sendMessage = async (msg: string, options: any = {}) => {
    try {
      const rawRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, ...options })
      });
      if (!rawRes.ok && options.parse_mode) {
        // Fallback to plain text if markdown formatting failed
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg })
        });
      }
    } catch (e) {
      console.error("[Telegram] sendMessage failed:", e);
    }
  };

  // Standard static command routing
  const textLower = text.toLowerCase().trim();

  if (textLower === "/start") {
    await sendMessage(
      "Hello! I am Barnali 🌸, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n" +
      "I am dedicated specifically to helping you manage your village profile, browse the local marketplace (Bazar), see auspicious dates on the Ponjika calendar, and view or edit your family tree (*Vamshavali*).\n\n" +
      "🔗 *Link Your Family Tree:*\n" +
      "To enable tree updates, please link your profile first by typing:\n" +
      "`/link <your-email>` or `/link <shareId>` (or say: 'link my tree with xyz@gmail.com').\n\n" +
      "Let me know how I can assist you today with the *barnia.in* app!",
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (textLower === "/unlink") {
    if (adminDb) {
      try {
        await adminDb.collection("telegram_users").doc(chatId.toString()).set({
          linkedProfileId: null,
          linkedEmail: null,
          linkedShareId: null
        }, { merge: true });
        await sendMessage("🔓 *Successfully unlinked your family tree.* You can link to another account anytime using `/link <email>`!", { parse_mode: "Markdown" });
      } catch (e: any) {
        await sendMessage("Could not complete unlinking. Please try again later.");
      }
    }
    return;
  }

  // 1. Fetch Telegram state database & bootstrap if missing
  let linkedProfileId: string | null = null;
  let linkedEmail: string | null = null;
  let currentCredits = 10;

  if (adminDb) {
    try {
      const userRef = adminDb.collection("telegram_users").doc(chatId.toString());
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const udata = userSnap.data();
        currentCredits = udata.credits !== undefined ? udata.credits : 10;
        linkedProfileId = udata.linkedProfileId || null;
        linkedEmail = udata.linkedEmail || null;
      } else {
        await userRef.set({
          id: chatId.toString(),
          name: `${from.first_name || ""} ${from.last_name || ""}`.trim() || from.username || `Chat ${chatId}`,
          username: from.username || null,
          credits: 10,
          role: "user",
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("[Telegram] State retrieval / bootstrap error:", err);
    }
  }

  // 2. Handling Direct & Conversational Family Tree Linking
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = text.match(emailRegex);
  const isLinkCmd = textLower.startsWith("/link");
  const isLinkMention = textLower.includes("link") && (emailMatch || textLower.match(/\b([A-Z0-9]{8})\b/i));

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
      await sendMessage(
        `💖 *Connected Successfully!*\n\n` +
        `I have linked your Telegram chat to the family tree of *"${foundProfile.name}"*.\n\n` +
        `From now on, I will remember this tree. You can ask me questions about it or make updates anytime!`,
        { parse_mode: "Markdown" }
      );
      return;
    } else {
      await sendMessage(
        `❌ *Family Tree Not Found*\n\n` +
        `I couldn't find any family tree under the email or share ID: *"${linkArg}"*.\n\n` +
        `Make sure the email is registered in the *Vamshavali* section of [barnia.in](https://barnia.in).`,
        { parse_mode: "Markdown" }
      );
      return;
    }
  }

  // 3. Process Photo upload (caching / capturing URL)
  let activePhotoUrl: string | null = null;
  const unifiedPrompt = message.caption || message.text || "";

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

  // 4. Fetch the linked family tree data if exists
  let linkedProfile: any = null;
  if (adminDb && linkedProfileId) {
    try {
      const snap = await adminDb.collection("vamshavali_profiles").doc(linkedProfileId).get();
      if (snap.exists) {
        linkedProfile = { id: snap.id, ...snap.data() };
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

FAMILY TREE (VAMSHAVALI) MUTATION INTEGRATION:
The user's currently linked Vamshavali profile is:
${linkedProfile ? JSON.stringify(linkedProfile) : "None (Not linked)"}

- If the user asks to UPDATE, CHANGE, ADD, or REMOVE information or images/pictures in their family tree:
  1. Produce a structured JSON payload response matching this exact shape:
  {
    "isUpdate": true,
    "updatedProfile": { <insert the FULL updated profile JSON incorporating all original details with the newly requested modifications applied> },
    "summary": "A friendly scannable summary in Markdown describing exactly what changes you performed (e.g. 'Updated Savitri Devi\\'s birth year to 1944.')."
  }
  2. Each member has properties: id, name, role, birthYear, photo, partner { name, birthYear, photo }, and children []. For nested member array updates, traverse and modify the recursive 'members' list.
  3. Generating member additions: generate unique IDs (e.g., 'member_id_xyz123') for new children/spouses.
  4. PICTURE/PHOTO UPDATES INSTRUCTIONS:
     - The user has provided an image/picture URL to associate: "${activePhotoUrl || ""}"
     - **Kuldevi / Kuldavi (Deity)**: If they express the intent to upload or set the image of "Kuldevi" or "Kuldavi" (or family goddess/deity), set the root-level property 'kuldeviPhoto' of the profile to "${activePhotoUrl || ""}".
     - **Specific Relative by Name**: If they name a member (e.g., "upload this picture of Abhay", "this is Abhay's picture", "update Abhay's picture"), recursively find a member whose name is "Abhay" (case-insensitive, fuzzy or partial match) and update their 'photo' property to "${activePhotoUrl || ""}".
     - **Spouse / Wife / "viva" / Partner**:
       - If they say "upload this picture of [Name]'s wife / partner / sponsor / spouse / viva", locate the member with that name (e.g., "Abhay") and set their 'partner.photo' property to "${activePhotoUrl || ""}". If the 'partner' object is missing or null under that member, initialize it like 'partner: { name: "Spouse of " + Name, photo: "${activePhotoUrl || ""}" }'.
       - If they say "upload this picture of my partner / wife / viva / spouse", locate the main/root member of the family tree and update their 'partner.photo' property to "${activePhotoUrl || ""}".
     - **By Relation description**: If they say "my grandmother's picture" or "my daughter's photo", trace the relation starting from the main root node and update the matching member's 'photo' to "${activePhotoUrl || ""}".
- If the request is NOT a family tree modification (e.g., just general help, asking about Bazar, asking about auspicious dates, or querying details from their tree), proceed by returning standard human-readable text directly (do NOT wrap inside JSON structure).

Format answers beautifully. Speak in Bengali or English based on the user's language. Keep answers concise.`;

    const response = await callGeminiWithRetry(apiKey, {
      model: "gemini-3-flash-preview",
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
          
          await sendMessage(`✅ *Family Tree Updated In Cloud Ledger!*\n\n${payload.summary || "Changes saved."}\n\nLive preview updated on [barnia.in/vamshavali](https://barnia.in/vamshavali).`, { parse_mode: "Markdown" });
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

