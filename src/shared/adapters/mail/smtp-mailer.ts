import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage, Mailer } from '../../../modules/shops/application/ports.js';

/** Plain-text email over SMTP. In development the SMTP server is Mailpit. */
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport(smtpUrl);
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}
