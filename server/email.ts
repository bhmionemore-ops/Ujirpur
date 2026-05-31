import nodemailer from "nodemailer";
import fetch from "node-fetch";
import dns from "dns";

let transporter: any = null;
let emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || "ujirpur.barnia6@gmail.com";
let emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

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

export async function robustSendMail(mailOptions: any) {
  // Update credentials just in case env changed
  emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "ujirpur.barnia6@gmail.com").trim();
  emailPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").trim();

  if (!emailPass) {
    console.warn("[SMTP-Robust] ⚠️ EMAIL_PASS is empty. Sending will likely fail.");
    captureLog('WARN', 'EMAIL_PASS is empty');
  } else if (emailPass.includes('@')) {
    console.warn("[SMTP-Robust] ⚠️ EMAIL_PASS contains '@'. It looks like an email address instead of an App Password.");
    captureLog('WARN', 'EMAIL_PASS looks like an email address');
  }

  // Prevent Gmail SMTP sender address spoofing rejection by rewriting mismatching "from" addresses 
  // to always use the authenticated user email while retaining the display name
  let fromName = "Barnali AI";
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

  // Dynamically resolve smtp.gmail.com to IPv4 to prevent connection to unreachable IPv6 on some servers
  let resolvedIps: string[] = [];
  try {
    resolvedIps = await resolveHostIpv4('smtp.gmail.com');
  } catch (e: any) {
    console.warn("[SMTP-Robust] Dynamic DNS lookup caught error:", e.message);
  }

  const hostIps = resolvedIps.length > 0 ? resolvedIps : smtpIps;
  const primaryIp = hostIps[0];

  const attempts: any[] = [
    // 1. Direct standard TLS-587 (Most common, fastest, custom IPv4 lookup enforced)
    { host: 'smtp.gmail.com', port: 587, secure: false, label: 'Gmail-TLS-587' },
    // 2. Direct standard SSL-465 (Alternative secure option, custom IPv4 lookup enforced)
    { host: 'smtp.gmail.com', port: 465, secure: true, label: 'Gmail-SSL-465' },
    // 3. Direct IP-based TLS-587 (Bypasses any hostname resolution issues)
    { host: primaryIp, port: 587, secure: false, label: `DirectIP-TLS-587 (${primaryIp})` },
    // 4. Direct IP-based SSL-465
    { host: primaryIp, port: 465, secure: true, label: `DirectIP-SSL-465 (${primaryIp})` },
    // 5. Ultimate service fallback via Gmail registry
    { service: 'gmail', label: 'SERVICE-GMAIL' }
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
        // Enforce IPv4 via custom lookup helper
        lookup: (hostname: string, options: any, callback: any) => {
          dns.lookup(hostname, { ...options, family: 4 }, callback);
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
  emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || "ujirpur.barnia6@gmail.com";
  emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  
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
