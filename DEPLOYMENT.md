# Deployment Guide for Render

This project is optimized for deployment on **Render.com** (or similar platforms like Cloud Run).

## 1. Environment Variables
Add the following secrets in the Render Dashboard (Environment Settings):

| Key | Description |
|-----|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | The full JSON content of your Firebase Service Account Key. |
| `OPENROUTER_API_KEY` | API Key from [OpenRouter](https://openrouter.ai/). |
| `DASHSCOPE_API_KEY` | API Key from [Alibaba Cloud DashScope](https://dashscope.console.aliyun.com/). |
| `FLUX_API_KEY` | API Key for Flux (e.g., from Together AI). |
| `VIDEO_API_KEY` | API Key for Video services (optional). |
| `GEMINI_API_KEY` | Your Google Gemini API Key. |
| `TELEGRAM_BOT_TOKEN` | Token for the Barnali bot. |
| `SMTP_USER` / `SMTP_PASS` | For the lineage email system. |

## 2. Global IPv4 Configuration
The server is configured to force IPv4 (`family: 4`) for outgoing SMTP and API connections. This is critical because Render/Cloud environments often have unstable IPv6 routing for certain legacy APIs.

## 3. Build & Start Commands
- **Build Command:** `npm run build`
- **Start Command:** `npm run start` (Ensure `start` script in `package.json` is `node server.ts` or the compiled entry point).

## 4. Port Configuration
The app binds to port `3000` by default. Render will automatically detect this via its reverse proxy.

## 5. Persistence
Since this app uses **Firebase Firestore**, no local disk persistence is required on Render. All user credits and usage logs are stored safely in the cloud.
