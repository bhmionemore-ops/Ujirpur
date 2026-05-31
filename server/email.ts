import nodemailer from "nodemailer";
import fetch from "node-fetch";

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

  // Prioritize stable DNS-resolved G-TLS-587 or G-SSL-465 first for instantaneous sub-second delivery, 
  // falling back to direct Gmail IP-based configs to combat local DNS or IPv6 routing glitches
  const attempts = [
    { host: 'smtp.gmail.com', port: 587, secure: false, label: 'G-TLS-587' },
    { host: 'smtp.gmail.com', port: 465, secure: true, label: 'G-SSL-465' },
    { host: smtpIps[0], port: 465, secure: true, label: 'IP1-SSL-465' },
    { host: smtpIps[1], port: 587, secure: false, label: 'IP2-TLS-587' },
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
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000
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
      console.warn(`[SMTP-Robust] ❌ Failed via ${config.label}: ${msg.substring(0, 50)}`);
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
