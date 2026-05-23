import express from "express";
import * as DB from "./db";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { robustSendMail } from "./email";
import { generateAIResult } from "./ai-router-logic";

export function setupAdminRoutes(app: express.Application, newsLocks: Map<string, number>) {
  app.get("/api/admin/test-firestore", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const testDoc = { test: true, timestamp: new Date() };
      let results: any = {};
      
      // Try Admin SDK
      const admin = await import("firebase-admin");
      try {
        const adminDb = DB.state.adminDb;
        if (adminDb) {
          await adminDb.collection("_health_check").doc("admin_test").set(testDoc);
          results.admin = "success";
        } else {
          results.admin = "not_initialized";
        }
      } catch (e: any) {
        results.admin = "error: " + e.message;
      }

      // Try Default Admin
      try {
        await admin.firestore().collection("_health_check").doc("default_test").set(testDoc);
        results.admin_default = "success";
      } catch (e: any) {
        results.admin_default = "error: " + e.message;
      }

      // Try Client SDK
      try {
        const { db } = await import("./db");
        const { doc, setDoc } = await import("firebase/firestore");
        if (db) {
          await setDoc(doc(db as any, "_health_check", "client_test"), testDoc);
          results.client = "success";
        } else {
          results.client = "not_initialized";
        }
      } catch (e: any) {
        results.client = "error: " + e.message;
      }

      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/test-gemini", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const response = await callGeminiWithRetry(apiKey, { model: "gemini-3-flash-preview", contents: "Ping" });
      res.json({ status: "success", text: response.text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/test-email", async (req, res) => {
    const to = req.query.email as string || "okbgmi611@gmail.com";
    try {
      await robustSendMail({
        from: '"Barnali AI Test" <ujirpur.barnia6@gmail.com>',
        to,
        subject: "SMTP Test from Barnia Digital Hub",
        text: "This is a test email to verify SMTP configuration."
      });
      res.json({ status: "success", message: `Test email sent to ${to}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/data/:collection", async (req, res) => {
    try {
      const { collection: colName } = req.params;
      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      const limit = parseInt(req.query.limit as string) || 50;
      
      // Basic security: only allow specific admin collections
      const allowed = [
        'inbound_emails', 'usage', 'pending_ai_requests', 'ai_logs', 
        'users', 'visitor_sessions', 'support_messages', 'telegram_users', 
        'api_keys', 'ride_requests', 'vehicles'
      ];
      if (!allowed.includes(colName)) return res.status(403).json({ error: "Unauthorized collection access" });

      const snap = await adminDb.collection(colName).orderBy(
        colName === 'users' ? 'displayName' : (colName === 'visitor_sessions' ? 'lastSeen' : 'createdAt'), 
        'desc'
      ).limit(limit).get();
      
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(data);
    } catch (e: any) {
      console.error(`[AdminAPI] Error fetching ${req.params.collection}:`, e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/diag", async (req, res) => {
    try {
      const results: any = {
        emailUser: process.env.EMAIL_USER || "ujirpur.barnia6@gmail.com",
        emailPassConfigured: !!(process.env.EMAIL_PASS || process.env.SMTP_PASS),
        adminDbInitialized: false,
        identityToolkitStatus: "unknown"
      };

      const adminDb = DB.state.adminDb;
      results.adminDbInitialized = !!adminDb;

      // Check Identity Toolkit status if possible
      const admin = await import("firebase-admin");
      try {
        await admin.auth().getUserByEmail("test@example.com");
        results.identityToolkitStatus = "enabled";
      } catch (e: any) {
        if (e.code === 'auth/project-not-found' || e.message.includes('identitytoolkit.googleapis.com')) {
          results.identityToolkitStatus = "disabled";
        } else {
          results.identityToolkitStatus = "error: " + e.code;
        }
      }

      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/approve-ai", async (req, res) => {
    try {
      const { requestId, adminId } = req.body;
      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      const requestRef = adminDb.collection("pending_ai_requests").doc(requestId);
      const snap = await requestRef.get();
      
      if (!snap.exists) return res.status(404).json({ error: "Request not found" });
      
      const requestData = snap.data()!;
      if (requestData.status !== 'pending') {
         return res.status(400).json({ error: "Request is already processed" });
      }

      console.log(`[AdminAPI] Approved AI request ${requestId} for user ${requestData.userId}. Executing generation...`);
      
      // Execute the actual AI generation run
      const aiResponse = await generateAIResult(requestData.task, requestData.type, requestData.inputImage || null);
      
      // 1. Deduct user credits
      const userRef = adminDb.collection("users").doc(requestData.userId);
      const userSnap = await userRef.get();
      let remainingCredits = 0;
      if (userSnap.exists) {
        const uData = userSnap.data()!;
        const currentCredits = uData.credits !== undefined ? uData.credits : 10;
        remainingCredits = Math.max(0, currentCredits - requestData.cost);
        await userRef.update({ credits: remainingCredits });
      }

      // 2. Add to actual usage collection for billing & logs
      await adminDb.collection("usage").add({
        userId: requestData.userId,
        task: requestData.task,
        type: requestData.type,
        cost: requestData.cost,
        modelUsed: aiResponse.modelUsed,
        result: aiResponse.result,
        timestamp: new Date()
      });

      // 3. Mark the pending request doc as completed and store the output
      await requestRef.update({ 
        status: 'completed',
        result: aiResponse.result,
        modelUsed: aiResponse.modelUsed,
        approvedBy: adminId,
        approvedAt: new Date()
      });

      res.json({ success: true, message: "AI Request approved and processed successfully", result: aiResponse.result });
    } catch (e: any) {
      console.error("[AdminAPI] Error during AI approval task:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/deny-ai", async (req, res) => {
    try {
      const { requestId, adminId } = req.body;
      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      await adminDb.collection("pending_ai_requests").doc(requestId).update({ 
        status: 'denied',
        deniedBy: adminId,
        deniedAt: new Date()
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/adjust-credits", async (req, res) => {
    try {
      const { targetId, amount, type, collection: colName } = req.body;
      const adminDb = DB.state.adminDb;
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      if (!targetId || amount === undefined || !colName) {
        return res.status(400).json({ error: "Missing required fields: targetId, amount, and collection are required." });
      }

      const allowedCollections = ['users', 'telegram_users'];
      if (!allowedCollections.includes(colName)) {
        return res.status(400).json({ error: "Invalid target collection." });
      }

      const docRef = adminDb.collection(colName).doc(targetId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: `User not found in ${colName}` });
      }

      const currentData = snap.data()!;
      const currentCredits = currentData.credits !== undefined ? Number(currentData.credits) : 0;
      const changeAmount = Number(amount);
      
      let newCredits = currentCredits;
      if (type === 'add') {
        newCredits = currentCredits + changeAmount;
      } else if (type === 'set') {
        newCredits = changeAmount;
      } else if (type === 'deduct') {
        newCredits = Math.max(0, currentCredits - changeAmount);
      }

      await docRef.update({ 
        credits: newCredits, 
        updatedAt: colName === 'telegram_users' ? new Date().toISOString() : new Date()
      });

      res.json({ success: true, newCredits });
    } catch (e: any) {
      console.error("[AdminAPI] Error adjusting credits:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/verify-smtp", async (req, res) => {
    try {
      const results = {
        config: {
          user: process.env.EMAIL_USER || "ujirpur.barnia6@gmail.com",
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: process.env.SMTP_PORT || 587
        },
        connection: "pending"
      };
      
      // Try to send a silent self-test email
      await robustSendMail({
        from: '"Barnali Hub System" <ujirpur.barnia6@gmail.com>',
        to: "ujirpur.barnia6@gmail.com",
        subject: "SMTP Self-Test",
        text: "Checking SMTP health."
      });
      
      results.connection = "success";
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ status: "error", error: e.message });
    }
  });

  app.get("/api/debug-news", (req, res) => {
    res.json({ message: "Debug info", locksCount: newsLocks.size });
  });
}
