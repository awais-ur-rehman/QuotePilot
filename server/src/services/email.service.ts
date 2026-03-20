import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import type { IRFQ } from "../types";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return _transporter;
}

export async function sendCompletionEmail(
  rfq: IRFQ,
  completedCount: number,
  totalCount: number
): Promise<void> {
  const t = getTransporter();
  if (!t) return; // SMTP not configured — silent no-op

  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const subject = `[QuotePilot] ${rfq.title} — ${completedCount}/${totalCount} quotes collected`;

  const text = [
    `Your RFQ "${rfq.title}" has finished.`,
    "",
    `  Product:    ${rfq.specs.productType}`,
    `  Quantity:   ${rfq.specs.quantity.toLocaleString()} units`,
    `  Vendors:    ${totalCount}`,
    `  Quotes:     ${completedCount} collected (${successRate}% success)`,
    "",
    `Log in to QuotePilot to compare quotes and award the best price.`,
  ].join("\n");

  try {
    await t.sendMail({
      from: env.SMTP_FROM,
      to: rfq.contactInfo.email,
      subject,
      text,
    });
    logger.info(`Completion email sent for RFQ ${rfq._id} to ${rfq.contactInfo.email}`);
  } catch (err) {
    throw new Error(`SMTP send failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
