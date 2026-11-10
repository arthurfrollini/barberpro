import type {
  NotifyDeps,
  PushJob,
  PushMessage,
  PushReceiptScheduler,
  PushSender,
  PushTicket,
  ReceiptCheck,
} from './ports.js';

export type PushDeps = Pick<NotifyDeps, 'pushTokens' | 'notifications' | 'logError'> & {
  pushSender: PushSender;
  pushReceipts: PushReceiptScheduler;
};

// the phone uninstalled the app or turned notifications off for good: stop sending to it
const GONE = 'DeviceNotRegistered';

/**
 * The push job: one message per phone of the user, the badge set to their unread count so the
 * app icon matches the Avisos tab. A phone Expo reports as gone is forgotten at once; accepted
 * tickets get their receipts checked later. A user with no phone is a no-op, not a failure.
 */
export async function sendPush(deps: PushDeps, job: PushJob): Promise<void> {
  const tokens = await deps.pushTokens.forUser(job.userId);
  if (tokens.length === 0) return;
  const badge = await deps.notifications.unreadCount(job.userId);
  const messages: PushMessage[] = tokens.map(({ token }) => ({
    to: token,
    title: job.title,
    body: job.body,
    data: { url: job.url },
    badge,
    sound: 'default',
  }));

  const tickets = await deps.pushSender.send(messages);
  // past this point Expo has the messages: a failure must not retry the job and push again
  try {
    await afterSend(deps, messages, tickets);
  } catch (error) {
    deps.logError(error);
  }
}

async function afterSend(deps: PushDeps, messages: PushMessage[], tickets: PushTicket[]) {
  const gone: string[] = [];
  const accepted: ReceiptCheck['tickets'] = [];
  // tickets come in the order sent; one past the end names no token and is ignored
  tickets.slice(0, messages.length).forEach((ticket, i) => {
    const token = messages[i]!.to;
    if (ticket.status === 'ok') accepted.push({ id: ticket.id, token });
    else if (ticket.details?.error === GONE) gone.push(token);
    else deps.logError(new Error(`push refused: ${ticket.details?.error ?? ticket.message}`));
  });
  await deps.pushTokens.removeTokens(gone);
  if (accepted.length > 0) await deps.pushReceipts.schedule({ tickets: accepted });
}

/** The receipt job: forgets the phones Apple or Google said are gone; logs other errors. */
export async function checkPushReceipts(deps: PushDeps, check: ReceiptCheck): Promise<void> {
  const receipts = await deps.pushSender.receipts(check.tickets.map((t) => t.id));
  const gone: string[] = [];
  for (const { id, token } of check.tickets) {
    const receipt = receipts[id];
    if (!receipt || receipt.status === 'ok') continue;
    if (receipt.details?.error === GONE) gone.push(token);
    else deps.logError(new Error(`push failed: ${receipt.details?.error ?? receipt.message}`));
  }
  await deps.pushTokens.removeTokens(gone);
}
