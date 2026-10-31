import { randomUUID } from 'node:crypto';

export type NotificationType =
  | 'appointment_booked'
  | 'appointment_canceled'
  | 'appointment_rescheduled'
  | 'appointment_reminder';

export type NotificationProps = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  appointmentId: string | null;
  /** When the appointment started as this notification describes it; a later move keeps it. */
  appointmentStartsAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
};

/** An entry in a user's in-app list. Email and, later, push are sent from the same event. */
export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(
    input: Pick<
      NotificationProps,
      'userId' | 'type' | 'title' | 'body' | 'appointmentId' | 'appointmentStartsAt'
    >,
    now: Date,
  ): Notification {
    return new Notification({ id: randomUUID(), ...input, readAt: null, createdAt: now });
  }

  static restore(props: NotificationProps): Notification {
    return new Notification({ ...props });
  }

  get id() {
    return this.props.id;
  }
  get userId() {
    return this.props.userId;
  }
  get type() {
    return this.props.type;
  }
  get title() {
    return this.props.title;
  }
  get body() {
    return this.props.body;
  }
  get appointmentId() {
    return this.props.appointmentId;
  }
  get appointmentStartsAt() {
    return this.props.appointmentStartsAt;
  }
  get readAt() {
    return this.props.readAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
