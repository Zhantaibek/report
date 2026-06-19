import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export function isSmtpConfigured(): boolean {
  const { host, from } = config.smtp;
  return Boolean(host.trim() && from.trim());
}

function createTransport() {
  const { host, port, secure, user, password, tlsRejectUnauthorized } = config.smtp;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: password } : undefined,
    tls: {
      rejectUnauthorized: tlsRejectUnauthorized,
    },
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP не настроен (SMTP_HOST, SMTP_FROM)');
  }

  const transport = createTransport();
  await transport.sendMail({
    from: config.smtp.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })),
  });
}
