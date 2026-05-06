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

3. **Email System:**
   - SMTP is configured to use **Port 587** with **IPv4 forced** (`family: 4`) to ensure compatibility with production/cloud environments.
   - Welcome emails and test endpoints are verified.

## General Rules
- Always prioritize production stability for network-dependent features (Email, External APIs).
- Maintain the current SMTP configuration (Port 587, family: 4) unless a connection failure is explicitly reported.
