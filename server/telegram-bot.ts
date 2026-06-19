import fetch from "node-fetch";
import admin from "firebase-admin";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { parseGeminiJson } from "./utils";
import { db as sqliteDb } from "./lineage-db";
import { lineageStore } from "./lineage-core";
import { GoogleGenAI } from "@google/genai";
import { randomUUID, randomBytes } from "crypto";
import { getAlmanacData, getBengaliDate, toBengaliNumber, getMonthlyPonjikaEvents, getAuspiciousMarriageDates, BENGALI_MONTHS, BENGALI_MONTHS_EN } from "../src/utils/bengaliDate";

const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

function compileAllPonjikaData(): string {
  let text = "==================================================\n";
  text += "LOCAL BENGALI PONJIKA CALENDAR DATA FOR WEST BENGAL:\n";
  text += "==================================================\n\n";

  for (let m = 0; m < 12; m++) {
    const bnMonth = BENGALI_MONTHS[m];
    const enMonth = BENGALI_MONTHS_EN[m];
    text += `• Month: ${bnMonth} (${enMonth})\n`;

    // Festivals & Highlights in English
    const enEvents = getMonthlyPonjikaEvents(m, 2026, 'en');
    text += `  - Festivals: ${enEvents.festivals.join(', ')}\n`;
    text += "  - Highlights:\n";
    enEvents.highlights.forEach(h => {
      text += `    * ${h.date}: ${h.event}\n`;
    });

    // Marriage dates
    const mDatesEn = getAuspiciousMarriageDates(m, 'en');
    text += `  - Marriage Info: ${mDatesEn.message}\n`;
    if (mDatesEn.dates.length > 0) {
      text += "    * Auspicious Dates:\n";
      mDatesEn.dates.forEach(d => {
        text += `      Date: ${d.gregorianDate} (${d.bengaliDateString}) | Lagna: ${d.lagnaTime} | Nakshatra: ${d.nakshatra} | Tithi: ${d.tithi}\n`;
      });
    }
    
    // Bengali names and events
    const bnEvents = getMonthlyPonjikaEvents(m, 2026, 'bn');
    text += "  - উৎসব ও বিশেষত্ব (Bengali):\n";
    bnEvents.highlights.forEach(h => {
      text += `    * ${h.date}: ${h.event}\n`;
    });
    
    text += "\n";
  }

  text += `==================================================\n`;
  text += `COMMON BENGALI PONJIKA RITUALS, RULES, & TIPS FOR BOT RESPONSE:\n`;
  text += `1. Ekadashi (একাদশী):\n`;
  text += `   - Mentioned Ekadashis: 'ভৈমী একাদশী' (Bhaimi Ekadashi) is on 28 Magha / 11 February. Explain that Ekadashi occurs twice every month (Shukla Paksha and Krishna Paksha). Urge the devotee/user to seek the active tithi on the live Ponjika page on barnia.in or by clicking 'Local Ponjika' which reports the EXACT daily tithi dynamically!\n`;
  text += `2. Durga Puja (দুর্গাপূজা):\n`;
  text += `   - Maha Shasthi (মহাষষ্ঠী) begins on 22 Ashwin / October 8.\n`;
  text += `   - Vijaya Dashami (বিজয়া দশমী) is on 25 Ashwin / October 11.\n`;
  text += `3. Kali Puja & Diwali (কালীপূজা ও দীপাবলি):\n`;
  text += `   - On 12 Kartika / October 28.\n`;
  text += `4. Saraswati Puja (সরস্বতী পূজা):\n`;
  text += `   - On 18 Magha / February 1.\n`;
  text += `5. Dol Yatra / Holi (দোলযাত্রা / হোলি):\n`;
  text += `   - On 28 Phalguna / March 12.\n`;
  text += `6. Shivaratri (শিবরাত্রি):\n`;
  text += `   - On 14 Phalguna / February 26.\n`;
  text += `7. Nabanna (নবান্ন):\n`;
  text += `   - On 5 Agrahayana / November 20 (famed in Nadia district as the festival of new harvest seeds).\n`;
  text += `8. Rash Utsav / Rash lila (রাস উৎসব):\n`;
  text += `   - Peak festival of Santipur and Nabadwip in Nadia, starting on 10 Agrahayana / November 25.\n`;
  text += `==================================================\n`;
  
  return text;
}

function compileVamshavaliDetails(): string {
  let text = "==================================================\n";
  text += "VAMSHAVALI (FAMILY TREE / বংশাবলী) PAGE DETAILED GUIDE:\n";
  text += "==================================================\n";
  text += "The Family Tree (Vamshavali) Page on barnia.in is a state-of-the-art interactive digital lineage mapping companion. Below is the total product manual, list of buttons, features, and detailed guidance instructions on how the page operates:\n\n";
  
  text += "1. THE INTERACTIVE FAMILY TREE CANVAS:\n";
  text += "   - Shows a visual chart/graph/tree of the customer's lineage.\n";
  text += "   - Navigation / Interaction: Customers can click and drag, or double-click to move/pan around and swipe the tree coordinates in any direction to explore ancestors and younger descendants.\n\n";
  
  text += "2. NAVIGATION & CAMERA TOOLBAR CONTROLS:\n";
  text += "   - Located at the top of the canvas screen. Includes these physical button tools and markers:\n";
  text += "     * 'Fit Tree' button (Icon: LocateFixed): Clicking this dynamically re-aligns the canvas camera to fit the entire family tree perfectly on the customer's current screen.\n";
  text += "     * 'Zoom Out' button (Icon: ZoomOut): Decreases the view magnification down to 18% (0.18 scale value), reducing size by 10% per click, helping users see massive multi-generational trees.\n";
  text += "     * 'Zoom In' button (Icon: ZoomIn): Increases current zoom magnification up to 170% (1.7 scale value) for a high-intensity close up.\n";
  text += "     * 'Current Zoom Percentage': Displays the active magnification level (e.g., 100%) in real-time.\n\n";
  
  text += "3. REAL-TIME SEARCH BOX FILTER:\n";
  text += "   - Features a Search Input Field (with lens icon) saying 'Search family members'.\n";
  text += "   - Typing in this box immediately searches and highlights matched family relative names, filtering out non-matching views instantly.\n\n";
  
  text += "4. EXPORT & DOWNLOAD MENU (Icon: Download):\n";
  text += "   - Clicking the Download button reveals a drop-down with 4 premium export formats:\n";
  text += "     * 'Export as PNG': Downloads a high-resolution transparent image asset of the family tree, ready to show off, email, or forward to relatives via WhatsApp.\n";
  text += "     * 'Export as JPEG': Downloads standard image file format of the family tree.\n";
  text += "     * 'Export as PDF': Creates a vector-based document, maintaining pristine readability even when printing at poster-scale!\n";
  text += "     * 'Print Tree': Triggers the computer/device's native print menu, enabling customers to print beautiful physical hard copies or posters of their Vamshavali directly from the browser.\n\n";
  
  text += "5. MEMBER NODE INTERACTIONS & THE RIGHT SIDEBAR DETAIL PANEL:\n";
  text += "   - Clicking on any relative's node/bubble on the canvas selects them and triggers a slide-out Side Panel/Sidebar containing comprehensive controls:\n";
  text += "     * Relatives information: View full name, birth year, role, profile picture/photo, listed spouses, and child branches.\n";
  text += "     * 'Edit Member' Action: Clicking 'Edit' opens an overlay form dialog where the user can update details like Name, Gender, Year of Birth, Deceased/Passed Away year/status, and upload or set a profile photo URL.\n";
  text += "     * 'Link Spouse' Action: Allows the user to select another member (e.g., a wife) and link them as partner/spouse of the selected ancestor, merging branch lines correctly.\n";
  text += "     * 'Add Child / Next Generation': Allows the user to click 'Add Relative' on a selected parent to add a direct child. Nadya village rules follow patrilineal heritage: only male lineage members are selected as fathers to continue the branch, though female members are fully represented visually.\n"
  text += "     * 'Delete Member': Allows removal of entry nodes with simple warnings.\n\n";
  
  text += "6. MULTILINGUAL DIALECT TOGGLE:\n";
  text += "   - Page is fully localized. The language selector in the top-right corner allows immediate translation of all buttons, forms, and titles into:\n";
  text += "     * English (Default)\n";
  text += "     * Bengali (বাংলা - Local vernacular of Barnia village)\n";
  text += "     * Hindi (हिंदी - widely spoken commercial dialect)\n\n";
  
  text += "7. SECURE SHARING & CHAT LINKING:\n";
  text += "   - Shareable Link URI: Every family tree on barnia.in is accessible via a unique Share ID link (e.g. 'https://barnia.in/vamshavali/v/SHARE_ID'). Customers can easily copy and send this URL to family.\n";
  text += "   - Telegram Bot Link: Customers can click the Telegram icon/button to link their family tree to Barnali (this Bot!). It connects their chat automatically, so they can update and query their tree by simply chatting with me!\n";
  text += "==================================================\n";
  return text;
}

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
          { command: "link", description: "Connect family tree: /link <email>" },
          { command: "unlink", description: "Disconnect connected family tree" },
          { command: "ponjika", description: "Check Bengal's local Ponjika and timings" },
          { command: "credits", description: "Check remaining AI credits" },
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

