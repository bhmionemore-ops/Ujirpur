import express from "express";
import { getGeminiApiKey, callGeminiWithRetry } from "./gemini";
import { robustSendMail } from "./email";

export function setupAdminRoutes(app: express.Application, newsLocks: Map<string, number>) {
  app.get("/api/admin/test-firestore", async (req, res) => {
    try {
      const apiKey = await getGeminiApiKey();
      const testDoc = { test: true, timestamp: new Date() };
      let results: any = {};
      
      // Try Admin SDK
      const admin = await import("firebase-admin");
      try {
        const { adminDb } = await import("./db");
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
      const { adminDb } = await import("./db");
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

      const { adminDb } = await import("./db");
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
      const { adminDb } = await import("./db");
      if (!adminDb) return res.status(500).json({ error: "Admin DB not initialized" });

      const requestRef = adminDb.collection("pending_ai_requests").doc(requestId);
      const snap = await requestRef.get();
      
      if (!snap.exists) return res.status(404).json({ error: "Request not found" });
      
      const requestData = snap.data()!;
      
      // Mark as approved in DB
      await requestRef.update({ 
        status: 'completed',
        approvedBy: adminId,
        approvedAt: new Date()
      });

      // Here we would normally trigger the actual AI worker
      // For now we just return success
      res.json({ success: true, message: "AI Request approved and processed" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/deny-ai", async (req, res) => {
    try {
      const { requestId, adminId } = req.body;
      const { adminDb } = await import("./db");
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
