import { UnrecoverableError } from 'bullmq';
import type { PushMessage, PushReceipt, PushSender, PushTicket } from '../../application/ports.js';

// Expo's limits per request
const SEND_CHUNK = 100;
const RECEIPT_CHUNK = 1000;

const chunks = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

/**
 * Expo's push API over fetch. Rate limits (429), server errors and request-level errors throw,
 * so the queue retries the job with backoff; per-message errors come back as tickets.
 */
export class ExpoPushSender implements PushSender {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken?: string,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    const tickets: PushTicket[] = [];
    for (const chunk of chunks(messages, SEND_CHUNK)) {
      const answer = await this.post<PushTicket[]>('/send', chunk);
      // tickets are matched to tokens by position: a short or long answer would pair a
      // "gone" ticket with someone else's live phone
      if (!Array.isArray(answer) || answer.length !== chunk.length) {
        throw new Error(
          `Expo push /send answered ${Array.isArray(answer) ? answer.length : 'no'} tickets for ${chunk.length} messages`,
        );
      }
      tickets.push(...answer);
    }
    return tickets;
  }

  async receipts(ids: string[]): Promise<Record<string, PushReceipt>> {
    const receipts: Record<string, PushReceipt> = {};
    for (const chunk of chunks(ids, RECEIPT_CHUNK)) {
      Object.assign(
        receipts,
        await this.post<Record<string, PushReceipt>>('/getReceipts', { ids: chunk }),
      );
    }
    return receipts;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`Expo push ${path} answered ${response.status}`);
    }
    const json = (await response.json()) as {
      data?: T;
      errors?: { code?: string; message?: string }[];
    };
    if (json.errors?.length || json.data === undefined) {
      const error = json.errors?.[0];
      // a 4xx is a malformed request: retrying sends the same thing and gets the same answer
      const Failure = response.status >= 400 ? UnrecoverableError : Error;
      throw new Failure(
        `Expo push ${path} failed: ${error?.code ?? response.status} ${error?.message ?? ''}`.trim(),
      );
    }
    return json.data;
  }
}
