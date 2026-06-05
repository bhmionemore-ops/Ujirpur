import nodemailer from "nodemailer";
import fetch from "node-fetch";
import dns from "dns";

let transporter: any = null;
let emailUser = "";
let emailPass = "";

export function cleanEnvVar(val: string | undefined): string {
  if (!val) return "";
  let s = val.trim();
  // Remove enclosing double quotes
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).trim();
  }
  // Remove enclosing single quotes
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

emailUser = cleanEnvVar(process.env.EMAIL_USER || process.env.SMTP_USER) || "ujirpur.barnia6@gmail.com";
emailPass = cleanEnvVar(process.env.EMAIL_PASS || process.env.SMTP_PASS);

const smtpIps = ['173.194.77.108', '74.125.133.108', '142.250.150.108', '64.233.184.108'];
const smtpLogs: string[] = [];

export function captureLog(level: string, msg: string, obj?: any) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const entry = `[${level}] ${timestamp} ${msg} ${obj ? (typeof obj === 'string' ? obj : JSON.stringify(obj).substring(0, 150)) : ''}`;
  smtpLogs.push(entry);
  if (smtpLogs.length > 50) smtpLogs.shift();
}

async function resolveHostIpv4(host: string): Promise<string[]> {
  return new Promise((resolve) => {
    dns.resolve4(host, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        console.warn(`[SMTP-Robust] Failed to resolve ${host} to IPv4:`, err?.message);
        resolve([]);
      } else {
        console.log(`[SMTP-Robust] Resolved ${host} IPv4s:`, addresses);
        resolve(addresses);
      }
    });
  });
}

