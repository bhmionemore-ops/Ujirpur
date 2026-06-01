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
    // 1. Direct IP-based TLS-587 (Our primary target - avoids DNS query and IPv6 entirely)
    { host: primaryIp, port: 587, secure: false, label: `DirectIP-TLS-587 (${primaryIp})` },
    // 2. Direct IP-based SSL-465 (Alternative port, avoids DNS and IPv6 entirely)
    { host: primaryIp, port: 465, secure: true, label: `DirectIP-SSL-465 (${primaryIp})` },
    // 3. Backup IPs in case primary IP has issues
    ...hostIps.slice(1).map(ip => ({ host: ip, port: 587, secure: false, label: `BackupIP-TLS-587 (${ip})` })),
    ...hostIps.slice(1).map(ip => ({ host: ip, port: 465, secure: true, label: `BackupIP-SSL-465 (${ip})` })),
    // 4. Standard TLS-587 hostname based (Our lookup override will force IPv4)
    { host: 'smtp.gmail.com', port: 587, secure: false, label: 'Gmail-TLS-587' },
    // 5. Standard SSL-465 hostname based
    { host: 'smtp.gmail.com', port: 465, secure: true, label: 'Gmail-SSL-465' },
    // 6. Ultimate service fallback via Gmail registry
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
