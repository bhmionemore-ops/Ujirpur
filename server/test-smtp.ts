import { robustSendMail, getSmtpLogs } from "./email";
import dotenv from "dotenv";

dotenv.config();

async function runTest() {
  console.log("Starting SMTP connection diagnostic run...");
  console.log("Environment check:");
  console.log("- EMAIL_USER / SMTP_USER:", process.env.EMAIL_USER || process.env.SMTP_USER);
  console.log("- EMAIL_PASS / SMTP_PASS length:", (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").length);

  try {
    const success = await robustSendMail({
      from: `"Barnia Digital Hub Test" <${process.env.EMAIL_USER || "ujirpur.barnia6@gmail.com"}>`,
      to: "okbgmi611@gmail.com",
      subject: "Diagnostic Test Email from Barnia Digital Hub",
      text: "If you are reading this, SMTP sending is fully working!"
    });
    console.log("SMT_TEST RESULT: SUCCESS!", success);
  } catch (err: any) {
    console.error("SMT_TEST RESULT: FAILED!");
    console.error("Error details:", err);
  } finally {
    console.log("SMTP logs during diagnostic run:");
    console.log(getSmtpLogs().join("\n"));
  }
}

runTest();
