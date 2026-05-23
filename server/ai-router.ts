import * as DB from "./db";
import crypto from "crypto";
import { generateAIResult } from "./ai-router-logic";

function getEstimatedCost(type: string): number {
  if (type === 'text') return 1;
  if (type === 'image') return 10;
  if (type === 'image_to_image') return 10;
  if (type === 'video') return 65;
  if (type === 'image_to_video') return 65;
  return 1;
}

export function setupAIRouter(app: any, _db: any, _adminDb: any, admin: any) {
  // Provision API Key for professional developers / other hubs
  app.post("/api/ai/key", async (req: any, res: any) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      // Generate a highly secure random API key prefix with x-bar
      const apiKey = "x-bar-" + crypto.randomBytes(16).toString("hex");

      await adminDb.collection("api_keys").doc(userId).set({
        userId,
        apiKey,
        createdAt: new Date()
      });

      res.json({ apiKey });
    } catch (e: any) {
      console.error("[AIRouter] Key generation error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Main UI router handler (runs fast on budget tasks, queues premium tasks)
  app.post("/api/ai", async (req: any, res: any) => {
    try {
      const { userId, task, type, inputImage, approved } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      // Grab user credit balance
      const userRef = adminDb.collection("users").doc(userId);
      let userSnap = await userRef.get();
      if (!userSnap.exists) {
        console.log(`[AIRouter] User profile ${userId} not found in adminDb. Auto-bootstrapping default profile.`);
        await userRef.set({
          uid: userId,
          email: userId.includes('@') ? userId : "explorer@sanatani.dharm",
          displayName: userId.includes('@') ? userId.split('@')[0] : "AI Explorer",
          credits: 20,
          role: "user",
          createdAt: new Date().toISOString()
        });
        userSnap = await userRef.get();
      }

      const userData = userSnap.data()!;
      const credits = userData.credits !== undefined ? userData.credits : 20;

      // Classify type if it's 'auto'
      let resolvedType = type;
      if (type === 'auto') {
        const t = (task || "").toLowerCase();
        if (t.includes('video') || t.includes('motion') || t.includes('movie') || t.includes('clip') || t.includes('animation')) {
          resolvedType = 'video';
        } else if (t.includes('image') || t.includes('photo') || t.includes('picture') || t.includes('draw') || t.includes('painting') || t.includes('art')) {
          resolvedType = 'image';
        } else {
          resolvedType = 'text';
        }
      }

      const estimatedCost = getEstimatedCost(resolvedType);
      if (credits < estimatedCost) {
        return res.status(400).json({ error: `Insufficient credit balance. This task requires ${estimatedCost} credits but you only have ${credits}.` });
      }

      // Check user approval loop for premium items
      if (estimatedCost >= 15 && !approved) {
        return res.json({ 
          needsApproval: true, 
          cost: estimatedCost, 
          message: `This premium task (${resolvedType}) will consume ${estimatedCost} credits. Would you like to proceed?` 
        });
      }

      // Standard budget tasks are executed instantly (credits < 15)
      if (estimatedCost < 15) {
        console.log(`[AIRouter] Running budget task (${resolvedType}) instantly for user ${userId}`);
        const aiResponse = await generateAIResult(task, resolvedType, inputImage || null);
        
        // Deduct credit
        const newCredits = Math.max(0, credits - estimatedCost);
        await userRef.update({ credits: newCredits });

        // Save log to usage collection
        await adminDb.collection("usage").add({
          userId,
          task,
          type: resolvedType,
          cost: estimatedCost,
          modelUsed: aiResponse.modelUsed,
          result: aiResponse.result,
          timestamp: new Date()
        });

        return res.json({
          success: true,
          type: resolvedType,
          result: aiResponse.result,
          modelUsed: aiResponse.modelUsed,
          cost: estimatedCost,
          remainingCredits: newCredits
        });
      }

      // Premium tasks (cost >= 15, e.g. image/video generation) are queued for Developer Approval to protect APIs from abuse
      console.log(`[AIRouter] Queuing premium task (${resolvedType}) for developer approval`);
      const docRef = await adminDb.collection("pending_ai_requests").add({
        userId,
        task,
        type: resolvedType,
        inputImage: inputImage || null,
        cost: estimatedCost,
        status: 'pending',
        createdAt: new Date(),
        modelUsed: resolvedType === 'video' || resolvedType === 'image_to_video' ? 'MiniMax Video-01' : 'Flux Schnell'
      });

      return res.json({ 
        pending: true, 
        requestId: docRef.id,
        message: "This super high-resolution generation is queued for developer approval."
      });

    } catch (e: any) {
      console.error("[AIRouter] Endpoint Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Professional Endpoint API v1 Access
  app.post("/api/v1/ai", async (req: any, res: any) => {
    try {
      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      const apiKeyHeader = req.headers["x-api-key"] as string;
      if (!apiKeyHeader) {
        return res.status(401).json({ error: "Missing 'x-api-key' authorization header." });
      }

      // Verify the API Key
      const keySnap = await adminDb.collection("api_keys").where("apiKey", "==", apiKeyHeader).limit(1).get();
      if (keySnap.empty) {
        return res.status(401).json({ error: "The provided x-api-key header is invalid or inactive." });
      }

      const keyData = keySnap.docs[0].data();
      const userId = keyData.userId;

      const userRef = adminDb.collection("users").doc(userId);
      let userSnap = await userRef.get();
      if (!userSnap.exists) {
        console.log(`[AIRouter API V1] User profile ${userId} linked to API Key not found in adminDb. Auto-bootstrapping profile...`);
        await userRef.set({
          uid: userId,
          email: userId.includes('@') ? userId : "api_key_explorer@sanatani.dharm",
          displayName: userId.includes('@') ? userId.split('@')[0] : "API Core Builder",
          credits: 20,
          role: "user",
          createdAt: new Date().toISOString()
        });
        userSnap = await userRef.get();
      }

      const userData = userSnap.data()!;
      const credits = userData.credits !== undefined ? userData.credits : 20;

      const { task, type = 'text', inputImage = null } = req.body;
      if (!task) {
        return res.status(400).json({ error: "The 'task' parameter is required in request body prompt." });
      }

      let resolvedType = type;
      if (type === 'auto') {
        const t = task.toLowerCase();
        if (t.includes('video') || t.includes('motion') || t.includes('movie')) resolvedType = 'video';
        else if (t.includes('image') || t.includes('photo') || t.includes('picture')) resolvedType = 'image';
        else resolvedType = 'text';
      }

      const estimatedCost = getEstimatedCost(resolvedType);
      if (credits < estimatedCost) {
        return res.status(403).json({ error: "Quota balance exceeded for the API license." });
      }

      // Premium tasks are queued similarly to protect developer from rapid drains
      if (estimatedCost >= 15) {
        const docRef = await adminDb.collection("pending_ai_requests").add({
          userId,
          task,
          type: resolvedType,
          inputImage: inputImage || null,
          cost: estimatedCost,
          status: 'pending',
          createdAt: new Date(),
          modelUsed: resolvedType === 'video' || resolvedType === 'image_to_video' ? 'MiniMax Video-01' : 'Flux Schnell'
        });

        return res.json({ 
          pending: true, 
          status: "pending_approval",
          requestId: docRef.id,
          message: "Task is pending budget validation from admin console."
        });
      }

      // Free / budget tasks run instantly
      const aiResponse = await generateAIResult(task, resolvedType, inputImage);
      const newCredits = Math.max(0, credits - estimatedCost);
      await userRef.update({ credits: newCredits });

      await adminDb.collection("usage").add({
        userId,
        task,
        type: resolvedType,
        cost: estimatedCost,
        modelUsed: aiResponse.modelUsed,
        result: aiResponse.result,
        timestamp: new Date()
      });

      return res.json({
        success: true,
        type: resolvedType,
        result: aiResponse.result,
        modelUsed: aiResponse.modelUsed,
        cost: estimatedCost,
        remainingCredits: newCredits
      });

    } catch (e: any) {
      console.error("[AIRouter v1 API error]:", e);
      res.status(500).json({ error: e.message });
    }
  });
}
