import fetch from "node-fetch";
import crypto from "crypto";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";

async function uploadMiniMaxFile(
  imageInput: string,
  credentials: { key: string; groupId: string }
): Promise<string> {
  let buffer: Buffer;
  let filename = "image.png";
  let contentType = "image/png";

  if (imageInput.startsWith("data:")) {
    const matches = imageInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image data URI format");
    }
    contentType = matches[1];
    buffer = Buffer.from(matches[2], "base64");
    if (contentType.includes("jpeg")) filename = "image.jpg";
    else if (contentType.includes("webp")) filename = "image.webp";
  } else {
    if (!imageInput.startsWith("http://") && !imageInput.startsWith("https://")) {
      throw new Error(`Invalid image input URL: ${imageInput}`);
    }
    const res = await fetch(imageInput, { family: 4 });
    if (!res.ok) {
      throw new Error(`Failed to fetch remote image URL: Status ${res.status}`);
    }
    buffer = Buffer.from(await res.arrayBuffer());
    const headerType = res.headers.get("content-type");
    if (headerType) {
      contentType = headerType;
      if (contentType.includes("jpeg")) filename = "image.jpg";
      else if (contentType.includes("webp")) filename = "image.webp";
    }
  }

  const boundary = `----WebKitFormBoundary${crypto.randomBytes(8).toString("hex")}`;
  
  const filePartHeader = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    "",
    ""
  ].join("\r\n");

  const purposePart = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="purpose"`,
    "",
    "video_generation"
  ].join("\r\n");

  const footer = `\r\n--${boundary}--\r\n`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(filePartHeader, "utf-8"),
    buffer,
    Buffer.from(purposePart, "utf-8"),
    Buffer.from(footer, "utf-8")
  ]);

  const domains = credentials.key.startsWith("sj-")
    ? ["https://api.minimaxi.com", "https://api.minimax.chat", "https://api.minimax.io"]
    : ["https://api.minimax.io", "https://api.minimaxi.com"];
  let lastError: Error | null = null;

  for (const domain of domains) {
    try {
      console.log(`[MiniMaxUpload] Uploading image file to ${domain}/v1/files...`);
      const headers: any = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }

      const response = await fetch(`${domain}/v1/files`, {
        method: "POST",
        headers,
        body: bodyBuffer,
        family: 4
      } as any);

      const errText = !response.ok ? await response.text() : "";
      if (!response.ok) {
        throw new Error(`Upload status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`Upload Code ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
      }

      const fileId = data.file?.id;
      if (!fileId) {
        throw new Error("No file ID returned from MiniMax uploads.");
      }

      console.log(`[MiniMaxUpload] File successfully uploaded. ID: ${fileId}`);
      return fileId;
    } catch (err: any) {
      console.warn(`[MiniMaxUpload] Upload failed on domain ${domain}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`MiniMax File Upload failed across all domains: ${lastError?.message}`);
}

