import express, { Router } from "express";
import { z } from "zod";
import { authSchemas, authStore } from "./lineage-auth.js";
import { appConfig } from "./lineage-config.js";
import { robustSendMail, getGrandEmailHtml } from "./email.js";
import { 
  inviteCreateSchema, 
  lineagePersonInputSchema, 
  lineageStore, 
  lineageTreeCreateSchema, 
  lineageTreeInputSchema 
} from "./lineage-core.js";

export const lineageRouter = Router();

function routeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0];
  if (!value) throw new Error("Missing route id.");
  return value;
}

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

type AuthenticatedRequest = express.Request & {
  auth: NonNullable<ReturnType<typeof authStore.authenticate>>;
};

function tokenFromRequest(req: express.Request) {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = authStore.authenticate(tokenFromRequest(req));
  if (!auth) {
    res.status(401).json({ error: "Please sign in again." });
    return;
  }
  (req as AuthenticatedRequest).auth = auth;
  next();
}

// ---------------- AUTH ENDPOINTS ----------------

lineageRouter.post("/auth/request-code", asyncRoute(async (req, res) => {
  const parsed = authSchemas.email.parse(req.body ?? {});
  const result = authStore.requestAccessCode(parsed.email, parsed.name);
  
  // Send SMTP email in the background so the user gets an instantaneous response
  const senderEmail = (process.env.EMAIL_USER || process.env.SMTP_USER || "ujirpur.barnia6@gmail.com").trim();
  const title = "Digital Vamshavali Code";
  const subtitle = "Secure Access Code for Your Family Lineage Profile";
  const contentHtml = `
    <div style="font-family: inherit; line-height: 1.6; color: #27272a;">
      <p style="font-size: 16px; margin-bottom: 24px;">Hello,</p>
      <p style="font-size: 15px; margin-bottom: 24px;">You have requested a secure verification code to access the <strong>Vanshavali</strong> genealogy archiving system.</p>
      <div style="background-color: #FFF5EC; border: 1px solid rgba(245, 142, 39, 0.25); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #EA580C; letter-spacing: 6px;">${result.code}</span>
        <p style="font-size: 13px; color: #71717a; margin: 12px 0 0 0;">This temporary code is valid for next ${result.expiresInMinutes} minutes.</p>
      </div>
      <p style="font-size: 14px; color: #71717a; margin-bottom: 32px;">If you did not request this code, please secure your account immediately or contact support.</p>
      <div style="border-t: 1px solid rgba(245, 142, 39, 0.15); padding-top: 16px; font-size: 12px; color: #a1a1aa; text-align: center;">
        <p>© ${new Date().getFullYear()} Barnia Digital Hub. All rights reserved.</p>
      </div>
    </div>
  `;

  const mailHtml = getGrandEmailHtml(title, subtitle, contentHtml);

  robustSendMail({
    from: `"Barnia Digital Hub" <${senderEmail}>`,
    to: result.account.email,
    subject: `Your OTP for Vanshavali Lineage: ${result.code}`,
    html: mailHtml
  }).catch((err) => {
    console.error(`[Lineage Auth] Background send code email failed for ${result.account.email}:`, err);
  });

  const isDeveloper = result.account.email.toLowerCase() === "okbgmi611@gmail.com" || result.account.email.toLowerCase() === "ujirpur.barnia6@gmail.com";
  const showCode = !appConfig.isProduction || isDeveloper;

  res.json({
    email: result.account.email,
    expiresInMinutes: result.expiresInMinutes,
    developmentCode: showCode ? result.code : undefined
  });
}));

lineageRouter.post("/auth/verify-code", asyncRoute(async (req, res) => {
  const parsed = authSchemas.verifyCode.parse(req.body ?? {});
  const session = authStore.verifyAccessCode(parsed.email, parsed.code);
  res.json({ ...session, state: lineageStore.stateForAccount(session.account.id) });
}));

