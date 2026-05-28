import * as DB from "./db";
import crypto from "crypto";
import { generateAIResult } from "./ai-router-logic";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

function getEstimatedCost(type: string, model?: string): number {
  if (type === 'text') return 1;
  if (type === 'image' || type === 'image_to_image') {
    if (model && (model === 'image-01' || model.includes('minimax'))) {
      return 15;
    }
    return 10;
  }
  if (type === 'video' || type === 'image_to_video') {
    if (model && (model === 'minimax-hailuo-02-10s' || model.includes('10s'))) {
      return 85;
    }
    return 65;
  }
  return 1;
}

async function resolveUserRefAndData(adminDb: any, admin: any, userId: string) {
  let finalDocId = userId;

  // If it's a UID (doesn't contain @)
  if (!userId.includes('@')) {
    // Try resolving via Firebase Auth Admin SDK
    if (admin && DB.state.isAdminSDKActive) {
      try {
        const authUser = await admin.auth().getUser(userId);
        if (authUser.email) {
          finalDocId = authUser.email.toLowerCase().trim();
        }
      } catch (err: any) {
        console.warn(`[ResolveUser] Admin Auth lookup failed for UID ${userId}:`, err.message);
      }
    }

    // If still not resolved to email, try checking Firestore users collection for a matching uid
    if (finalDocId === userId && adminDb) {
      try {
        const usersSnap = await adminDb.collection("users").where("uid", "==", userId).limit(1).get();
        if (!usersSnap.empty) {
          const matchedUser = usersSnap.docs[0];
          const emailField = matchedUser.data().email;
          if (emailField) {
            finalDocId = emailField.toLowerCase().trim();
          } else {
            finalDocId = matchedUser.id;
          }
        }
      } catch (err: any) {
        console.warn(`[ResolveUser] Firestore users query failed for UID ${userId}:`, err.message);
      }
    }
  } else {
    // It is an email
    finalDocId = userId.toLowerCase().trim();
  }

  const userRef = adminDb.collection("users").doc(finalDocId);
  return { userRef, finalDocId };
}