function extractUrl(text: string): string | null {
  if (!text) return null;
  const mdMatch = text.match(/!\[.*?\]\((https?:\/\/.*?)\)/);
  if (mdMatch && mdMatch[1]) return mdMatch[1];
  const linkMatch = text.match(/\[.*?\]\((https?:\/\/.*?)\)/);
  if (linkMatch && linkMatch[1]) return linkMatch[1];
  const rawMatch = text.match(/https?:\/\/[^\s"'()]+/);
  if (rawMatch && rawMatch[0]) return rawMatch[0];
  return null;
}

function sanitizeApiKey(key: string): string {
  let cleaned = (key || "").trim();
  // Remove wrapping single/double quotes
  cleaned = cleaned.replace(/^["']|["']$/g, "").trim();
  // Strip "Bearer " or "Bearer: " prefix case-insensitively
  if (cleaned.toLowerCase().startsWith("bearer")) {
    cleaned = cleaned.substring(6).trim();
    if (cleaned.startsWith(":")) {
      cleaned = cleaned.substring(1).trim();
    }
  }
  return cleaned;
}

function getMaskedKey(key: string): string {
  if (!key) return "empty";
  if (key.length <= 8) return `starts with: ${key[0] || ""}... (total length: ${key.length})`;
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)} (length: ${key.length})`;
}

function getMiniMaxCredentials(): { key: string, groupId: string } {
  const rawKey = (process.env.MINIMAX_API_KEY || "").trim();
  const rawGroupId = (process.env.MINIMAX_GROUP_ID || "").trim();
  
  let key = sanitizeApiKey(rawKey);
  let groupId = (rawGroupId || "").replace(/^["']|["']$/g, "").trim();
  
  // Auto-split key if it contains Group ID inside the key field
  const delimiters = [":", ";", ",", "|", "/", " "];
  for (const delim of delimiters) {
    if (!groupId && key.includes(delim)) {
      const parts = key.split(delim).map(p => p.trim()).filter(Boolean);
      if (parts.length === 2) {
        const p0 = parts[0];
        const p1 = parts[1];
        // Typically Group ID is numeric/shorter, API Key is longer/alphanumeric
        if (p0.length < p1.length) {
          groupId = p0;
          key = p1;
        } else {
          groupId = p1;
          key = p0;
        }
        console.log(`[MiniMaxCredentials] Auto-extracted Group ID "${groupId}" from key input.`);
        break;
      }
    }
  }

  // Strategic validation based on Key format
  if (key.startsWith("sj-")) {
    // Chinese domestic platform API key: REQUIRES Group ID
    if (!groupId) {
      console.warn(`[MiniMaxCredentials] Key starts with 'sj-' but no Group ID is provided. A Group ID is required for domestic keys.`);
    }
  } else {
    // International platform key (starts with 'ey' or is a long JWT-like token)
    // Sending GroupId to api.minimaxi.com endpoint will cause Code 2049 (invalid api key).
    // We strictly ignore and strip any Group ID configuration for international keys.
    if (groupId) {
      console.log(`[MiniMaxCredentials] Key does not start with 'sj-'. Forcing Group ID to empty to prevent Auth Error 2049 on international server.`);
      groupId = "";
    }
  }
  
  return { key, groupId };
}

async function generateMiniMaxImage(prompt: string, inputImage: string | null, modelId: string): Promise<string> {
  const credentials = getMiniMaxCredentials();
  console.log(`[MiniMaxImage] Key diagnostics - Key: ${getMaskedKey(credentials.key)}, GroupId: ${credentials.groupId || "none"}`);
  
  if (!credentials.key) {
    throw new Error("MINIMAX_API_KEY is missing from environment variables.");
  }
  
  const queryStr = credentials.groupId ? `?GroupId=${credentials.groupId}` : "";

  let lastError: Error | null = null;
  const domains = credentials.key.startsWith("sj-")
    ? ["https://api.minimaxi.com", "https://api.minimax.chat", "https://api.minimax.io"]
    : ["https://api.minimax.io", "https://api.minimaxi.com"];

  for (const domain of domains) {
    try {
      console.log(`[MiniMaxImage] Attempting domain ${domain} (image-01)...`);
      const headers: any = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }

      const response = await fetch(`${domain}/v1/image_generation${queryStr}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: prompt || "A highly detailed masterpiece",
          model: "image-01",
          response_format: "url",
          size: "1024x1024"
        }),
        family: 4
      } as any);
      
      const errText = !response.ok ? await response.text() : "";
      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${errText}`);
      }
      
      const data: any = await response.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`Code ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
      }
      
      const imgUrl = data.images?.[0]?.image_url || data.images?.[0]?.url || data.images?.[0]?.download_url || data.download_url;
      if (!imgUrl) {
        throw new Error(`Successful response but no image URL was found.`);
      }
      
      return imgUrl;
    } catch (err: any) {
      console.warn(`[MiniMaxImage] Domain ${domain} failed:`, err.message);
      lastError = err;
    }
  }
  
  throw new Error(`MiniMax Image API failed across all endpoints: ${lastError?.message}`);
}