lineageRouter.post("/auth/register-password", asyncRoute(async (req, res) => {
  const parsed = authSchemas.registerPassword.parse(req.body ?? {});
  const session = authStore.registerPassword(parsed.email, parsed.name, parsed.password);
  res.json({ ...session, state: lineageStore.stateForAccount(session.account.id) });
}));

lineageRouter.post("/auth/login-password", asyncRoute(async (req, res) => {
  const parsed = authSchemas.loginPassword.parse(req.body ?? {});
  const session = authStore.loginPassword(parsed.email, parsed.password);
  res.json({ ...session, state: lineageStore.stateForAccount(session.account.id) });
}));

lineageRouter.get("/auth/me", requireAuth, (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  res.json({
    account: auth.account,
    maxTreesPerAccount: appConfig.maxTreesPerAccount,
    state: lineageStore.stateForAccount(auth.account.id)
  });
});

lineageRouter.post("/auth/change-password", requireAuth, asyncRoute(async (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  const parsed = authSchemas.changePassword.parse(req.body ?? {});
  res.json({ account: authStore.changePassword(auth.account.id, parsed.currentPassword, parsed.newPassword) });
}));

lineageRouter.post("/invites/accept", requireAuth, asyncRoute(async (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  const token = z.string().min(20).parse(req.body?.token ?? "");
  res.json(lineageStore.acceptInvite(auth.account.id, auth.account.email, token));
}));

// ---------------- LINEAGE ENDPOINTS ----------------

lineageRouter.get("/lineage/state", requireAuth, (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  const treeId = typeof req.query.treeId === "string" ? req.query.treeId : undefined;
  res.json(lineageStore.stateForAccount(auth.account.id, treeId));
});

lineageRouter.post(
  "/lineage/trees",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const parsed = lineageTreeCreateSchema.parse(req.body ?? {});
    res.json(lineageStore.createTree(parsed, auth.account.id, appConfig.maxTreesPerAccount));
  })
);

lineageRouter.patch(
  "/lineage/trees/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const treeId = routeId(req.params.id);
    lineageStore.assertTreeEditAccess(auth.account.id, treeId);
    const parsed = lineageTreeInputSchema.parse(req.body ?? {});
    lineageStore.updateTree(treeId, parsed);
    res.json(lineageStore.stateForAccount(auth.account.id, treeId));
  })
);

lineageRouter.post(
  "/lineage/people",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const parsed = lineagePersonInputSchema.parse(req.body ?? {});
    if (!parsed.treeId) {
      res.status(400).json({ error: "treeId is required." });
      return;
    }
    lineageStore.assertTreeEditAccess(auth.account.id, parsed.treeId);
    const person = lineageStore.createPerson(parsed);
    res.json({ person, state: lineageStore.stateForAccount(auth.account.id, person.treeId) });
  })
);

lineageRouter.patch(
  "/lineage/people/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const currentTreeId = lineageStore.personTreeId(routeId(req.params.id));
    lineageStore.assertTreeEditAccess(auth.account.id, currentTreeId);
    const person = lineageStore.updatePerson(routeId(req.params.id), req.body ?? {});
    res.json({ person, state: lineageStore.stateForAccount(auth.account.id, person.treeId) });
  })
);

lineageRouter.delete(
  "/lineage/people/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const treeId = lineageStore.personTreeId(routeId(req.params.id));
    lineageStore.assertTreeEditAccess(auth.account.id, treeId);
    lineageStore.deletePerson(routeId(req.params.id));
    res.json(lineageStore.stateForAccount(auth.account.id, treeId));
  })
);