export function setupAIRouter(app: any, _db: any, _adminDb: any, admin: any) {
  // Provision API Key for professional developers / other hubs
  app.post("/api/ai/key", async (req: any, res: any) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      const { finalDocId } = await resolveUserRefAndData(adminDb, admin, userId);

      // Generate a highly secure random API key prefix with x-bar
      const apiKey = "x-bar-" + crypto.randomBytes(16).toString("hex");

      await adminDb.collection("api_keys").doc(finalDocId).set({
        userId: finalDocId,
        apiKey,
        createdAt: new Date()
      });

      if (DB.state.db) {
        try {
          await setDoc(doc(DB.state.db, "api_keys", finalDocId), {
            userId: finalDocId,
            apiKey,
            serverKey: 'barnia-system-2024-v1',
            createdAt: serverTimestamp()
          });
        } catch (e: any) {
          console.warn("[AIRouter] Sync API key to client DB failed:", e.message);
        }
      }

      res.json({ apiKey });
    } catch (e: any) {
      console.error("[AIRouter] Key generation error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Main UI router handler (runs fast on budget tasks, queues premium tasks)
  app.post("/api/ai", async (req: any, res: any) => {
    try {
      const { userId, task, type, inputImage, approved, model } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      // Grab resolved user context & reference
      const { userRef, finalDocId } = await resolveUserRefAndData(adminDb, admin, userId);

      // --- CRITICAL CLOUD DUAL SYNC ---
      // Prioritize syncing state from standard web client db (if active) so user accounts and credits matches
      if (DB.state.db) {
        try {
          const clientSnap = await getDoc(doc(DB.state.db, "users", finalDocId));
          if (clientSnap.exists()) {
            const clientData = clientSnap.data();
            await userRef.set({
              uid: clientData.uid || finalDocId,
              email: clientData.email || finalDocId,
              displayName: clientData.displayName || "AI Explorer",
              credits: clientData.credits !== undefined ? clientData.credits : 10,
              role: clientData.role || "user",
              createdAt: clientData.createdAt ? (clientData.createdAt.toDate ? clientData.createdAt.toDate().toISOString() : clientData.createdAt) : new Date().toISOString()
            });
          }
        } catch (e: any) {
          console.warn("[AIRouter] Dynamic client-to-admin sync skipped:", e.message);
        }
      }

      let userSnap = await userRef.get();
      if (!userSnap.exists) {
        console.log(`[AIRouter] User profile ${finalDocId} not found in adminDb. Auto-bootstrapping default profile.`);
        const isDeveloper = finalDocId === "okbgmi611@gmail.com" || finalDocId === "ujirpur.barnia6@gmail.com" || finalDocId.includes("admin") || finalDocId.includes("developer");
        const baseUserData = {
          uid: finalDocId.includes('@') ? userId : finalDocId,
          email: finalDocId.includes('@') ? finalDocId : "explorer@sanatani.dharm",
          displayName: finalDocId.includes('@') ? finalDocId.split('@')[0] : "AI Explorer",
          credits: isDeveloper ? 1000 : 10,
          role: isDeveloper ? "admin" : "user",
          createdAt: new Date().toISOString()
        };

        await userRef.set(baseUserData);

        if (DB.state.db) {
          try {
            await setDoc(doc(DB.state.db, "users", finalDocId), {
              ...baseUserData,
              serverKey: 'barnia-system-2024-v1',
              createdAt: serverTimestamp()
            });
          } catch (e: any) {
            console.warn("[AIRouter] Auto-bootstrap to client DB skipped:", e.message);
          }
        }

        userSnap = await userRef.get();
      }

      let userData = userSnap.data()!;
      const isDev = finalDocId === "okbgmi611@gmail.com" || finalDocId === "ujirpur.barnia6@gmail.com";
      if (isDev && (userData.credits !== 1000 || userData.role !== "admin")) {
        await userRef.update({ credits: 1000, role: "admin" });
        if (DB.state.db) {
          try {
            await updateDoc(doc(DB.state.db, "users", finalDocId), { 
              credits: 1000, 
              role: "admin",
              serverKey: 'barnia-system-2024-v1'
            });
          } catch (e: any) {}
        }
        userSnap = await userRef.get();
        userData = userSnap.data()!;
      }

      const credits = userData.credits !== undefined ? userData.credits : 10;

      if (credits <= 0) {
        return res.status(403).json({ error: "Your credit balance is 0. Please recharge your credits to use AI Router services." });
      }

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

      const estimatedCost = getEstimatedCost(resolvedType, model);
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
        console.log(`[AIRouter] Running budget task (${resolvedType}) instantly for user ${finalDocId}`);
        const aiResponse = await generateAIResult(task, resolvedType, inputImage || null, model);
        
        // Deduct credit
        const newCredits = Math.max(0, credits - estimatedCost);
        await userRef.update({ credits: newCredits });

        // Save log to usage collection
        await adminDb.collection("usage").add({
          userId: finalDocId,
          task,
          type: resolvedType,
          cost: estimatedCost,
          modelUsed: aiResponse.modelUsed,
          result: aiResponse.result,
          timestamp: new Date()
        });

        // Sync with standard client-side DB
        if (DB.state.db) {
          try {
            await updateDoc(doc(DB.state.db, "users", finalDocId), { 
              credits: newCredits,
              serverKey: 'barnia-system-2024-v1'
            });
            await addDoc(collection(DB.state.db, "usage"), {
              userId: finalDocId,
              task,
              type: resolvedType,
              cost: estimatedCost,
              modelUsed: aiResponse.modelUsed,
              result: aiResponse.result,
              serverKey: 'barnia-system-2024-v1',
              timestamp: serverTimestamp()
            });
            console.log(`[AIRouter] Budget task credits and logs successfully synced to client DB`);
          } catch (e: any) {
            console.warn("[AIRouter] Failed syncing budget run to client DB:", e.message);
          }
        }

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
      console.log(`[AIRouter] Queuing premium task (${resolvedType}) with model ${model || "default"} for developer approval`);
      const pendingData = {
        userId: finalDocId,
        userEmail: finalDocId,
        task,
        type: resolvedType,
        inputImage: inputImage || null,
        cost: estimatedCost,
        status: 'pending',
        createdAt: new Date(),
        modelUsed: model || (resolvedType === 'video' || resolvedType === 'image_to_video' ? 'MiniMax Video-01' : 'Flux Schnell'),
        model: model || null
      };

      const docRef = await adminDb.collection("pending_ai_requests").add(pendingData);

      // Sync the pending document into Standard client-side DB with the EXACT SAME ID
      if (DB.state.db) {
        try {
          await setDoc(doc(DB.state.db, "pending_ai_requests", docRef.id), {
            ...pendingData,
            serverKey: 'barnia-system-2024-v1',
            createdAt: serverTimestamp()
          });
          console.log(`[AIRouter] Queued request synchronized to standard client DB: ${docRef.id}`);
        } catch (e: any) {
          console.warn("[AIRouter] Failed to synchronize queued request to standard client DB:", e.message);
        }
      }

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

      // Unify the userId
      const { userRef, finalDocId } = await resolveUserRefAndData(adminDb, admin, userId);
      let userSnap = await userRef.get();
      if (!userSnap.exists) {
        console.log(`[AIRouter API V1] User profile ${finalDocId} linked to API Key not found in adminDb. Auto-bootstrapping profile...`);
        await userRef.set({
          uid: finalDocId.includes('@') ? userId : finalDocId,
          email: finalDocId.includes('@') ? finalDocId : "api_key_explorer@sanatani.dharm",
          displayName: finalDocId.includes('@') ? finalDocId.split('@')[0] : "API Core Builder",
          credits: 10,
          role: "user",
          createdAt: new Date().toISOString()
        });
        userSnap = await userRef.get();
      }

      const userData = userSnap.data()!;
      const credits = userData.credits !== undefined ? userData.credits : 10;

      if (credits <= 0) {
        return res.status(403).json({ error: "Your credit balance is 0. Please recharge your credits to continue." });
      }

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
        const pendingData = {
          userId: finalDocId,
          userEmail: finalDocId,
          task,
          type: resolvedType,
          inputImage: inputImage || null,
          cost: estimatedCost,
          status: 'pending',
          createdAt: new Date(),
          modelUsed: resolvedType === 'video' || resolvedType === 'image_to_video' ? 'MiniMax Video-01' : 'Flux Schnell'
        };

        const docRef = await adminDb.collection("pending_ai_requests").add(pendingData);

        // Sync with standard client-side DB
        if (DB.state.db) {
          try {
            await setDoc(doc(DB.state.db, "pending_ai_requests", docRef.id), {
              ...pendingData,
              serverKey: 'barnia-system-2024-v1',
              createdAt: serverTimestamp()
            });
            console.log(`[AIRouter API V1] Synchronized queued request to standard client DB: ${docRef.id}`);
          } catch (e: any) {
            console.warn("[AIRouter API V1] Failed to sync to standard client DB:", e.message);
          }
        }

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
        userId: finalDocId,
        task,
        type: resolvedType,
        cost: estimatedCost,
        modelUsed: aiResponse.modelUsed,
        result: aiResponse.result,
        timestamp: new Date()
      });

      // Sync to standard client-side DB
      if (DB.state.db) {
        try {
          await updateDoc(doc(DB.state.db, "users", finalDocId), { 
            credits: newCredits,
            serverKey: 'barnia-system-2024-v1'
          });
          await addDoc(collection(DB.state.db, "usage"), {
            userId: finalDocId,
            task,
            type: resolvedType,
            cost: estimatedCost,
            modelUsed: aiResponse.modelUsed,
            result: aiResponse.result,
            serverKey: 'barnia-system-2024-v1',
            timestamp: serverTimestamp()
          });
        } catch (e: any) {
          console.warn("[AIRouter API V1] Standard client DB sync missed during direct run:", e.message);
        }
      }

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
