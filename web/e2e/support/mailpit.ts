// Reads the email the worker delivered to Mailpit (docker compose, or the CI service).
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';

type Summary = { ID: string; To: { Address: string }[] };

/** The newest message to `to`, waiting up to `timeoutMs` for the worker to send it. */
export async function waitForEmail(to: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    );
    const { messages } = (await response.json()) as { messages: Summary[] };
    const found = messages.find((m) => m.To.some((r) => r.Address === to));
    if (found) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)).json()) as {
        Text: string;
      };
      return message.Text;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`no email to ${to} within ${timeoutMs} ms`);
}