lineageRouter.post(
  "/lineage/spouses",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const treeId = String(req.body?.treeId ?? "");
    const personAId = String(req.body?.personAId ?? "");
    const personBId = String(req.body?.personBId ?? "");
    if (!treeId || !personAId || !personBId) {
      res.status(400).json({ error: "treeId, personAId, and personBId are required." });
      return;
    }
    lineageStore.assertTreeEditAccess(auth.account.id, treeId);
    lineageStore.linkSpouses(treeId, personAId, personBId, String(req.body?.status ?? "married"));
    res.json(lineageStore.stateForAccount(auth.account.id, treeId));
  })
);

lineageRouter.post(
  "/lineage/import/preview",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const treeId = String(req.body?.treeId ?? "");
    const csv = String(req.body?.csv ?? "");
    if (!treeId || !csv.trim()) {
      res.status(400).json({ error: "treeId and csv are required." });
      return;
    }
    lineageStore.assertTreeAccess(auth.account.id, treeId);
    res.json(lineageStore.csvPreview(treeId, csv));
  })
);

lineageRouter.post(
  "/lineage/import/commit",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const treeId = String(req.body?.treeId ?? "");
    const csv = String(req.body?.csv ?? "");
    if (!treeId || !csv.trim()) {
      res.status(400).json({ error: "treeId and csv are required." });
      return;
    }
    lineageStore.assertTreeEditAccess(auth.account.id, treeId);
    lineageStore.commitCsv(treeId, csv);
    res.json(lineageStore.stateForAccount(auth.account.id, treeId));
  })
);

lineageRouter.post(
  "/lineage/telegram",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const treeId = String(req.body?.treeId ?? "");
    const rawText = String(req.body?.rawText ?? "");
    const sourceType = req.body?.sourceType === "telegram_voice" ? "telegram_voice" : "telegram_text";
    if (!treeId || !rawText.trim()) {
      res.status(400).json({ error: "treeId and rawText are required." });
      return;
    }
    lineageStore.assertTreeEditAccess(auth.account.id, treeId);
    res.json({ proposal: lineageStore.createTelegramProposal(treeId, rawText, sourceType), state: lineageStore.stateForAccount(auth.account.id, treeId) });
  })
);

lineageRouter.post(
  "/lineage/proposals/:id/commit",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const proposalId = routeId(req.params.id);
    const treeId = lineageStore.proposalTreeId(proposalId);
    lineageStore.assertTreeEditAccess(auth.account.id, treeId);
    lineageStore.commitProposal(proposalId);
    res.json(lineageStore.stateForAccount(auth.account.id, treeId));
  })
);

lineageRouter.post(
  "/lineage/proposals/:id/dismiss",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const proposalId = routeId(req.params.id);
    const treeId = lineageStore.proposalTreeId(proposalId);
    lineageStore.assertTreeEditAccess(auth.account.id, treeId);
    lineageStore.dismissProposal(proposalId);
    res.json(lineageStore.stateForAccount(auth.account.id, treeId));
  })
);

lineageRouter.get(
  "/lineage/trees/:id/access",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    res.json(lineageStore.listTreeAccess(auth.account.id, routeId(req.params.id)));
  })
);

lineageRouter.post(
  "/lineage/trees/:id/invites",
  requireAuth,
  asyncRoute(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const parsed = inviteCreateSchema.parse(req.body ?? {});
    const origin = appConfig.appOrigin ?? `${req.protocol}://${req.get("host")}`;
    res.json(lineageStore.createInvite(auth.account.id, routeId(req.params.id), parsed, origin));
  })
);

lineageRouter.get(
  "/lineage/public/trees/:id",
  asyncRoute(async (req, res) => {
    const treeId = routeId(req.params.id);
    res.json(lineageStore.publicState(treeId));
  })
);

// Global Error Handler for the Lineage Router
lineageRouter.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Lineage Router Error]:", error);
  const statusCode = typeof (error as Error & { statusCode?: unknown }).statusCode === "number"
    ? (error as Error & { statusCode: number }).statusCode
    : error instanceof z.ZodError
      ? 400
      : 500;
  res.status(statusCode).json({ error: error.message });
});