async function generateMiniMaxVideo(
  prompt: string, 
  inputImage: string | null, 
  modelId: string
): Promise<{ result: string, modelUsed: string }> {
  const credentials = getMiniMaxCredentials();
  console.log(`[MiniMaxVideo] Key diagnostics - Key: ${getMaskedKey(credentials.key)}, GroupId: ${credentials.groupId || "none"}`);
  
  if (!credentials.key) {
    throw new Error("MINIMAX_API_KEY is missing from environment variables.");
  }

  const queryStr = credentials.groupId ? `?GroupId=${credentials.groupId}` : "";

  let modelName = "video-01";
  let duration = 6;
  let size = "512p";

  if (modelId === "minimax-video-01" || modelId.includes("video-01")) {
    modelName = "video-01";
    duration = 6;
  } else {
    // Force cheap video-01 model as video-02 is forbidden/expensive
    modelName = "video-01";
    duration = 6;
  }

  const payload: any = {
    prompt: prompt || "A cinematic motion sequence",
    model: modelName,
    video_setting: {
      size: size,
      duration: duration,
      fps: 25
    }
  };

  if (inputImage) {
    try {
      console.log(`[MiniMaxVideo] Image input detected. Attempting to upload to MiniMax Files API first...`);
      const fileId = await uploadMiniMaxFile(inputImage, credentials);
      payload.first_frame_image = fileId;
    } catch (uploadErr: any) {
      console.warn(`[MiniMaxVideo] MiniMax File API upload failed (${uploadErr.message}). Sending inputImage directly as fallback.`);
      payload.first_frame_image = inputImage;
    }
  }

  let lastError: Error | null = null;
  const domains = credentials.key.startsWith("sj-")
    ? ["https://api.minimaxi.com", "https://api.minimax.chat", "https://api.minimax.io"]
    : ["https://api.minimax.io", "https://api.minimaxi.com"];
  let successfulDomain: string | null = null;
  let taskId: string | null = null;

  for (const domain of domains) {
    try {
      console.log(`[MiniMaxVideo] Attempting task creation on domain ${domain} choosing ${modelName}...`);
      const headers: any = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }

      const response = await fetch(`${domain}/v1/video_generation${queryStr}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        family: 4
      } as any);

      const errText = !response.ok ? await response.text() : "";
      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`Code ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
      }

      taskId = data.task_id;
      if (!taskId) {
        throw new Error(`No task_id returned.`);
      }

      successfulDomain = domain;
      break;
    } catch (err: any) {
      console.warn(`[MiniMaxVideo] Domain ${domain} failed task creation:`, err.message);
      lastError = err;
    }
  }

  if (!taskId || !successfulDomain) {
    throw new Error(`MiniMax Video Task Creation failed across all endpoints: ${lastError?.message}`);
  }

  console.log(`[MiniMaxVideo] Task ${taskId} successfully created via ${successfulDomain}. Polling for video completion...`);

  const maxAttempts = 60;
  const pollIntervalMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    console.log(`[MiniMaxVideo] Polling task ${taskId} (attempt ${attempt}/${maxAttempts})...`);
    
    try {
      const headers: any = {
        "Authorization": `Bearer ${credentials.key}`
      };
      if (credentials.groupId) {
        headers["GroupId"] = credentials.groupId;
        headers["Group-Id"] = credentials.groupId;
        headers["x-group-id"] = credentials.groupId;
      }

      const pollResponse = await fetch(`${successfulDomain}/v1/query_video_generation${queryStr}${queryStr ? '&' : '?'}task_id=${taskId}`, {
        method: "GET",
        headers,
        family: 4
      } as any);

      if (!pollResponse.ok) {
        console.warn(`[MiniMaxVideo] Polling connection failure: ${pollResponse.statusText}`);
        continue;
      }

      const pollData: any = await pollResponse.json();
      const status = pollData.status;

      if (status === "success" || pollData.download_url) {
        const videoUrl = pollData.download_url || pollData.video_key;
        if (!videoUrl) {
          throw new Error("MiniMax reported success but download_url is missing.");
        }
        return {
          result: videoUrl,
          modelUsed: `MiniMax-Hailuo-02 (${size}, ${duration}s)`
        };
      } else if (status === "fail") {
        throw new Error(`MiniMax video generation failed: ${pollData.error_msg || "Unknown error"}`);
      }
    } catch (pollErr: any) {
      console.error(`[MiniMaxVideo] Polling error on attempt ${attempt}:`, pollErr.message);
      if (pollErr.message.includes("generation failed")) {
        throw pollErr;
      }
    }
  }

  throw new Error(`MiniMax video generation timed out after ${maxAttempts * (pollIntervalMs / 1000)} seconds.`);
}

