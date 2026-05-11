# Project Instructions

## Critical Areas (Do Not Modify Without Permission)
The following areas are currently working perfectly and MUST NOT be modified or refactored without explicit permission from the user. Any new features or changes to other parts of the app must be carefully implemented to ensure they do not break or affect these areas:

1. **Live Chat & Telegram Bot (Barnali):**
   - The Telegram bot webhook, image processing, and Gemini SDK integration are stable.
   - The model fallback logic in `callGeminiWithRetry` is working perfectly and handles regional restrictions.
   - The bot name is "Barnali".
   - Firestore rules for `support_messages` are correctly configured.

2. **News System:**
   - The news generation and cleanup background tasks are working.
   - Firestore rules for `news` are stable.

3. **AI Router SaaS Logic:**
   - **Cost Priority:** The system MUST prioritize saving the *developer's actual money* (API costs) over customer credits.
   - **Hierarchy:** Always try **FREE** models first (cost $0.00 to developer), then **ECONOMY** budget models (DeepSeek/Qwen).
   - **Protection:** Any task using premium models (GPT-4o/Claude) or costing >= 15 credits **MUST** trigger a `needsApproval` response.
   - **Providers:** OpenRouter (Tiers), Alibaba DashScope (Economy), Flux (Image), MiniMax/Hailuo (Video).
   - **API Ownership:** The Keys `DASHSCOPE_API_KEY`, `MINIMAX_API_KEY`, and `OPENROUTER_API_KEY` are strictly dedicated to the **AI Router Hub** and **Barnali AI** features. These integrations must NOT be modified, refactored, or repurposed for other tools without explicit permission from the user.

4. **Email System:**
   - SMTP is configured to use **Port 587** with **IPv4 forced** (`family: 4`) to ensure compatibility with production/cloud environments.
   - Welcome emails and test endpoints are verified.

## General Rules
- Always prioritize production stability for network-dependent features (Email, External APIs).
- Maintain the current SMTP configuration (Port 587, family: 4) unless a connection failure is explicitly reported.