export function inferGenderByName(rawName: string): "male" | "female" {
  const clean = (rawName || "").trim().toLowerCase();
  
  const femaleSuffixes = [
    "devi", "devi ji", "kumari", "didi", "srimati", "shrimati", "mrs", "ms", "miss", 
    "di", "lata", "asha", "rekha", "savitri", "sita", "gita", "rita", "barnali", 
    "anita", "priya", "kiran", "pooja", "neha", "reena", "meena", "sunita", "geeta",
    "sharda", "preeti", "jyoti", "mamta", "babita", "kavita", "savita", "meera",
    "radha", "laxmi", "saraswati", "gouri", "umavati", "parvati", "durga"
  ];
  
  const isFemale = femaleSuffixes.some(sf => clean.includes(sf));
  if (isFemale) return "female";
  
  const endsWithFemaleVowel = clean.endsWith("i") || clean.endsWith("a") || clean.endsWith("ee");
  if (endsWithFemaleVowel) {
    return "female";
  }
  
  return "male";
}

export function formatRespectfulName(rawName: string, linkedProfile: any = null, lang: "ben" | "hin" | "eng" = "eng"): string {
  const clean = (rawName || "").trim();
  if (!clean || clean.toLowerCase() === "friend") {
    if (lang === "ben") return "শ্রদ্ধেয় সুধী";
    if (lang === "hin") return "आदरणीय महानुभाव";
    return "Respected Friend";
  }

  // Determine gender
  let gender: "male" | "female" = "male";
  if (linkedProfile) {
    if (linkedProfile.gender === "female") {
      gender = "female";
    } else if (linkedProfile.gender === "male") {
      gender = "male";
    } else {
      const nameVal = linkedProfile.name || "";
      gender = inferGenderByName(nameVal);
    }
  } else {
    gender = inferGenderByName(clean);
  }

  const isFemale = gender === "female";

  if (lang === "ben") {
    if (isFemale) {
      return `${clean} Didi`;
    } else {
      return `${clean} Babu`;
    }
  } else if (lang === "hin") {
    if (isFemale) {
      return `${clean} Devi Ji`;
    } else {
      return `${clean} Ji`;
    }
  } else {
    if (isFemale) {
      return `${clean} Madam`;
    } else {
      return `${clean} Sir`;
    }
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
      return `/api/telegram-image/${fileData.result.file_path}`;
    }
  } catch (e) {
    console.error("[Telegram Bot] Error getting file path:", e);
  }
  return null;
}

async function transcribeVoice(audioBuffer: Buffer, geminiApiKey: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "audio/ogg",
            data: audioBuffer.toString("base64")
          }
        },
        { text: "Accurately transcribe other speech or instructions in the voice note. Return ONLY the final transcription transcript in Indian vernacular (Bengali, Hindi, or English). Be extremely faithful, do not summarize, and output nothing but the verified transcription. Return empty if no voice or message is present." }
      ]
    });

    return (response.text || "").trim();
  } catch (err) {
    console.error("[Telegram Bot] Error during voice transcription in transcribeVoice helper:", err);
    throw err;
  }
}

function getSqliteTreeDescription(treeId: string): string {
  try {
    const tree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(treeId) as any;
    if (!tree) return "Tree not found.";

    const people = sqliteDb.prepare("SELECT * FROM lineage_people WHERE tree_id = ?").all(treeId) as any[];
    const spouses = sqliteDb.prepare("SELECT * FROM lineage_spouses WHERE tree_id = ?").all(treeId) as any[];

    return JSON.stringify({
      tree: {
        id: tree.id,
        name: tree.name,
        account_holder_name: tree.account_holder_name,
        gotra: tree.gotra,
        kuladevi: tree.kuladevi,
        kuladevata: tree.kuladevata,
        gramadevata: tree.gramadevata,
        family_surname: tree.family_surname,
        notes: tree.notes
      },
      people: people.map(p => ({
        id: p.id,
        displayName: p.display_name,
        gender: p.gender,
        lifeStatus: p.life_status,
        maritalStatus: p.marital_status,
        dateOfBirth: p.date_of_birth,
        dateOfDeath: p.date_of_death,
        deathAnniversary: p.death_anniversary,
        rashi: p.rashi,
        gotra: p.gotra,
        photoUrl: p.photo_url,
        notes: p.notes,
        fatherId: p.father_id,
        motherId: p.mother_id
      })),
      spouses: spouses.map(s => ({
        id: s.id,
        personAId: s.person_a_id,
        personBId: s.person_b_id,
        status: s.status
      }))
    }, null, 2);
  } catch (err) {
    console.error("[Telegram Bot] Error formatting SQLite tree description:", err);
    return "Error fetching tree database details.";
  }
}

function addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // RIFF identifier
  header.write("RIFF", 0);
  // file length minus 8 bytes
  header.writeUInt32LE(chunkSize, 4);
  // RIFF type
  header.write("WAVE", 8);
  // Format chunk identifier
  header.write("fmt ", 12);
  // Format chunk length (16 bytes)
  header.writeUInt32LE(16, 16);
  // Sample format (1 is PCM)
  header.writeUInt16LE(1, 20);
  // Number of channels
  header.writeUInt16LE(numChannels, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate
  header.writeUInt32LE(byteRate, 28);
  // Block align
  header.writeUInt16LE(blockAlign, 32);
  // Bits per sample
  header.writeUInt16LE(bitsPerSample, 34);
  // Data chunk identifier
  header.write("data", 36);
  // Data chunk length
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function generateSpeech(textToSpeak: string, geminiApiKey: string): Promise<Buffer | null> {
  try {
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Clean up textToSpeak for clean reading
    let cleanedText = textToSpeak
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "") // Emojis
      .replace(/https?:\/\/\S+/g, "") // URLs
      .replace(/[\*\_`#~\[\]\(\)]/g, " ") // Markdown spec characters
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanedText || cleanedText.length < 2) return null;

    // Limit length for synthesis to avoid excessive generation
    if (cleanedText.length > 400) {
      cleanedText = cleanedText.substring(0, 400) + "...";
    }

    console.log(`[Telegram Bot TTS] Synthesizing speech for text: "${cleanedText}"`);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: cleanedText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' }, // Aoede is an incredibly beautiful, warm, expressive, and human-sounding female voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const rawPcm = Buffer.from(base64Audio, "base64");
      return addWavHeader(rawPcm, 24000);
    }
  } catch (err) {
    console.error("[Telegram Bot TTS] Error during speech synthesis:", err);
  }
  return null;
}

async function sendTelegramVoice(botToken: string, chatId: number, audioBuffer: Buffer) {
  try {
    const boundary = "----TelegramBotAudioBoundary" + Math.random().toString(16).substring(2);
    const parts: Buffer[] = [];

    // Part: chat_id
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`));

    // Part: voice file
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="voice"; filename="voice.wav"\r\nContent-Type: audio/wav\r\n\r\n`));
    parts.push(audioBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const bodyBuffer = Buffer.concat(parts);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body: bodyBuffer
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Telegram sendVoice Error]", errText);
    } else {
      console.log(`[Telegram] Voice note sent successfully to chatId ${chatId}`);
    }
  } catch (err) {
    console.error("[Telegram] Error sending voice note:", err);
  }
}

export async function handleTelegramWebhook(req: any, res: any, lastPhotos: Map<number, any>, telegramLinkCache: Map<number, any>, db: any, adminDb: any) {
  const body = req.body;
  if (!body || !body.message) {
    return res.status(200).send("OK");
  }

  const { message } = body;
  const chatId = message.chat.id;
  let text = message.text || "";
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
      [{ text: "🌳 My Family Tree" }, { text: "📅 Local Ponjika" }],
      [{ text: "💳 Check Credits" }, { text: "❓ Help" }]
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

  let isFromVoice = false;
  if (message.voice) {
    await sendMessage("🎤 *Barnali is listening to your voice note...* 🎧");
    try {
      const apiKey = await getGeminiApiKey();
      const voiceFileId = message.voice.file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${voiceFileId}`);
      const fileData = await fileRes.json() as any;
      if (fileData && fileData.ok && fileData.result && fileData.result.file_path) {
        const filePath = fileData.result.file_path;
        const voiceUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        const voiceRes = await fetch(voiceUrl);
        if (voiceRes.ok) {
          const buffer = await voiceRes.buffer();
          text = await transcribeVoice(buffer, apiKey);
          isFromVoice = true;
          console.log(`[Telegram Bot] Voice transcribed: "${text}"`);
          if (!text) {
            await sendMessage("🔇 The voice note was empty or silent. Please speak clearly.");
            return;
          }
        } else {
          console.error("[Telegram] Fetching voice file failed");
        }
      }
    } catch (err: any) {
      console.error("[Telegram Bot] Voice transcription failed:", err);
      await sendMessage("⚠️ Sorry, I could not transcribe or process your voice message. Please try sending text instead.");
      return;
    }
  }

  // 1. Fetch Telegram state database & bootstrap if missing (or use memory cache)
  let linkedProfileId: string | null = null;
  let linkedEmail: string | null = null;
  let linkedShareId: string | null = null;
  let currentCredits = 10;
  let linkedProfile: any = null;
  let isNewUser = false;
  let telegramName = `${from.first_name || ""} ${from.last_name || ""}`.trim() || from.username || "Friend";

  const telegramLangCode = (from.language_code || "en").toLowerCase();
  let userLang: "ben" | "hin" | "eng" = "eng";
  if (telegramLangCode.startsWith("bn")) {
    userLang = "ben";
  } else if (telegramLangCode.startsWith("hi")) {
    userLang = "hin";
  }

  let respectfulName = formatRespectfulName(telegramName, null, userLang);

  const cachedUser = telegramLinkCache.get(chatId);
  const cacheAge = cachedUser ? (Date.now() - cachedUser.timestamp) : Infinity;

  if (cachedUser && cacheAge < 10 * 60 * 1000) { // 10 minutes cache
    linkedProfileId = cachedUser.linkedProfileId || null;
    linkedEmail = cachedUser.linkedEmail || null;
    linkedShareId = cachedUser.linkedShareId || null;
    currentCredits = cachedUser.currentCredits !== undefined ? cachedUser.currentCredits : 10;
    linkedProfile = cachedUser.linkedProfile || null;
    telegramName = cachedUser.telegramName || telegramName;
    if (cachedUser.userLang) {
      userLang = cachedUser.userLang;
    }
    if (linkedEmail) {
      try {
        const account = sqliteDb.prepare("SELECT language FROM accounts WHERE email = ?").get(linkedEmail.trim().toLowerCase()) as { language?: string } | undefined;
        if (account?.language) {
          if (account.language === "bn") userLang = "ben";
          else if (account.language === "hi") userLang = "hin";
          else if (account.language === "en") userLang = "eng";
        }
      } catch (sqliteErr) {
        console.warn("[Telegram] Error looking up language from accounts for cached bot user:", sqliteErr);
      }
    }
    respectfulName = formatRespectfulName(telegramName, linkedProfile, userLang);
    console.log(`[Telegram Cache Hit] User: ${chatId} (${respectfulName}), LinkedProfileId: ${linkedProfileId}, ShareId: ${linkedShareId}, Lang: ${userLang}`);
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
          if (udata.language) {
            userLang = udata.language;
          }
          if (linkedEmail) {
            try {
              const account = sqliteDb.prepare("SELECT language FROM accounts WHERE email = ?").get(linkedEmail.trim().toLowerCase()) as { language?: string } | undefined;
              if (account?.language) {
                if (account.language === "bn") userLang = "ben";
                else if (account.language === "hi") userLang = "hin";
                else if (account.language === "en") userLang = "eng";
              }
            } catch (sqliteErr) {
              console.warn("[Telegram] Error looking up language from accounts for bot:", sqliteErr);
            }
          }
          respectfulName = formatRespectfulName(telegramName, null, userLang);
        } else {
          isNewUser = true;
          await userRef.set({
            id: chatId.toString(),
            name: telegramName,
            username: from.username || null,
            credits: 10,
            role: "user",
            language: userLang,
            createdAt: new Date().toISOString()
          });
        }

        // Fetch linked tree profile
        if (linkedProfileId) {
          let snap: any = null;
          if (adminDb) {
            snap = await adminDb.collection("vamshavali_profiles").doc(linkedProfileId).get();
          }
          if (snap && snap.exists) {
            linkedProfile = { id: snap.id, ...snap.data() };
            linkedShareId = linkedProfile.shareId || null;
            respectfulName = formatRespectfulName(telegramName, linkedProfile, userLang);
          } else {
            // Check SQLite database!
            try {
              const tree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(linkedProfileId) as any;
              if (tree) {
                linkedProfile = tree;
                linkedShareId = tree.id;
                respectfulName = formatRespectfulName(telegramName, tree, userLang);
                console.log(`[Telegram] Loaded SQLite tree: ${tree.id} (${tree.name})`);
              }
            } catch (sqliteErr) {
              console.error("[Telegram] Error fetching SQLite tree:", sqliteErr);
            }
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
          userLang,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("[Telegram] State retrieval / bootstrap error:", err);
      }
    }
  }

  // Auto-detect and switch conversation language on Bengali or Hindi script input
  let autoDetectedLang: "ben" | "hin" | "eng" | null = null;
  if (/[\u0980-\u09FF]/.test(text)) {
    autoDetectedLang = "ben";
  } else if (/[\u0900-\u097F]/.test(text)) {
    autoDetectedLang = "hin";
  }

  if (autoDetectedLang && autoDetectedLang !== userLang) {
    userLang = autoDetectedLang;
    respectfulName = formatRespectfulName(telegramName, linkedProfile, userLang);
    if (adminDb) {
      try {
        await adminDb.collection("telegram_users").doc(chatId.toString()).set({
          language: userLang,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("[Telegram] Error saving auto-detected language:", err);
      }
    }
    // Update local cache
    const latestCache = telegramLinkCache.get(chatId) || {};
    telegramLinkCache.set(chatId, {
      ...latestCache,
      linkedProfileId,
      linkedEmail,
      linkedShareId,
      currentCredits,
      linkedProfile,
      telegramName,
      userLang,
      timestamp: Date.now()
    });
    console.log(`[Telegram] Instantly switched user ${chatId} language to ${userLang} based on script input.`);
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

  if (textLower === "check local ponjika" || textLower === "/ponjika" || textLower === "ponjika") {
    let responseText = "";
    if (userLang === "ben") {
      const bDate = getBengaliDate(new Date());
      const almanac = getAlmanacData(new Date(), "bn");
      const festText = almanac.festivals && almanac.festivals.length > 0
        ? almanac.festivals.map((f: string) => `• ${f}`).join("\n")
        : "• আজ কোনো বড় উৎসব নেই বা বিশেষ দিন নেই।";
      responseText = `📅 *আজকের স্থানীয় পঞ্জিকা (নদীয় এডিটিশন)* 📅\n\n` +
        `• *তারিখ:* ${toBengaliNumber(bDate.day)} ${bDate.month} ${toBengaliNumber(bDate.year)} (${almanac.bengaliEra})\n` +
        `• *বার:* ${bDate.dayName} (${almanac.dayLord})\n` +
        `• *তিথি:* ${almanac.tithi} (${almanac.paksha})\n` +
        `• *নক্ষত্র:* ${almanac.nakshatra}\n` +
        `• *যোগ:* ${almanac.yoga} | *করণ:* ${almanac.karana}\n` +
        `• *সূর্যোদয়:* ${almanac.sunrise} | *সূর্যাস্ত:* ${almanac.sunset}\n` +
        `• *চন্দ্রোদয়:* ${almanac.moonrise} | *চন্দ্রাস্ত:* ${almanac.moonset}\n` +
        `• *ঋতু:* ${almanac.ritu}\n\n` +
        `🌟 *শুভ সময় (Auspicious Timings):*\n` +
        `• *ব্রহ্ম মুহূর্ত:* ${almanac.brahmaMuhurta}\n` +
        `• *অভিজিৎ মুহূর্ত:* ${almanac.abhijitMuhurta}\n` +
        `• *অমৃত যোগ:* ${almanac.amritaYoga}\n` +
        `• *মহেন্দ্র যোগ:* ${almanac.mahendraYoga}\n\n` +
        `⚠️ *অশুভ সময় (Inauspicious Timings):*\n` +
        `• *রাহুকাল:* ${almanac.rahuKaal}\n` +
        `• *বারবেলা:* ${almanac.barabela}\n` +
        `• *কালবেলা:* ${almanac.kalabela}\n` +
        `• *কালরাত্রি:* ${almanac.kalratri}\n\n` +
        `🌾 *আজকের উৎসব ও বিশেষত্ব:*\n${festText}`;
    } else if (userLang === "hin") {
      const bDate = getBengaliDate(new Date());
      const almanac = getAlmanacData(new Date(), "en");
      const festText = almanac.festivals && almanac.festivals.length > 0
        ? almanac.festivals.map((f: string) => `• ${f}`).join("\n")
        : "• आज कोई मुख्य त्यौहार या विशेष दिन नहीं है।";
      responseText = `📅 *आज की स्थानीय बंगाली पंजिका* 📅\n\n` +
        `• *तिथि:* ${bDate.day} ${bDate.monthEn} ${bDate.year} (${almanac.bengaliEraEn})\n` +
        `• *दिन:* ${bDate.dayNameEn} (${almanac.dayLordEn})\n` +
        `• *तिथि विवरण:* ${almanac.tithiEn} (${almanac.pakshaEn})\n` +
        `• *नक्षत्र:* ${almanac.nakshatraEn}\n` +
        `• *योग:* ${almanac.yogaEn} | *करण:* ${almanac.karanaEn}\n` +
        `• *सूर्योदय:* ${almanac.sunrise} | *सूर्यास्त:* ${almanac.sunset}\n` +
        `• *चन्द्रोदय:* ${almanac.moonrise} | *चन्द्रास्त:* ${almanac.moonset}\n` +
        `• *ऋतु (Season):* ${almanac.rituEn}\n\n` +
        `🌟 *शुभ समय (Auspicious Timings):*\n` +
        `• *ब्रह्म मुहूर्त:* ${almanac.brahmaMuhurta}\n` +
        `• *अभिजीत मुहूर्त:* ${almanac.abhijitMuhurta}\n` +
        `• *अमृत योग:* ${almanac.amritaYoga}\n` +
        `• *महेन्द्र योग:* ${almanac.mahendraYoga}\n\n` +
        `⚠️ *अशुभ समय (Inauspicious Timings):*\n` +
        `• *राहु काल:* ${almanac.rahuKaal}\n` +
        `• *बारबेला:* ${almanac.barabela}\n` +
        `• *कालबेला:* ${almanac.kalabela}\n` +
        `• *कालरात्रि:* ${almanac.kalratri}\n\n` +
        `🌾 *त्यौहार और विशेषताएँ:*\n${festText}`;
    } else {
      const bDate = getBengaliDate(new Date());
      const almanac = getAlmanacData(new Date(), "en");
      const festText = almanac.festivals && almanac.festivals.length > 0
        ? almanac.festivals.map((f: string) => `• ${f}`).join("\n")
        : "• No major festivals today.";
      responseText = `📅 *Today's Local Bengali Ponjika* 📅\n\n` +
        `• *Bengali Date:* ${bDate.day} ${bDate.monthEn} ${bDate.year} (${almanac.bengaliEraEn})\n` +
        `• *Day:* ${bDate.dayNameEn} (${almanac.dayLordEn})\n` +
        `• *Tithi:* ${almanac.tithiEn} (${almanac.pakshaEn})\n` +
        `• *Nakshatra:* ${almanac.nakshatraEn}\n` +
        `• *Yoga:* ${almanac.yogaEn} | *Karana:* ${almanac.karanaEn}\n` +
        `• *Sunrise:* ${almanac.sunrise} | *Sunset:* ${almanac.sunset}\n` +
        `• *Moonrise:* ${almanac.moonrise} | *Moonset:* ${almanac.moonset}\n` +
        `• *Ritu (Season):* ${almanac.rituEn}\n\n` +
        `🌟 *Auspicious Timings:*\n` +
        `• *Brahma Muhurta:* ${almanac.brahmaMuhurta}\n` +
        `• *Abhijit Muhurta:* ${almanac.abhijitMuhurta}\n` +
        `• *Amrita Yoga:* ${almanac.amritaYoga}\n` +
        `• *Mahendra Yoga:* ${almanac.mahendraYoga}\n\n` +
        `⚠️ *Inauspicious Timings:*\n` +
        `• *Rahu Kaal:* ${almanac.rahuKaal}\n` +
        `• *Barabela:* ${almanac.barabela}\n` +
        `• *Kalabela:* ${almanac.kalabela}\n` +
        `• *Kalratri:* ${almanac.kalratri}\n\n` +
        `🌾 *Festivals & Highlights:*\n${festText}`;
    }
    await sendMessage(responseText, { parse_mode: "Markdown" });
    return;
  }

  if (textLower === "/credits" || textLower === "check credits") {
    await sendMessage(
      `💳 *AI Assistant Credits Check* 💳\n\n` +
      `👤 *User:* ${respectfulName}\n` +
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
      `I am Barnali, your conversational AI companion for **Vamshavali / Ponjika** (\`barnia.in\`).\n\n` +
      `🚦 *Current Connection Status:*\n` +
      `• *User Profile:* ${linkStatus}\n` +
      `• *Your Balance:* \`${currentCredits}\` credits\n\n` +
      `🛠️ *Available Commands:*\n` +
      `• \`/start\` - Boot/status check\n` +
      `• \`/link <email>\` - Connect tree via registered email\n` +
      `• \`/unlink\` - Disconnect tree from Telegram\n` +
      `• \`/lang <bn/hi/en>\` - Set language (Bengali, Hindi, English)\n` +
      `• \`/ponjika\` - Check daily local Bengali Ponjika\n` +
      `• \`/credits\` - Check remaining AI credits\n` +
      `• \`/help\` - Show helpful commands manual\n\n` +
      `✨ *Quick Chat Menu Buttons:*\n` +
      `Use the simple buttons at the bottom of your screen to trigger immediate actions:\n` +
      `• *🌳 My Family Tree* - Display your registered Vamshavali page link\n` +
      `• *📅 Local Ponjika* - Check Bengal's local Ponjika and timings\n` +
      `• *💳 Check Credits* - Show remaining assistant credits\n` +
      `• *❓ Help* - View commands details & manual\n\n` +
      `Type any queries about your family tree or lineage, or ask me about the local Ponjika, and I'll assist!`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Language setting command handler
  if (textLower.startsWith("/lang") || textLower.startsWith("/language")) {
    const parts = textLower.split(/\s+/);
    let newLang: "ben" | "hin" | "eng" = "eng";
    let langNameStr = "English 🇬🇧";
    
    if (parts.length > 1) {
      const arg = parts[1].trim();
      if (arg.startsWith("bn") || arg.startsWith("ba") || arg.includes("beng") || arg.includes("bang")) {
        newLang = "ben";
        langNameStr = "বাংলা 🇧🇩/🇮🇳";
      } else if (arg.startsWith("hi") || arg.includes("hind")) {
        newLang = "hin";
        langNameStr = "हिंदी 🇮🇳";
      } else if (arg.startsWith("en") || arg.includes("eng")) {
        newLang = "eng";
        langNameStr = "English 🇬🇧";
      }
    } else {
      await sendMessage(
        `ℹ️ *Preferred Language Settings*\n\n` +
        `Specify your desired language:\n` +
        `• \`/lang bn\` - Bengali / বাংলা\n` +
        `• \`/lang hi\` - Hindi / हिंदी\n` +
        `• \`/lang en\` - English / English\n\n` +
        `Current language: *${userLang === "ben" ? "Bengali (বাংলা)" : userLang === "hin" ? "Hindi (हिंदी)" : "English"}*`,
        { parse_mode: "Markdown" }
      );
      return;
    }
    
    // Save in firestore
    if (adminDb) {
      try {
        await adminDb.collection("telegram_users").doc(chatId.toString()).set({
          language: newLang,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("[Telegram] Error updating language command in Firestore:", err);
      }
    }
    
    // Update local cache
    const latestCache = telegramLinkCache.get(chatId) || {};
    telegramLinkCache.set(chatId, {
      ...latestCache,
      linkedProfileId,
      linkedEmail,
      linkedShareId,
      currentCredits,
      linkedProfile,
      telegramName,
      userLang: newLang,
      timestamp: Date.now()
    });

    userLang = newLang;
    respectfulName = formatRespectfulName(telegramName, linkedProfile, userLang);

    if (newLang === "ben") {
      await sendMessage(`✅ আপনার ভাষা পরিবর্তন করে *বাংলা* করা হয়েছে! এখন থেকে আমি বাংলায় উত্তর দেব।`, { parse_mode: "Markdown" });
    } else if (newLang === "hin") {
      await sendMessage(`✅ आपकी भाषा बदलकर *हिंदी* कर दी गई है! अब से मैं हिंदी में उत्तर दूँगी।`, { parse_mode: "Markdown" });
    } else {
      await sendMessage(`✅ Language successfully updated to *English*! I will reply in English from now on.`, { parse_mode: "Markdown" });
    }
    return;
  }

  // Support /start and /start <param> (deeplink)
  const startParts = cleanText.trim().split(/\s+/);
  const isStartCmd = startParts[0].toLowerCase() === "/start";

  if (isStartCmd) {
    let startParam = startParts.length > 1 ? startParts[1].trim() : null;

    if (startParam) {
      // Decode URL-safe Base64 if applicable (e.g. for encoded emails)
      try {
        if (/^[a-zA-Z0-9_-]+={0,2}$/.test(startParam)) {
          let base64 = startParam.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decoded = Buffer.from(base64, 'base64').toString('utf8');
          if (decoded.includes('@') && decoded.includes('.')) {
            console.log(`[Telegram startParam] Decoded base64 "${startParam}" to "${decoded}"`);
            startParam = decoded;
          }
        }
      } catch (b64Err) {
        console.error("[Telegram] Error decoding base64 startParam:", b64Err);
      }

      let foundProfile: any = null;
      let foundSqliteTree: any = null;

      // 1. Check SQLite first
      try {
        const emailVal = startParam.toLowerCase().trim();
        const account = sqliteDb.prepare("SELECT * FROM accounts WHERE email = ?").get(emailVal) as any;
        if (account) {
          const membership = sqliteDb.prepare("SELECT * FROM account_tree_memberships WHERE account_id = ?").get(account.id) as any;
          if (membership) {
            const tree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(membership.tree_id) as any;
            if (tree) {
              foundSqliteTree = tree;
              console.log(`[Telegram startParam] Found SQLite tree ${tree.id} for account email ${emailVal}`);
            }
          }
        } else {
          const tree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(startParam.trim()) as any;
          if (tree) {
            foundSqliteTree = tree;
            console.log(`[Telegram startParam] Found SQLite tree ${tree.id} directly by ID`);
          }
        }
      } catch (sqliteErr) {
        console.error("[Telegram] Error searching SQLite tree during start auto-link:", sqliteErr);
      }

      // 2. Check Firestore next
      if (!foundSqliteTree && adminDb) {
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

      // Execute linkage if found in SQLite:
      if (foundSqliteTree) {
        if (adminDb) {
          await adminDb.collection("telegram_users").doc(chatId.toString()).set({
            linkedProfileId: foundSqliteTree.id,
            linkedEmail: startParam.match(emailRegex) ? startParam.toLowerCase().trim() : null,
            linkedShareId: foundSqliteTree.id,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        linkedProfileId = foundSqliteTree.id;
        linkedEmail = startParam.match(emailRegex) ? startParam.toLowerCase().trim() : null;
        linkedShareId = foundSqliteTree.id;
        linkedProfile = foundSqliteTree;
        respectfulName = formatRespectfulName(telegramName, foundSqliteTree, userLang);

        telegramLinkCache.set(chatId, {
          linkedProfileId,
          linkedEmail,
          linkedShareId,
          currentCredits,
          linkedProfile,
          telegramName,
          timestamp: Date.now()
        });

        const treeLink = `https://barnia.in/vamshavali/v/${foundSqliteTree.id}`;
        await sendMessage(
          `🌳 *Vamshavali Connected Automatically!* 🌳\n\n` +
          `I have automatically linked your Telegram chat to your family tree: *"${foundSqliteTree.name}"* 🎉.\n\n` +
          `🔗 *Your Live Family Tree Link:* [View My Tree](${treeLink})\n\n` +
          `From now on, I will remember this tree! Whenever you send a message or a picture, we'll consult and update this tree.`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Execute linkage if found in Firestore:
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
      const userRespectful = formatRespectfulName(userFirstName, linkedProfile, userLang);
      
      if (linkedProfile) {
        // Welcoming back a linked returning user
        const treeLinkVal = `https://barnia.in/vamshavali/v/${linkedProfile.shareId || linkedProfile.id}`;
        
        if (userLang === "ben") {
          await sendMessage(
            `🌸 *স্বাগতম, ${userRespectful}!* 🌸\n\n` +
            `আমি বর্ণালী, আপনার বার্নীয়া ডিজিটাল হাব (*barnia.in*) AI সহকারী।\n\n` +
            `💖 *সরাসরি সংযোগ:*\n` +
            `• *যুক্ত বংশাবলী:* *"${linkedProfile.name}"*\n` +
            `• *যুক্ত ইমেইল:* \`${linkedEmail || "নেই"}\`\n` +
            `• *বংশাবলী লিংক:* [এখানে দেখুন](${treeLinkVal})\n\n` +
            `আমি আপনার বংশাবলী তথ্য মনে রেখেছি! কোনো তথ্য বা ছবি আপডেট করতে আমাকে লিখুন, অথবা বার্নীয়া বাজার এবং পঞ্জিকা সম্পর্কে জিজ্ঞেস করুন।`,
            { parse_mode: "Markdown" }
          );
        } else if (userLang === "hin") {
          await sendMessage(
            `🌸 *स्वागत है, ${userRespectful}!* 🌸\n\n` +
            `मैं बर्नाली हूँ, बर्निया डिजिटल हब (*barnia.in*) की आपकी AI सहायक।\n\n` +
            `💖 *सक्रिय कनेक्शन:*\n` +
            `• *लिंक्ड वंशावली:* *"${linkedProfile.name}"*\n` +
            `• *लिंक्ड ईमेल:* \`${linkedEmail || "एन/ए"}\`\n` +
            `• *वंशावली लिंक:* [यहाँ देखें](${treeLinkVal})\n\n` +
            `मुझे आपका वंशावली विवरण याद है! जानकारी अपडेट करने या फोटो जोड़ने के लिए मुझे संदेश भेजें, या बर्निया बाजार/पंजिका के बारे में पूछें।`,
            { parse_mode: "Markdown" }
          );
        } else {
          const treeLink = linkedProfile.shareId 
            ? `[My Family Tree](https://barnia.in/vamshavali/v/${linkedProfile.shareId})`
            : `[My Family Tree](https://barnia.in/vamshavali)`;
            
          await sendMessage(
            `🌸 *Welcome back, ${userRespectful}!* 🌸\n\n` +
            `I am Barnali, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n` +
            `💖 *Active Connection:*\n` +
            `• *Linked Tree:* *"${linkedProfile.name}"*\n` +
            `• *Linked Email:* \`${linkedEmail || "N/A"}\`\n` +
            `• *Tree Link:* ${treeLink}\n\n` +
            `I remember you and your family tree! Tell me or send me a photo to update it, or ask me anything about the local Bazar or Ponjika!`,
            { parse_mode: "Markdown" }
          );
        }
      } else if (!isNewUser) {
        // Welcoming back an unlinked returning user
        if (userLang === "ben") {
          await sendMessage(
            `🌸 *স্বাগতম, ${userRespectful}!* 🌸\n\n` +
            `আমি বর্ণালী, আপনার বার্নীয়া ডিজিটাল হাব (*barnia.in*) AI সহকারী।\n\n` +
            `🔗 *আপনার বংশাবলী লিংক করুন:*\n` +
            `ব্যক্তিগত লিংক পাওয়ার জন্য অনুগ্রহ করে আপনার বংশাবলীটি লিংক করুন। সেজন্য এভাবে লিখুন:\n` +
            `\`/link <আপনার-ইমেইল>\` অথবা \`/link <শেয়ার আইডি>\` (উদাহরণ: \`/link contact@barnia.in\`)।\n\n` +
            `আমাকে বলুন আজকে আপনাকে কীভাবে সাহায্য করতে পারি!`,
            { parse_mode: "Markdown" }
          );
        } else if (userLang === "hin") {
          await sendMessage(
            `🌸 *स्वागत है, ${userRespectful}!* 🌸\n\n` +
            `मैं बर्नाली हूँ, बर्निया डिजिटल हब (*barnia.in*) की आपकी AI सहायक।\n\n` +
            `🔗 *अपनी वंशावली लिंक करें:*\n` +
            `अपनी वंशावली से सीधे जुड़ने के लिए, कृपया पहले अपना ईमेल या शेयर आईडी लिखकर लिंक करें:\n` +
            `\`/link <आपका-ईमेल>\` या \`/link <शेयर_आईडी>\` (उदाहरण: \`/link contact@barnia.in\`)।\n\n` +
            `मुझे बताएं कि मैं आज आपकी कैसे सहायता कर सकती हूँ!`,
            { parse_mode: "Markdown" }
          );
        } else {
          await sendMessage(
            `🌸 *Welcome back, ${userRespectful}!* 🌸\n\n` +
            `I am Barnali, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n` +
            `🔗 *Link Your Family Tree:*\n` +
            `To enable tree updates, please link your profile first by typing:\n` +
            `\`/link <your-email>\` or \`/link <shareId>\` (or say: 'link my tree with xyz@gmail.com').\n\n` +
            `Let me know how I can assist you today with the *barnia.in* app!`,
            { parse_mode: "Markdown" }
          );
        }
      } else {
        // First-time start
        if (userLang === "ben") {
          await sendMessage(
            `নমস্কার ${userRespectful}! আমি বর্ণালী 🌸, আপনার বার্নীয়া ডিজিটাল হাব (*barnia.in*) AI সহকারী।\n\n` +
            `আমি আপনাকে আপনার বংশাবলী (Vamshavali) পরিচালনা করতে, স্থানীয় বাজার দেখতে, এবং পঞ্জিকা সম্পর্কে তথ্য পেতে সাহায্য করার জন্য নিবেদিত।\n\n` +
            `🔗 *আপনার বংশাবলী লিংক করুন:*\n` +
            `শুরু করতে প্রথমে আপনার অ্যাকাউন্ট লিংক করুন:\n` +
            `\`/link <আপনার-ইমেইল>\` (যেমন \`/link contact@barnia.in\`)।`,
            { parse_mode: "Markdown" }
          );
        } else if (userLang === "hin") {
          await sendMessage(
            `नमस्ते ${userRespectful}! मैं बर्नाली 🌸 हूँ, बर्निया डिजिटल हब (*barnia.in*) की आपकी AI सहायक।\n\n` +
            `मैं वंशावली (Vamshavali) को प्रबंधित करने, स्थानीय बाज़ार की वस्तुओं और पंजिका की शुभ तिथियाँ देखने में आपकी सहायता करने के लिए समर्पित हूँ।\n\n` +
            `🔗 *अपनी वंशावली लिंक करें:*\n` +
            `प्रारंभ करने के लिए, कृपया पहले टाइप करके अपनी वंशावली जोड़ें:\n` +
            `\`/link <आपका-ईमेल>\` (जैसे \`/link contact@barnia.in\`)।`,
            { parse_mode: "Markdown" }
          );
        } else {
          await sendMessage(
            `Hello ${userRespectful}! I am Barnali 🌸, your AI assistant for Barnia Digital Hub (*barnia.in*).\n\n` +
            `I am dedicated specifically to helping you manage your village profile, browse the local marketplace (Bazar), see auspicious dates on the Ponjika calendar, and view or edit your family tree (*Vamshavali*).\n\n` +
            `🔗 *Link Your Family Tree:*\n` +
            `To enable tree updates, please link your profile first by typing:\n` +
            `\`/link <your-email>\` or \`/link <shareId>\` (or say: 'link my tree with xyz@gmail.com').\n\n` +
            `Let me know how I can assist you today with the *barnia.in* app!`,
            { parse_mode: "Markdown" }
          );
        }
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

    const emailVal = linkArg.toLowerCase().trim();
    let foundProfile: any = null;
    let foundSqliteTree: any = null;

    // Check Firestore first:
    if (adminDb) {
      try {
        const queryEmail = await adminDb.collection("vamshavali_profiles").where("email", "==", emailVal).limit(1).get();
        if (!queryEmail.empty) {
          foundProfile = { id: queryEmail.docs[0].id, ...queryEmail.docs[0].data() };
        } else {
          const queryShare = await adminDb.collection("vamshavali_profiles").where("shareId", "==", linkArg.toUpperCase().trim()).limit(1).get();
          if (!queryShare.empty) {
            foundProfile = { id: queryShare.docs[0].id, ...queryShare.docs[0].data() };
          }
        }
      } catch (err) {
        console.error("[Telegram] Error searching family tree in Firestore:", err);
      }
    }

    // Check SQLite:
    try {
      const account = sqliteDb.prepare("SELECT * FROM accounts WHERE email = ?").get(emailVal) as any;
      if (account) {
        const membership = sqliteDb.prepare("SELECT * FROM account_tree_memberships WHERE account_id = ?").get(account.id) as any;
        if (membership) {
          const tree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(membership.tree_id) as any;
          if (tree) {
            foundSqliteTree = tree;
            console.log(`[Telegram] Found SQLite tree ${tree.id} for account email ${emailVal}`);
          }
        }
      } else {
        const tree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(linkArg.trim()) as any;
        if (tree) {
          foundSqliteTree = tree;
          console.log(`[Telegram] Found SQLite tree ${tree.id} directly by ID`);
        }
      }
    } catch (sqliteErr) {
      console.error("[Telegram] Error searching SQLite tree:", sqliteErr);
    }

    // Execute linkage if found in SQLite:
    if (foundSqliteTree) {
      if (adminDb) {
        await adminDb.collection("telegram_users").doc(chatId.toString()).set({
          linkedProfileId: foundSqliteTree.id,
          linkedEmail: linkArg.match(emailRegex) ? emailVal : null,
          linkedShareId: foundSqliteTree.id,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      linkedProfileId = foundSqliteTree.id;
      linkedEmail = linkArg.match(emailRegex) ? emailVal : null;
      linkedShareId = foundSqliteTree.id;
      linkedProfile = foundSqliteTree;
      respectfulName = formatRespectfulName(telegramName, foundSqliteTree, userLang);

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

      const treeLink = `https://barnia.in/vamshavali/v/${foundSqliteTree.id}`;
      await sendMessage(
        `🌳 *Vamshavali Connected Successfully!* 🌳\n\n` +
        `I have linked your Telegram chat to your family tree: *"${foundSqliteTree.name}"* 🎉.\n\n` +
        `🔗 *Your Live Family Tree Link:* [View My Tree](${treeLink})\n\n` +
        `You can speak or send voice notes to me here, and I will instantly update your tree in real-time!`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Execute linkage if found in Firestore:
    if (foundProfile) {
      if (adminDb) {
        await adminDb.collection("telegram_users").doc(chatId.toString()).set({
          linkedProfileId: foundProfile.id,
          linkedEmail: foundProfile.email || null,
          linkedShareId: foundProfile.shareId || null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      linkedProfileId = foundProfile.id;
      linkedEmail = foundProfile.email || null;
      linkedShareId = foundProfile.shareId || null;
      linkedProfile = foundProfile;
      respectfulName = formatRespectfulName(telegramName, foundProfile, userLang);

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

      await sendMessage(
        `💖 *Connected Successfully!*\n\n` +
        `I have linked your Telegram chat to the family tree of *"${foundProfile.name}"*.\n\n` +
        `From now on, I will remember this tree. You can ask me questions about it or make updates anytime!`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Auto-bootstrap fresh SQLite account & tree if email provided but not found anywhere!
    if (linkArg.match(emailRegex)) {
      try {
        const { authStore } = await import("./lineage-auth.js");

        let account = sqliteDb.prepare("SELECT * FROM accounts WHERE email = ?").get(emailVal) as any;
        if (!account) {
          const tempPass = randomBytes(8).toString("hex");
          const session = authStore.registerPassword(emailVal, telegramName, tempPass);
          account = session.account;
        }

        let membership = sqliteDb.prepare("SELECT * FROM account_tree_memberships WHERE account_id = ?").get(account.id) as any;
        let tree: any;
        if (!membership) {
          const treeState = lineageStore.createTree({
            name: `${telegramName}'s Vamshavali`,
            familySurname: telegramName.split(/\s+/).pop() || "",
            seedAccountHolder: true,
            accountHolderName: telegramName
          }, account.id);
          tree = treeState.trees.find((t: any) => t.id === treeState.activeTreeId);
        } else {
          tree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(membership.tree_id);
        }

        if (tree) {
          if (adminDb) {
            await adminDb.collection("telegram_users").doc(chatId.toString()).set({
              linkedProfileId: tree.id,
              linkedEmail: emailVal,
              linkedShareId: tree.id,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }

          linkedProfileId = tree.id;
          linkedEmail = emailVal;
          linkedShareId = tree.id;
          linkedProfile = tree;
          respectfulName = formatRespectfulName(telegramName, tree, userLang);

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

          const treeLink = `https://barnia.in/vamshavali/v/${tree.id}`;
          await sendMessage(
            `✨ *Vamshavali Tree Initialized & Connected!* ✨\n\n` +
            `I have successfully initialized your account for *"${emailVal}"* and bootstrapped your unique Vamshavali page! 🌳\n\n` +
            `🔗 *Your Live family tree link is:* \n` +
            `${treeLink}\n\n` +
            `You can talk or send voice notes to me here, and I will instantly update your tree in real-time!`,
            { parse_mode: "Markdown" }
          );
          return;
        }
      } catch (bootstrapErr) {
        console.error("[Telegram] Error auto-bootstrapping SQLite tree:", bootstrapErr);
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
  try {
    const apiKey = await getGeminiApiKey();

    let userGender = "male";
    if (linkedProfile) {
      if (linkedProfile.gender === "female") userGender = "female";
      else if (linkedProfile.gender === "male") userGender = "male";
      else userGender = inferGenderByName(linkedProfile.name || telegramName);
    } else {
      userGender = inferGenderByName(telegramName);
    }

    let isSqliteTree = false;
    let sqliteTreeDescription = "";
    if (linkedProfile && linkedProfileId) {
      const dbRow = sqliteDb.prepare("SELECT 1 FROM lineage_trees WHERE id = ?").get(linkedProfileId);
      if (dbRow) {
        isSqliteTree = true;
        sqliteTreeDescription = getSqliteTreeDescription(linkedProfileId);
      }
    }

    let treePromptSection = "";
    if (isSqliteTree) {
      treePromptSection = `FAMILY TREE (VAMSHAVALI) MUTATION INTEGRATION (SQLITE MANUAL):
The user is currently linked to a high-perf SQLITE-backed lineage ledger:
${sqliteTreeDescription}

To perform any interactive tree mutation (e.g., adding a relative/child/spouse, updating fields, deleting entries, linking spouses, changing Gotra/Kuldevi), you MUST return a payload in this exact JSON schema:
{
  "isUpdate": true,
  "sqliteOperations": [
    {
      "type": "create_person",
      "data": {
        "displayName": "Full name of person",
        "gender": "male" or "female",
        "lifeStatus": "living" or "deceased",
        "maritalStatus": "married" or "unmarried" or "widowed",
        "fatherId": "IdOfFather" (only if father is already in the tree),
        "motherId": "IdOfMother" (only if mother is already in the tree and linked to the father),
        "dateOfBirth": "YYYY-MM-DD" (optional),
        "dateOfDeath": "YYYY-MM-DD" (optional),
        "deathAnniversary": "string description" (optional),
        "rashi": "Zodiac/Rashi" (optional),
        "gotra": "Gotra" (optional),
        "photoUrl": "URL reference" (optional),
        "notes": "string notes" (optional)
      }
    },
    {
      "type": "update_person",
      "id": "person_id",
      "data": { <only fields to update> }
    },
    {
      "type": "delete_person",
      "id": "person_id"
    },
    {
      "type": "link_spouses",
      "personAId": "husband_id",
      "personBId": "wife_id",
      "status": "married"
    },
    {
      "type": "update_tree",
      "data": {
        "name": "Lineage Tree Name" (optional),
        "familySurname": "Surname" (optional),
        "gotra": "Gotra" (optional),
        "kuladevi": "Kuldevi Name" (optional),
        "kuladevata": "Kuladevata Name" (optional),
        "gramadevata": "Gramadevata Name" (optional),
        "notes": "notes" (optional)
      }
    }
  ],
  "summary": "Friendly scannable Markdown summary of what you did (English, Bengali or Hindi depending on language user queried in)."
}

Strict Rules:
1. When adding a child, locate public parents in the database description. Assign "fatherId" to father's ID, and "motherId" to mother's ID.
2. Spouses are added as separate people first (if not in tree), followed by a "link_spouses" operation.
3. If assigning a photo, use exactly: "${activePhotoUrl || ""}" for "photoUrl" or "photoUrl" updates. Only do this if they attached a picture (e.g. check if the URL is not empty).
4. If they want to upload a photo but "${activePhotoUrl || ""}" is empty, DO NOT output any JSON operation; instead, output standard text asking them to attach/upload the image/photo in the Telegram message.
5. In SQLite, only male lineage members are allowed to link children or continue generations. Married daughters can stand as female elements but cannot continue generations under their own branch. Keep this in mind when mapping family lines.`;
    } else {
      treePromptSection = `FAMILY TREE (VAMSHAVALI) MUTATION INTEGRATION (FIRESTORE LEGACY):
The user's currently linked legacy Firestore Vamshavali profile is:
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
     - **By Relation description**: If they say "my grandmother's picture" or "my daughter's photo" and have provided a photo URL, trace the relation starting from the main root node and update the matching member's 'photo' to "${activePhotoUrl || ""}".`;
    }

    const systemPrompt = `You are Barnali 🌸, the smart, friendly, and helpful AI assistant for the barnia.in app (Barnia Digital Hub).
 
The user you are chatting with is: ${telegramName}.
Their registered gender is: ${userGender}.

STRICT COMPLIANCE RULES ON POLITENESS & RESPECT:
1. You MUST NEVER address the user bluntly by their direct first name or naked surname (e.g., do NOT say "Hello Uttam!" or "Dear Uttam").
2. You MUST ALWAYS address them with full courtesy and formal respect depending on the language you are outputting:
   - If you respond in BENGALI (Bangla):
     * If male: You MUST ALWAYS address them as "${telegramName} Babu" (e.g., "Uttam Babu").
     * If female: You MUST ALWAYS address them as "${telegramName} Didi" (e.g., "Sushma Didi").
   - If you respond in HINDI:
     * If male: You MUST ALWAYS address them as "${telegramName} Ji" (e.g., "Uttam Ji").
     * If female: You MUST ALWAYS address them as "${telegramName} Devi Ji" or "${telegramName} Ji" (e.g., "Sushma Devi Ji").
   - If you respond in ENGLISH:
     * If male: You MUST ALWAYS address or refer to them as "${telegramName} Sir".
     * If female: You MUST ALWAYS address or refer to them as "${telegramName} Madam" (or "${telegramName} Ma'am").
3. Your tone MUST carry premium Indian village hospitality, high warmth, humility, and polite honorific phrasing at all times.

STRICT FAMILY TREE (VAMSHAVALI) SECURITY & PRIVACY MANDATES:
1. Multiple people in Barnia share the same name and surname (e.g., multiple people are named Uttam). To prevent critical data exposure, privacy breaches, and mixing up unrelated family histories, you are STRICTLY FORBIDDEN from guessing, looking up, or suggesting potential family links based on fuzzy name-matching.
2. Under no circumstance should you share link paths of other people’s trees, or provide details of different lineages with similar names.
3. Once a user has securely linked their chat to a family tree via their Telegram ID, that linkage is permanently remembered in our Firestore cloud database so they never have to link it again unless they type /unlink.
4. If they are already linked (their credentials are provided below), confidently guide them and offer updates.
5. If they are NOT linked, and ask "Where is my family tree?" or "You don't have my family tree link?", you MUST politely explain that you cannot search by name due to overlapping names/surnames in the village. Instruct them to connect their chat securely to their specific family tree by typing "/link <registered_email>" or "/link <Vamshavali_Share_ID>" (e.g., "/link contact@barnia.in" or "/link AB12CD34").

STRICT SCOPE LIMITS:
- You are strictly optimized for and MUST ONLY answer questions and assist with Vamshavali (Family Tree mapping & updates) and Local Ponjika (Hindu almanac / calendar queries).
- You are STRICTLY FORBIDDEN from answering questions or performing queries on other platform features like Barnia Bazar, village transport, local directories, influencers, or AI Router Hub. 
- If the user asks about Barnia Bazar, village transit, or any other features, politely direct them to visit the main barnia.in website instead, saying that you are now dedicated exclusively to assisting with their Family Tree (Vamshavali) and Ponjika.
 
${treePromptSection}

LOCAL BENGALI PONJIKA REFERENCE MATERIAL:
${compileAllPonjikaData()}

LOCAL VAMSHAVALI (FAMILY TREE) PRODUCT & PAGE REFERENCE MATERIAL:
${compileVamshavaliDetails()}

- If the request is NOT a family tree modification (e.g., just general help, asking about Bazar, asking about auspicious dates, or querying details from their tree), proceed by returning standard human-readable text directly (do NOT wrap inside JSON structure).
- Conversational linking triggers: If the user says "link me to <email_or_share_id>", or you ask them to and they provide an email or Share ID/Code explicitly, you can respond with this JSON to link them:
{
  "isLink": true,
  "shareId": "<the exact share ID or email specified by the user>",
  "summary": "Linking your Telegram profile..."
}

Format answers beautifully. Speak in Bengali, Hindi, or English based on the user's language: ${userLang === "ben" ? "Bengali (বাংলা)" : userLang === "hin" ? "Hindi (हिंदी)" : "English (English)"}. Keep answers concise.`;

    const response = await callGeminiWithRetry(apiKey, {
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [ { text: `${systemPrompt}\n\nUser request: ${unifiedPrompt}` } ] }
      ]
    });

    const replyText = (response.text || "").trim();
    let isTreeUpdated = false;

    // Detect and parse JSON payloads for tree updates or database linking
    if (replyText.startsWith("{") || replyText.includes('"isUpdate"') || replyText.includes('"isLink"')) {
      try {
        const payload = parseGeminiJson(replyText);
        if (payload && payload.isLink && (payload.shareId || payload.email)) {
          const searchArg = (payload.shareId || payload.email || "").trim();
          let matchedProf: any = null;
          if (adminDb) {
            const queryEmail = await adminDb.collection("vamshavali_profiles").where("email", "==", searchArg.toLowerCase()).limit(1).get();
            if (!queryEmail.empty) {
              matchedProf = { id: queryEmail.docs[0].id, ...queryEmail.docs[0].data() };
            } else {
              const queryShare = await adminDb.collection("vamshavali_profiles").where("shareId", "==", searchArg.toUpperCase()).limit(1).get();
              if (!queryShare.empty) {
                matchedProf = { id: queryShare.docs[0].id, ...queryShare.docs[0].data() };
              }
            }
          }
          if (matchedProf) {
            if (adminDb) {
              await adminDb.collection("telegram_users").doc(chatId.toString()).set({
                linkedProfileId: matchedProf.id,
                linkedEmail: matchedProf.email || null,
                linkedShareId: matchedProf.shareId || null,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
            // Update local memory variables
            linkedProfileId = matchedProf.id;
            linkedEmail = matchedProf.email || null;
            linkedShareId = matchedProf.shareId || null;
            linkedProfile = matchedProf;

            telegramLinkCache.set(chatId, {
              linkedProfileId,
              linkedEmail,
              linkedShareId,
              currentCredits,
              linkedProfile,
              telegramName,
              timestamp: Date.now()
            });

            await sendMessage(`✅ *Family Tree Connected Conversationaly!*\n\n` +
              `I have successfully linked your Telegram chat to the family tree of *"${matchedProf.name}"* 🎉.\n\n` +
              `You can now view/manage your tree at any time here, or via the live link: [My Family Tree](https://barnia.in/vamshavali/v/${matchedProf.shareId || matchedProf.id}).`, { parse_mode: "Markdown" });
            isTreeUpdated = true;
          } else {
            await sendMessage(`❌ *Could not find that family tree.* Please verify your Email or Share ID and try again!`);
            isTreeUpdated = true;
          }
        } else if (payload && payload.isUpdate && payload.sqliteOperations) {
          if (!linkedProfileId) {
            await sendMessage("⚠️ Your Telegram chat is not linked to any profile yet.");
            isTreeUpdated = true;
          } else {
            try {
              sqliteDb.transaction(() => {
                for (const op of payload.sqliteOperations) {
                  if (op.type === "create_person") {
                    lineageStore.createPerson({
                      treeId: linkedProfileId,
                      ...op.data
                    });
                  } else if (op.type === "update_person" && op.id) {
                    lineageStore.updatePerson(op.id, op.data);
                  } else if (op.type === "delete_person" && op.id) {
                    lineageStore.deletePerson(op.id);
                  } else if (op.type === "link_spouses" && op.personAId && op.personBId) {
                    lineageStore.linkSpouses(linkedProfileId, op.personAId, op.personBId, op.status || "married");
                  } else if (op.type === "update_tree" && op.data) {
                    lineageStore.updateTree(linkedProfileId, op.data);
                  }
                }
              })();

              // Clear photostate cache
              lastPhotos.delete(chatId);

              // Update cached profile memory
              const updatedTree = sqliteDb.prepare("SELECT * FROM lineage_trees WHERE id = ?").get(linkedProfileId) as any;
              telegramLinkCache.set(chatId, {
                linkedProfileId,
                linkedEmail,
                linkedShareId: linkedProfileId,
                currentCredits,
                linkedProfile: updatedTree,
                telegramName,
                userLang,
                timestamp: Date.now()
              });

              const traceLink = `\n\nLive preview updated on [barnia.in/vamshavali/v/${linkedProfileId}](https://barnia.in/vamshavali/v/${linkedProfileId}).`;
              const updateText = `✅ *Vamshavali Ledger Updated!* 🌳\n\n${payload.summary || "Updates successfully applied."}${traceLink}`;
              await sendMessage(updateText, { parse_mode: "Markdown" });
              isTreeUpdated = true;

              // Generate and send a sweet voice confirmation
              const speakText = `Vamshavali updated! ${payload.summary || "All your changes have been securely saved to the family tree."}`;
              const audioBuffer = await generateSpeech(speakText, apiKey);
              if (audioBuffer) {
                await sendTelegramVoice(botToken, chatId, audioBuffer);
              }
            } catch (err: any) {
              console.error("[Telegram Bot] SQLite mutation failed:", err);
              await sendMessage(`⚠️ *Could not apply those changes:* ${err.message || err}`);
              isTreeUpdated = true;
            }
          }
        } else if (payload && payload.isUpdate && payload.updatedProfile) {
          if (!linkedProfileId) {
            await sendMessage(
              `⚠️ *Could not apply updates*\n\n` +
              `I formulated the updates for your family tree, but I cannot save them because your Telegram chat is not linked to any profile.\n\n` +
              `To save these updates, please link your profile first by typing:\n` +
              `\`/link <your-registered-email>\` (e.g. \`/link contact@barnia.in\`)`, 
              { parse_mode: "Markdown" }
            );
            isTreeUpdated = true;
          } else {
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
              userLang,
              timestamp: Date.now()
            });
            
            const traceLink = finalizedProfile.shareId 
              ? `\n\nLive preview updated on [barnia.in/vamshavali/v/${finalizedProfile.shareId}](https://barnia.in/vamshavali/v/${finalizedProfile.shareId}).`
              : `\n\nLive preview updated on [barnia.in/vamshavali](https://barnia.in/vamshavali).`;

            const updateMsg = `✅ *Family Tree Updated In Cloud Ledger!*\n\n${payload.summary || "Changes saved."}${traceLink}`;
            await sendMessage(updateMsg, { parse_mode: "Markdown" });
            isTreeUpdated = true;

            // Generate and send a sweet voice confirmation
            const speakText = `Family Tree updated! ${payload.summary || "Changes successfully written to your Cloud family tree."}`;
            const audioBuffer = await generateSpeech(speakText, apiKey);
            if (audioBuffer) {
              await sendTelegramVoice(botToken, chatId, audioBuffer);
            }
          }
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

      // Generate and send the natural spoken Voice Note alongside the text response!
      const audioBuffer = await generateSpeech(finalMsg, apiKey);
      if (audioBuffer) {
        await sendTelegramVoice(botToken, chatId, audioBuffer);
      }
    }

  } catch (error: any) {
    console.error("[Telegram] Gemini Execution Error:", error.message);
    await sendMessage("I encountered an issue processing that query. Please try again later.");
  }
}

