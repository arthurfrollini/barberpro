import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMe } from '@/features/auth/hooks/use-auth';
import { currentShop, useRoles } from '@/features/roles/hooks/use-roles';
import { formatRelative, localDateOf } from '@/shared/lib/time';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/states';
import type { Notification } from '../api/notifications';
import { useMarkRead, useNotifications, useUnreadCount } from '../hooks/use-notifications';
import { describeNotification } from '../lib/describe';

const bellLabel = (unread: number) =>
  unread === 0
    ? 'Notificações'
    : `Notificações, ${unread} ${unread === 1 ? 'não lida' : 'não lidas'}`;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount().data ?? 0;
  const list = useNotifications({ enabled: open });
  const markRead = useMarkRead();
  const roles = useRoles();
  const me = useMe();
  const navigate = useNavigate();
  const timeZone = (roles.data && currentShop(roles.data)?.timezone) ?? 'America/Sao_Paulo';

  const openItem = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.appointment) navigate(`/agenda?dia=${localDateOf(n.appointment.startsAt, timeZone)}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={bellLabel(unread)}>
          <Bell />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b px-4 py-3 font-display">Notificações</p>
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : list.isError ? (
          <div className="p-3">
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          </div>
        ) : list.data.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nada por aqui ainda.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {list.data.map((n) => {
              const { title, body } = describeNotification(n, me.data?.id, timeZone);
              return (
                <li key={n.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                      n.read && 'text-muted-foreground',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', !n.read && 'bg-primary')}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn('font-medium', !n.read && 'text-foreground')}>
                        {title}
                      </span>
                      <span className="line-clamp-2">{body}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(n.createdAt)}
                      </span>
                      {!n.read && <span className="sr-only">Não lida</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
