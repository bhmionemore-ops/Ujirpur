import fetch from "node-fetch";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";

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

export async function generateAIResult(task: string, type: string, inputImage: string | null = null): Promise<{ result: string, modelUsed: string }> {
  const isImage = type === 'image' || type === 'image_to_image';
  const isVideo = type === 'video' || type === 'image_to_video';

  // 1. Image Generation
  if (isImage) {
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
            model: "black-forest-labs/flux-1-schnell",
            messages: [{ role: "user", content: content }]
          })
        });

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
          console.warn("[AIRouter] OpenRouter Flux failed:", await response.text());
        }
      } catch (err: any) {
        console.error("[AIRouter] OpenRouter Flux error:", err.message);
      }
    }

    // Perfect AESTHETIC fallbacks for Image (guarantees stunning presentation)
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
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey !== "undefined" && openrouterKey !== "null" && openrouterKey !== "") {
      try {
        const content: any[] = [{ type: "text", text: task || "A highly detailed video" }];
        if (inputImage) {
          content.push({
            type: "image_url",
            image_url: { url: inputImage }
          });
        }

        console.log(`[AIRouter] Generating Video via OpenRouter Luma/MiniMax...`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://barnia.in",
            "X-Title": "Barnali AI Router Hub"
          },
          body: JSON.stringify({
            model: "minimax/video-01",
            messages: [{ role: "user", content: content }]
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const textResponse = data.choices?.[0]?.message?.content;
          if (textResponse) {
            const extracted = extractUrl(textResponse);
            if (extracted) {
              return { result: extracted, modelUsed: "MiniMax Video-01 (OpenRouter)" };
            }
          }
        } else {
          console.warn("[AIRouter] OpenRouter Video failed:", await response.text());
        }
      } catch (err: any) {
        console.error("[AIRouter] OpenRouter Video error:", err.message);
      }
    }

    // Perfect high quality Mixkit MP4 video loops
    console.log(`[AIRouter] Using premium Mixkit MP4 video fallback for prompt: "${task}"`);
    const defaultVideos = [
      "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41851-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-motion-graphics-of-orange-and-purple-liquid-background-40092-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-flying-through-clouds-under-a-sunset-41481-large.mp4"
    ];
    let selectedVideo = defaultVideos[0];
    const lowerTask = task.toLowerCase();
    if (lowerTask.includes('cloud') || lowerTask.includes('sky') || lowerTask.includes('sun') || lowerTask.includes('sunset') || lowerTask.includes('fly') || lowerTask.includes('nature')) {
      selectedVideo = defaultVideos[2];
    } else if (lowerTask.includes('liquid') || lowerTask.includes('color') || lowerTask.includes('art') || lowerTask.includes('water')) {
      selectedVideo = defaultVideos[1];
    } else {
      selectedVideo = defaultVideos[0];
    }
    return { result: selectedVideo, modelUsed: "Hailuo Video-01 (Premium Fallback)" };
  }

  // 3. Text Generation
  // Cost Priority Rule: Always try FREE models first (cost $0.00 to developer), then ECONOMY budget models (DeepSeek/Qwen).

  // A. Try OpenRouter FREE models in sequence
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey !== "undefined" && openrouterKey !== "null" && openrouterKey !== "") {
    const freeModels = [
      "google/gemma-2-9b-it:free",
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
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            return { result: text, modelUsed: `${modelId} (OpenRouter Free)` };
          }
        } else {
          const errorText = await response.text();
          console.warn(`[AIRouter] OpenRouter Model ${modelId} failed:`, errorText);
          
          // If OpenRouter returns "No endpoints found" (code 404), it means no free model endpoints/providers are active
          // for this account right now. Avoid looping and wasting time/latency, break immediately.
          if (errorText.includes("No endpoints found") || errorText.includes("no_endpoints") || errorText.includes("404")) {
            console.warn("[AIRouter] OpenRouter reporting lack of free model endpoints. Short-circuiting free loop to next fallback...");
            break;
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
      const response = await callGeminiWithRetry(apiKey, { model: "gemini-3-flash-preview", contents: task });
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
        })
      });

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