export function getGrandEmailHtml(title: string, subtitle: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;1,400&family=Inter:wght@400;500;600&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fcfbf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fcfbf9; padding: 40px 10px 60px 10px;">
    <tr>
      <td align="center">
        <!-- Wrapper Container with Golden Amber Glow & Shadow -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid #ffedd5; box-shadow: 0 20px 40px -15px rgba(245, 142, 39, 0.12), 0 15px 25px -10px rgba(0, 0, 0, 0.04);">
          
          <!-- Grand Elegant Header Banner -->
          <tr>
            <td style="background-color: #1e1b18; padding: 45px 35px 40px 35px; text-align: center; border-bottom: 5px solid #F58E27;">
              <!-- Mini Verification Badge -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 18px auto;">
                <tr>
                  <td style="background-color: rgba(245, 142, 39, 0.12); padding: 5px 14px; border-radius: 100px; border: 1px solid rgba(245, 142, 39, 0.25); text-align: center;">
                    <span style="color: #F58E27; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; font-family: 'Space Grotesk', -apple-system, sans-serif;">
                      MEMBERSHIP SECURE GATEWAY
                    </span>
                  </td>
                </tr>
              </table>
              
              <!-- Brand Title inside header -->
              <h1 style="color: #ffffff; font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 1.5px; margin: 0; text-transform: uppercase;">
                BARNIA DIGITAL HUB
              </h1>
              
              <!-- Serif Italic Subtitle -->
              <p style="color: #fdba74; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-style: italic; margin: 8px 0 0 0; font-weight: 500; letter-spacing: 0.5px;">
                ${subtitle}
              </p>
            </td>
          </tr>
          
          <!-- Outer padding for core message body -->
          <tr>
            <td style="padding: 45px 40px 35px 40px; color: #1f2937; line-height: 1.75; font-family: 'Inter', -apple-system, sans-serif; font-size: 15px;">
              
              ${contentHtml}

            </td>
          </tr>

          <!-- High-Contrast Support/Action Banner -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-left: 4px solid #ea580c; border-radius: 12px; padding: 22px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 6px 0; color: #7c2d12; font-size: 14px; font-weight: 700; font-family: -apple-system, sans-serif;">
                      Need assistance or have features requests?
                    </h4>
                    <p style="margin: 0; color: #9a3412; font-size: 13px; line-height: 1.5; font-family: -apple-system, sans-serif;">
                      Our system is powered by AI Assistant <strong>Barnali</strong>, working 24/7. Open your dashboard to send instant queries, or ask Barnali for support anywhere.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Grand Footer Section -->
          <tr>
            <td style="background-color: #faf9f6; border-top: 1px solid #f2ece4; padding: 35px 40px; text-align: center; font-family: -apple-system, sans-serif;">
              <!-- Secure encryption stamp -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 4px 12px; background-color: #f1f5f9; border-radius: 6px; font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.5px; text-transform: uppercase;">
                  🔒 SSL SECURE VERIFICATION &bull; RESEND SMTP GATEWAY
                </span>
              </div>
              
              <!-- Legalities & System Details -->
              <p style="margin: 0; color: #78716c; font-size: 11px; line-height: 1.6;">
                This transmission contains sensitive account actions. Distributed under strict digital hub guidelines.<br>
                For further security, please verify the sender domain. Sent via Tokyo Cloud ap-northeast-1 network cluster.<br>
                <span style="color: #a8a29e; display: block; margin-top: 8px;">&copy; 2026 <strong>Barnia Digital Hub</strong>. All rights reserved. barnia.in</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function formatMailToGrandTemplate(body: string, subject: string): string {
  let normalizedBody = body;
  let isOtp = false;
  let otpCode = "";

  // 1. Detect if it is an OTP/Verification email
  if (normalizedBody.includes("Login Verification") || 
      normalizedBody.includes("Verification Code") || 
      normalizedBody.includes("Your OTP") || 
      subject.toLowerCase().includes("otp") || 
      subject.toLowerCase().includes("verification") || 
      subject.toLowerCase().includes("security code")) {
    isOtp = true;
    // Extract OTP code from content
    const otpMatch = normalizedBody.match(/\b(\d{6})\b/);
    if (otpMatch) {
      otpCode = otpMatch[1];
    }
  }

  // 2. Render beautifully styled layouts
  if (isOtp && otpCode) {
    normalizedBody = `
      <div style="text-align: center;">
        <h2 style="color: #111827; font-size: 21px; font-weight: 800; margin: 0 0 10px 0; font-family: 'Space Grotesk', sans-serif;">
          🔒 Security Verification Code
        </h2>
        <p style="color: #4b5563; font-size: 14.5px; margin: 0 0 35px 0; line-height: 1.6;">
          Use the secure One-Time Password (OTP) below to authenticate your action. This code is strictly personal and expires in 10 minutes.
        </p>
        
        <div align="center" style="margin: 30px 0 35px 0;">
          <table border="0" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fffcf5 0%, #ffedd5 100%); border: 2px dashed #F58E27; border-radius: 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(245, 142, 39, 0.1);">
            <tr>
              <td style="padding: 25px 50px;">
                <span style="display: block; color: #c2410c; font-size: 11px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 12px; font-family: 'Space Grotesk', sans-serif;">
                  YOUR SECURE OTP CODE
                </span>
                <span style="display: block; font-family: 'JetBrains Mono', Courier, monospace; font-size: 46px; font-weight: 900; letter-spacing: 12px; color: #ea580c; text-indent: 12px; line-height: 1;">
                  ${otpCode}
                </span>
                <span style="display: block; color: #9a3412; font-size: 11px; font-weight: 600; margin-top: 14px; font-family: -apple-system, sans-serif;">
                  VALID FOR ONE SESSION ONLY &bull; EXPIRED IN 10 MINUTES
                </span>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13.5px; color: #6b7280; text-align: center; margin: 30px 0 0 0; max-width: 450px; display: inline-block; line-height: 1.5;">
          If you did not initiate this authentication request, please ignore this message or report immediately to our security desk.
        </p>
      </div>
    `;
  } else if (subject.toLowerCase().includes("welcome")) {
    // Elegant welcome custom bullet list parsing
    normalizedBody = normalizedBody
      // Remove any existing basic styling headers and footers to keep pure content
      .replace(/<div style="font-family: sans-serif;[\s\S]*?">/, "")
      .replace(/<\/div>\s*$/, "")
      .trim();

    // Replace standard bullets with beautiful star-diamonds
    normalizedBody = normalizedBody.replace(/<li>(.*?)<\/li>/gi, `
      <li style="margin-bottom: 15px; list-style: none; position: relative; padding-left: 24px; color: #374151; font-size: 14.5px;">
        <span style="color: #F58E27; font-size: 16px; font-weight: bold; position: absolute; left: 0; top: -1px; line-height: 1;">✦</span>
        $1
      </li>
    `);

    // Polish ul containers
    normalizedBody = normalizedBody.replace(/<ul style="padding-left: 20px; line-height: 1.6;">/gi, '<ul style="padding: 0; margin: 25px 0; line-height: 1.8;">');
    
    // Smooth container titles
    normalizedBody = normalizedBody.replace(/<h2 style="color: #111827; font-size: 20px; margin-top: 0;">(.*?)<\/h2>/gi, `
      <h2 style="color: #111827; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px; font-family: 'Space Grotesk', sans-serif;">$1</h2>
    `);
  } else {
    // General text layout enhancement
    if (!normalizedBody.includes("<div") && !normalizedBody.includes("<p")) {
      normalizedBody = `<p style="font-size: 15.5px; color: #374151; line-height: 1.8; margin: 0; font-family: 'Inter', sans-serif;">${normalizedBody.replace(/\r?\n/g, "<br>")}</p>`;
    }
  }

  // Determine beautiful custom subtitle based on content type
  let subtitle = "Empowering Our Community, Together";
  if (isOtp) {
    subtitle = "Secure Identity & Transaction Gateway";
  } else if (subject.toLowerCase().includes("welcome")) {
    subtitle = "Welcome to Our Family & Community Portal";
  } else if (subject.toLowerCase().includes("test") || subject.toLowerCase().includes("diagnostic") || subject.toLowerCase().includes("self-test")) {
    subtitle = "SMTP & API Mail Delivery Diagnostics";
  }

  return getGrandEmailHtml(subject, subtitle, normalizedBody);
}

export async function robustSendMail(mailOptions: any) {
  // Update credentials just in case env changed, ensuring quotes are cleanly removed
  emailUser = cleanEnvVar(process.env.EMAIL_USER || process.env.SMTP_USER) || "ujirpur.barnia6@gmail.com";
  emailPass = cleanEnvVar(process.env.EMAIL_PASS || process.env.SMTP_PASS);

  const resendApiKey = cleanEnvVar(process.env.RESEND_API_KEY);
  const brevoApiKey = cleanEnvVar(process.env.BREVO_API_KEY);
  const sendgridApiKey = cleanEnvVar(process.env.SENDGRID_API_KEY);

  // Apply stunning grand layout wrapper to this email
  const originalSubject = mailOptions.subject || "Security Alert";
  const content = mailOptions.html || mailOptions.text || "";
  mailOptions.html = formatMailToGrandTemplate(content, originalSubject);

  // Prevent Gmail SMTP sender address spoofing rejection by rewriting mismatching "from" addresses 
  // to always use the authenticated user email while retaining the display name
  let fromName = "Barnia Digital Hub";
  if (mailOptions.from) {
    const match = mailOptions.from.match(/^"([^"]+)"/);
    if (match) {
      fromName = match[1];
    } else {
      const angleMatch = mailOptions.from.match(/([^<]+)/);
      if (angleMatch) {
         fromName = angleMatch[1].trim();
      }
    }
  }
  mailOptions.from = `"${fromName}" <${emailUser}>`;

  // Extract custom domain dynamically for deliverability with restricted keys and to avoid SPF spoofing warnings
  const appUrl = cleanEnvVar(process.env.APP_URL) || "https://barnia.in";
  const notificationEmail = cleanEnvVar(process.env.NOTIFICATION_EMAIL) || "info@barnia.in";
  let domain = "barnia.in";
  
  if (notificationEmail && notificationEmail.includes('@')) {
    const parts = notificationEmail.split('@');
    if (parts.length === 2) {
      domain = parts[1].trim();
    }
  } else if (appUrl) {
    try {
      const urlObj = new URL(appUrl);
      domain = urlObj.hostname.replace('www.', '');
    } catch (e) {
      const match = appUrl.match(/https?:\/\/([^/]+)/);
      if (match) {
        domain = match[1].replace('www.', '');
      }
    }
  }

  // Ensure domain is NEVER a generic webmail provider or hosting subdomain, defaulting to barnia.in
  const genericDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com", "protonmail.com"];
  if (genericDomains.some(gd => domain.toLowerCase().includes(gd)) || 
      domain.includes("run.app") || 
      domain.includes("render.com") || 
      domain.includes("vercel.app") || 
      domain.includes("localhost") || 
      domain.includes("aistudio-") ||
      !domain.includes(".")) {
    domain = "barnia.in";
  }

  const isGenericEmail = emailUser.includes("gmail.com") || 
                        emailUser.includes("yahoo.com") || 
                        emailUser.includes("outlook.com") || 
                        emailUser.includes("hotmail.com") ||
                        emailUser.includes("aol.com") ||
                        emailUser.includes("icloud.com");

  // --- HTTP GATEWAY FALLBACKS (Port 443 - Bypasses Render Firewalls completely) ---
  if (resendApiKey) {
    // Stage 1: Attempt delivery from verified custom domain (required for restricted API keys)
    const customFrom = `"${fromName}" <no-reply@${domain}>`;
    try {
      console.log(`[SMTP-Robust] Found RESEND_API_KEY. Attempting HTTPS with verified domain: ${customFrom}`);
      captureLog('ROBUST-TRY', `Resend HTTPS: Sending from ${customFrom}`);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: customFrom,
          to: [mailOptions.to],
          subject: mailOptions.subject,
          html: mailOptions.html || mailOptions.text,
          text: mailOptions.text
        })
      });

      const resData: any = await res.json();
      if (res.ok) {
        console.log("[SMTP-Robust] ✅ Success via Resend HTTPS API (Verified Domain):", resData);
        captureLog('ROBUST-SUCCESS', 'Resend HTTPS (Verified Domain)');
        return true;
      } else {
        throw new Error(resData?.message || JSON.stringify(resData));
      }
    } catch (e: any) {
      console.warn(`[SMTP-Robust] Resend with Custom From failed (${e.message}). Attempting sandbox fallback...`);
      captureLog('ROBUST-FAIL', `Resend Custom From: ${e.message}`);

      // Stage 2: Fallback to Resend onboarding sandbox sender if domain is not yet verified or keys differ
      try {
        const sandboxFrom = emailUser.includes("gmail.com") 
          ? `"Barnia Hub" <onboarding@resend.dev>` 
          : mailOptions.from;

        console.log(`[SMTP-Robust] Retrying Resend with Sandbox Sender: ${sandboxFrom}`);
        captureLog('ROBUST-TRY', `Resend HTTPS: Sandbox Retry from ${sandboxFrom}`);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: sandboxFrom,
            to: [mailOptions.to],
            subject: mailOptions.subject,
            html: mailOptions.html || mailOptions.text,
            text: mailOptions.text
          })
        });

        const resData: any = await res.json();
        if (res.ok) {
          console.log("[SMTP-Robust] ✅ Success via Resend HTTPS API (Sandbox):", resData);
          captureLog('ROBUST-SUCCESS', 'Resend HTTPS (Sandbox)');
          return true;
        } else {
          throw new Error(resData?.message || JSON.stringify(resData));
        }
      } catch (sandboxErr: any) {
        console.warn("[SMTP-Robust] ❌ Resend Sandbox delivery failed:", sandboxErr.message);
        captureLog('ROBUST-FAIL', `Resend Sandbox: ${sandboxErr.message}`);
      }
    }
  }

  if (brevoApiKey) {
    try {
      console.log("[SMTP-Robust] Found BREVO_API_KEY. Attempting HTTPS API delivery...");
      captureLog('ROBUST-TRY', 'Brevo HTTPS API');

      const senderEmail = isGenericEmail ? `no-reply@${domain}` : emailUser;
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: fromName, email: senderEmail },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          htmlContent: mailOptions.html || mailOptions.text,
          textContent: mailOptions.text
        })
      });

      const resData: any = await res.json();
      if (res.ok) {
        console.log("[SMTP-Robust] ✅ Success via Brevo HTTPS API");
        captureLog('ROBUST-SUCCESS', 'Brevo HTTPS API');
        return true;
      } else {
        throw new Error(resData?.message || JSON.stringify(resData));
      }
    } catch (e: any) {
      console.warn("[SMTP-Robust] ❌ Brevo HTTPS API delivery failed:", e.message);
      captureLog('ROBUST-FAIL', `Brevo HTTPS: ${e.message}`);
    }
  }

  if (sendgridApiKey) {
    try {
      console.log("[SMTP-Robust] Found SENDGRID_API_KEY. Attempting HTTPS API delivery...");
      captureLog('ROBUST-TRY', 'SendGrid HTTPS API');

      const senderEmail = isGenericEmail ? `no-reply@${domain}` : emailUser;
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: mailOptions.to }] }],
          from: { email: senderEmail, name: fromName },
          subject: mailOptions.subject,
          content: [{
            type: mailOptions.html ? "text/html" : "text/plain",
            value: mailOptions.html || mailOptions.text
          }]
        })
      });

      if (res.ok) {
        console.log("[SMTP-Robust] ✅ Success via SendGrid HTTPS API");
        captureLog('ROBUST-SUCCESS', 'SendGrid HTTPS API');
        return true;
      } else {
        const errText = await res.text();
        throw new Error(errText);
      }
    } catch (e: any) {
      console.warn("[SMTP-Robust] ❌ SendGrid HTTPS API delivery failed:", e.message);
      captureLog('ROBUST-FAIL', `SendGrid HTTPS: ${e.message}`);
    }
  }

  // --- SMTP TCP GATEWAYS ---
  if (!emailPass) {
    console.warn("[SMTP-Robust] ⚠️ EMAIL_PASS is empty. Sending will likely fail.");
    captureLog('WARN', 'EMAIL_PASS is empty');
  } else if (emailPass.includes('@')) {
    console.warn("[SMTP-Robust] ⚠️ EMAIL_PASS contains '@'. It looks like an email address instead of an App Password.");
    captureLog('WARN', 'EMAIL_PASS looks like an email address');
  }

  // Dynamically resolve smtp.gmail.com to IPv4 as a backup configuration
  let resolvedIps: string[] = [];
  try {
    resolvedIps = await resolveHostIpv4('smtp.gmail.com');
  } catch (e: any) {
    console.warn("[SMTP-Robust] Dynamic DNS lookup caught error:", e.message);
  }

  const hostIps = resolvedIps.length > 0 ? resolvedIps : smtpIps;
  const primaryIp = hostIps[0];

  const attempts: any[] = [
    // 1. Standard TLS-587 hostname based (Our global setDefaultResultOrder ensures clean IPv4 priority)
    { host: 'smtp.gmail.com', port: 587, secure: false, label: 'Gmail-TLS-587' },
    // 2. Standard SSL-465 hostname based (Many restricted environments prefer SSL over TLS upgrade)
    { host: 'smtp.gmail.com', port: 465, secure: true, label: 'Gmail-SSL-465' },
    // 3. Ultimate native service config via Gmail registry
    { service: 'gmail', label: 'SERVICE-GMAIL' },
    // 4. Direct IP-based TLS-587 (Backup - avoids DNS query entirely)
    { host: primaryIp, port: 587, secure: false, label: `DirectIP-TLS-587 (${primaryIp})` },
    // 5. Direct IP-based SSL-465 (Backup alternative)
    { host: primaryIp, port: 465, secure: true, label: `DirectIP-SSL-465 (${primaryIp})` },
    // 6. Deep backup IPs
    ...hostIps.slice(1).map(ip => ({ host: ip, port: 587, secure: false, label: `BackupIP-TLS-587 (${ip})` })),
    ...hostIps.slice(1).map(ip => ({ host: ip, port: 465, secure: true, label: `BackupIP-SSL-465 (${ip})` }))
  ];

  let lastError: any = null;
  
  for (const config of attempts) {
    try {
      console.log(`[SMTP-Robust] Attempting ${config.label}...`);
      captureLog('ROBUST-TRY', config.label);
      
      const transportConfig: any = {
        ...config,
        family: 4,
        auth: { user: emailUser, pass: emailPass },
        tls: { rejectUnauthorized: false, servername: 'smtp.gmail.com' },
        // Enforce strict IPv4 lookup bypasses/overrides
        lookup: (hostname: string, options: any, callback: any) => {
          if (hostname === 'smtp.gmail.com' && primaryIp && primaryIp.includes('.')) {
            callback(null, primaryIp, 4);
          } else {
            const opt = typeof options === 'object' ? { ...options, family: 4 } : { family: 4 };
            opt.family = 4;
            dns.lookup(hostname, opt, (dnsErr, address, family) => {
              if (dnsErr) {
                // If DNS fails, fallback directly to known IPv4
                const fallbackIp = hostIps[0] || smtpIps[0];
                callback(null, fallbackIp, 4);
              } else {
                callback(null, address, family);
              }
            });
          }
        },
        connectionTimeout: 4000,
        greetingTimeout: 3000,
        socketTimeout: 5000
      };

      if (config.service) {
         delete transportConfig.host;
         delete transportConfig.port;
         delete transportConfig.secure;
      }

      const tempTransporter = nodemailer.createTransport(transportConfig);
      await tempTransporter.sendMail(mailOptions);
      
      console.log(`[SMTP-Robust] ✅ Success via ${config.label}`);
      captureLog('ROBUST-SUCCESS', config.label);
      return true;
    } catch (err: any) {
      lastError = err;
      const msg = err.message || String(err);
      console.warn(`[SMTP-Robust] ❌ Failed via ${config.label}: ${msg.substring(0, 100)}`);
      captureLog('ROBUST-FAIL', `${config.label}: ${msg}`);
    }
  }
  
  throw lastError;
}