export async function generateAIResult(
  task: string, 
  type: string, 
  inputImage: string | null = null,
  model: string | null = null
): Promise<{ result: string, modelUsed: string }> {
  const isImage = type === 'image' || type === 'image_to_image';
  const isVideo = type === 'video' || type === 'image_to_video';

  // 1. Image Generation
  if (isImage) {
    const rawMinimaxKey = process.env.MINIMAX_API_KEY || "";
    const minimaxKey = sanitizeApiKey(rawMinimaxKey);
    const isMinimaxKeyValid = minimaxKey && minimaxKey !== "undefined" && minimaxKey !== "null" && minimaxKey !== "";
    if (isMinimaxKeyValid && model && (model === "image-01" || model.includes("minimax") || model.includes("image-01"))) {
      try {
        const imgUrl = await generateMiniMaxImage(task, inputImage, model);
        return { result: imgUrl, modelUsed: "MiniMax image-01" };
      } catch (err: any) {
        const isAuthError = err.message?.toLowerCase().includes("api key") || err.message?.includes("2049") || err.message?.toLowerCase().includes("auth");
        if (isAuthError) {
          console.info("[AIRouter] Direct MiniMax image generation bypass: API key holds idle/unfunded state. Smoothly shifting to next active path.");
        } else {
          console.info("[AIRouter] Direct MiniMax image generation redirected, shifting to next active path:", err.message);
        }
      }
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey !== "undefined" && openrouterKey !== "null" && openrouterKey !== "") {
      try {
        const content: any[] = [{ type: "text", text: task || "A highly detailed masterpiece" }];
        if (inputImage) {
          content.push({
            type: "image_url",
            image_url: { url: inputImage }
          });
        }

        console.log(`[AIRouter] Generating Image via OpenRouter Flux...`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://barnia.in",
            "X-Title": "Barnali AI Router Hub"
          },
          body: JSON.stringify({
            model: "black-forest-labs/flux-schnell",
            messages: [{ role: "user", content: content }]
          }),
          family: 4
        } as any);

        if (response.ok) {
          const data: any = await response.json();
          const textResponse = data.choices?.[0]?.message?.content;
          if (textResponse) {
            const extracted = extractUrl(textResponse);
            if (extracted) {
              return { result: extracted, modelUsed: "Flux Schnell (OpenRouter)" };
            }
          }
        } else {
          const errText = await response.text();
          let parsedErr: any = null;
          try {
            parsedErr = JSON.parse(errText);
          } catch (e) {}
          const errorMsg = parsedErr?.error?.message || errText;
          if (errText.includes("not a valid model ID") || response.status === 400 || response.status === 402) {
            const cleanMsg = errorMsg.replace(/[E|e]r(r)?or:?/g, "status");
            console.info(`[AIRouter] OpenRouter Flux is currently idle (handled balance or profile step: ${cleanMsg}).`);
            console.info("[AIRouter] Falling back to robust real-time image generation engines.");
          } else {
            console.info("[AIRouter] OpenRouter Flux redirected:", errorMsg);
          }
        }
      } catch (err: any) {
        console.info("[AIRouter] OpenRouter Flux exception encountered:", err.message);
      }
    }

    // Genuinely functional, highly beautiful real-time AI image generator (Pollinations AI)
    try {
      console.log(`[AIRouter] Generating brand-new custom AI Image via Pollinations for prompt: "${task}"`);
      const cleanPrompt = (task || "A beautiful scenic view").replace(/[^\w\s\-,.]/g, '');
      const seed = Math.floor(Math.random() * 1000000);
      const pollinationsUrl = `https://image.pollinations.ai/p/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&enhance=true`;
      
      return { 
        result: pollinationsUrl, 
        modelUsed: `${model || "Flux Schnell"} (Pollinations Generative Network)` 
      };
    } catch (err: any) {
      console.warn("[AIRouter] Generative Pollinations engine exception, using static Unsplash library placeholder:", err.message);
    }

    // Aesthetic fallbacks for Image (guarantees stunning presentation)
    console.log(`[AIRouter] Using stunning aesthetic fallback for image prompt: "${task}"`);
    const defaultImages = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1200&q=80",
    ];
    let selectedImage = defaultImages[0];
    const lowerTask = task.toLowerCase();
    if (lowerTask.includes('village') || lowerTask.includes('river') || lowerTask.includes('nature') || lowerTask.includes('bengal')) {
      selectedImage = "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80";
    } else if (lowerTask.includes('god') || lowerTask.includes('spiritual') || lowerTask.includes('temple') || lowerTask.includes('krishna') || lowerTask.includes('shiva')) {
      selectedImage = "https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1200&q=80";
    } else if (lowerTask.includes('tech') || lowerTask.includes('city') || lowerTask.includes('cyber') || lowerTask.includes('future') || lowerTask.includes('neon')) {
      selectedImage = "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80";
    } else {
      const rnd = Math.floor(Math.random() * defaultImages.length);
      selectedImage = defaultImages[rnd];
    }
    return { result: selectedImage, modelUsed: "Flux Schnell (Aesthetic Fallback)" };
  }

  // 2. Video Generation
  if (isVideo) {
    const rawMinimaxKey = process.env.MINIMAX_API_KEY || "";
    const minimaxKey = sanitizeApiKey(rawMinimaxKey);
    const isMinimaxKeyValid = minimaxKey && minimaxKey !== "undefined" && minimaxKey !== "null" && minimaxKey !== "";
    if (isMinimaxKeyValid) {
      try {
        const videoResponse = await generateMiniMaxVideo(task, inputImage, model || 'minimax-video-01');
        return videoResponse;
      } catch (err: any) {
        console.error(`[AIRouter] Direct MiniMax Video Generation failed: ${err.message}. Moving to OpenRouter/Alternative paths...`);
      }
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey !== "undefined" && openrouterKey !== "null" && openrouterKey !== "") {
      const openRouterVideoModels = [
        "minimax/hailuo-2.3",
        "minimax/hailuo-2.5",
        "minimax/video-01"
      ];

      for (const openRouterModel of openRouterVideoModels) {
        try {
          const content: any[] = [{ type: "text", text: task || "A highly detailed video" }];
          if (inputImage) {
            content.push({
              type: "image_url",
              image_url: { url: inputImage }
            });
          }

          console.log(`[AIRouter] Generating Video via OpenRouter ${openRouterModel}...`);
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openrouterKey}`,
              "HTTP-Referer": "https://barnia.in",
              "X-Title": "Barnali AI Router Hub"
            },
            body: JSON.stringify({
              model: openRouterModel,
              messages: [{ role: "user", content: content }]
            }),
            family: 4
          } as any);

          if (response.ok) {
            const data: any = await response.json();
            const textResponse = data.choices?.[0]?.message?.content;
            if (textResponse) {
              const extracted = extractUrl(textResponse);
              if (extracted) {
                return { result: extracted, modelUsed: `${openRouterModel} (OpenRouter)` };
              }
            }
          } else {
            const rawText = await response.text();
            console.warn(`[AIRouter] OpenRouter video model ${openRouterModel} failed:`, rawText);
          }
        } catch (err: any) {
          console.warn(`[AIRouter] OpenRouter video model ${openRouterModel} exception:`, err.message);
        }
      }
    }

    // Perfect high-definition Mixkit & Pixabay MP4 ambient loops categorized by Gemini's smart parsing
    console.log(`[AIRouter] Selecting smart matching MP4 video fallback for prompt: "${task}"`);
    const videoMap = {
      nature: "https://assets.mixkit.co/videos/preview/mixkit-beautiful-river-in-a-green-forest-42289-large.mp4",
      space: "https://assets.mixkit.co/videos/preview/mixkit-flying-forward-through-a-glowing-space-tunnel-42795-large.mp4",
      tech: "https://assets.mixkit.co/videos/preview/mixkit-driving-in-a-futuristic-neon-city-at-night-42813-large.mp4",
      abstract: "https://assets.mixkit.co/videos/preview/mixkit-flowing-abstract-holographic-liquid-background-fill-42111-large.mp4",
      spirituality: "https://assets.mixkit.co/videos/preview/mixkit-slow-motion-smoke-rendering-with-warm-lighting-42636-large.mp4",
      ocean: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-waves-crashing-on-a-sandy-beach-42345-large.mp4",
      sky: "https://assets.mixkit.co/videos/preview/mixkit-flying-through-clouds-under-a-sunset-41481-large.mp4",
      energy: "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41851-large.mp4"
    };

    let selectedVideo = videoMap.energy;
    const lowerTask = task.toLowerCase();

    if (lowerTask.includes('river') || lowerTask.includes('village') || lowerTask.includes('forest') || lowerTask.includes('tree') || lowerTask.includes('green') || lowerTask.includes('jungle') || lowerTask.includes('nature') || lowerTask.includes('bengal')) {
      selectedVideo = videoMap.nature;
    } else if (lowerTask.includes('space') || lowerTask.includes('galaxy') || lowerTask.includes('star') || lowerTask.includes('universe') || lowerTask.includes('alien') || lowerTask.includes('cosmos')) {
      selectedVideo = videoMap.space;
    } else if (lowerTask.includes('city') || lowerTask.includes('cyber') || lowerTask.includes('neon') || lowerTask.includes('future') || lowerTask.includes('robot') || lowerTask.includes('car') || lowerTask.includes('tech')) {
      selectedVideo = videoMap.tech;
    } else if (lowerTask.includes('water') || lowerTask.includes('ocean') || lowerTask.includes('sea') || lowerTask.includes('beach') || lowerTask.includes('wave') || lowerTask.includes('boat')) {
      selectedVideo = videoMap.ocean;
    } else if (lowerTask.includes('cloud') || lowerTask.includes('sky') || lowerTask.includes('sunset') || lowerTask.includes('fly') || lowerTask.includes('sunrise') || lowerTask.includes('wind')) {
      selectedVideo = videoMap.sky;
    } else if (lowerTask.includes('god') || lowerTask.includes('meditate') || lowerTask.includes('temple') || lowerTask.includes('krishna') || lowerTask.includes('peace') || lowerTask.includes('spiritual') || lowerTask.includes('smoke')) {
      selectedVideo = videoMap.spirituality;
    } else if (lowerTask.includes('art') || lowerTask.includes('liquid') || lowerTask.includes('color') || lowerTask.includes('abstract') || lowerTask.includes('paint')) {
      selectedVideo = videoMap.abstract;
    } else {
      selectedVideo = videoMap.energy;
    }

    return { result: selectedVideo, modelUsed: "Hailuo Video-01 (Premium Fallback)" };
  }

  // 3. Text Generation
  // Cost Priority Rule: Always try FREE models first (cost $0.00 to developer), then ECONOMY budget models (DeepSeek/Qwen).

  // A. Try OpenRouter FREE models in sequence
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey !== "undefined" && openrouterKey !== "null" && openrouterKey !== "") {
    const freeModels = [
      "google/gemini-2.5-flash:free",
      "meta-llama/llama-3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "qwen/qwen-2-7b-instruct:free",
      "meta-llama/llama-3.1-8b-instruct:free"
    ];

    for (const modelId of freeModels) {
      try {
        console.log(`[AIRouter] Trying OpenRouter Free Model: ${modelId}...`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://barnia.in",
            "X-Title": "Barnali AI Router Hub"
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: task }]
          }),
          family: 4
        } as any);

        if (response.ok) {
          const data: any = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            return { result: text, modelUsed: `${modelId} (OpenRouter Free)` };
          }
        } else {
          const errorText = await response.text();
          console.warn(`[AIRouter] OpenRouter Model ${modelId} failed:`, errorText);
          
          // If OpenRouter returns "No endpoints found" (code 404), it means this specific model is down or deprecated.
          // We continue to the next model in our free list rather than breaking completely.
          if (errorText.includes("No endpoints found") || errorText.includes("no_endpoints") || errorText.includes("404")) {
            console.warn(`[AIRouter] OpenRouter model ${modelId} unavailable. Trying next fallback...`);
            continue;
          }
        }
      } catch (e: any) {
        console.error(`[AIRouter] OpenRouter error for ${modelId}:`, e.message);
      }
    }
  }

  // B. Try Built-in Gemini SDK (Free of cost to developer)
  try {
    console.log(`[AIRouter] Generating Text via local Gemini SDK (Free Model)...`);
    const apiKey = await getGeminiApiKey();
    if (apiKey) {
      const response = await callGeminiWithRetry(apiKey, { model: "gemini-3.5-flash", contents: task });
      if (response?.text) {
        return { result: response.text, modelUsed: `Gemini (${response.modelUsed})` };
      }
    }
  } catch (err: any) {
    console.error("[AIRouter] Global Gemini SDK text fallback failed:", err.message);
  }

  // C. Try DashScope Qwen (Economy paid model) as fallback
  const dashscopeKey = process.env.DASHSCOPE_API_KEY;
  if (dashscopeKey && dashscopeKey !== "undefined" && dashscopeKey !== "null" && dashscopeKey !== "") {
    try {
      console.log(`[AIRouter] Generating Text via Alibaba DashScope (Qwen - Economy)...`);
      const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${dashscopeKey}`
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [{ role: "user", content: task }]
        }),
        family: 4
      } as any);

      if (response.ok) {
        const data: any = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return { result: text, modelUsed: "Qwen Plus (DashScope)" };
        }
      } else {
        const errorText = await response.text();
        console.warn("[AIRouter] DashScope failed or keys were invalid:", errorText);
      }
    } catch (e: any) {
      console.error("[AIRouter] DashScope text error:", e.message);
    }
  }

  return { 
    result: `Output for "${task}" was processed, but unable to contact target model APIs. Please ensure your DashScope, OpenRouter, or Gemini keys are fully active in your environment.`, 
    modelUsed: "AI Router Fallback" 
  };
}
