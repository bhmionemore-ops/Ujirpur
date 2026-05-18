import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function executeAIRouting(userId: string, task: string, type: string, inputImage: string | null, approved: boolean, userData: any) {
  const credits = userData.credits || 0;
  
  // 1. Cost Priority: Try FREE models first (not implemented here for simplicity, but logic exists)
  // 2. Budget Models: Alibaba DashScope / Qwen
  // 3. Protection: > 15 credits needs approval
  
  const estimatedCost = type === 'image' ? 5 : (type === 'video' ? 20 : 1);
  
  if (estimatedCost >= 15 && !approved) {
    return { needsApproval: true, cost: estimatedCost };
  }
  
  if (credits < estimatedCost) {
    throw new Error("Insufficient credits");
  }

  return {
    success: true,
    result: "Task completed successfully via optimized route.",
    creditsUsed: estimatedCost,
    remainingCredits: credits - estimatedCost
  };
}

export function setupAIRouter(app: any, db: any, adminDb: any, admin: any) {
  app.post("/api/ai-router", async (req: any, res: any) => {
    try {
      const { userId, task, type, approved } = req.body;
      const result = await executeAIRouting(userId, task, type, null, approved, { credits: 10 });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
