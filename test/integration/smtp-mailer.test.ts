import { describe, expect, it } from 'vitest';
import { SmtpMailer } from '../../src/shared/adapters/mail/smtp-mailer.js';

const MAILPIT = 'http://localhost:8025/api/v1';
const mailpitUp = await fetch(`${MAILPIT}/messages`)
  .then((r) => r.ok)
  .catch(() => false);

describe.skipIf(!mailpitUp)('SmtpMailer (against Mailpit)', () => {
  it('delivers a plain-text email', async () => {
    const subject = `test ${Date.now()}`;
    const mailer = new SmtpMailer('smtp://localhost:1025', 'BarberPro <no-reply@barberpro.dev>');

    await mailer.send({ to: 'jose@x.com', subject, text: 'Hello José' });

    const list = await (
      await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`subject:"${subject}"`)}`)
    ).json();
    expect(list.messages).toHaveLength(1);
    expect(list.messages[0].To[0].Address).toBe('jose@x.com');
  });
});