export function getSmtpLogs() {
  return smtpLogs;
}

export function initEmail() {
  emailUser = cleanEnvVar(process.env.EMAIL_USER || process.env.SMTP_USER) || "ujirpur.barnia6@gmail.com";
  emailPass = cleanEnvVar(process.env.EMAIL_PASS || process.env.SMTP_PASS);
  
  console.log(`[Email] 📬 Diagnostic SMTP Init:`);
  console.log(`        - SMTP User: "${emailUser}"`);
  if (!emailPass) {
    console.warn(`        - ❌ SMTP Pass: NOT DEFINED (EMAIL_PASS or SMTP_PASS is missing in environment variables!)`);
  } else {
    console.log(`        - ✅ SMTP Pass: Defined (Length: ${emailPass.length} chars, starts with "${emailPass[0]}...", ends with "...${emailPass[emailPass.length-1]}")`);
    if (emailPass.includes('@')) {
      console.warn(`        - ⚠️ Warning: SMTP Pass contains '@'. It looks like an email address instead of a 16-character App Password!`);
    } else if (emailPass.length !== 16) {
      console.log(`        - ℹ️ Info: Gmail App Password is typically 16 characters. Selected auth pass length is ${emailPass.length}.`);
    }
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: emailUser, pass: emailPass },
    family: 4
  } as any);
  
  console.log(`[Email] System Initialized.`);
}

export function getEmailTransporter() {
  return transporter;
}
