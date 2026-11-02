import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { cleanText } from '../../../shared/domain/text.js';

export type ServiceProps = {
  id: string;
  barberId: string;
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Editable = Pick<ServiceProps, 'name' | 'description' | 'priceCents' | 'durationMinutes'>;

const name = (raw: string) =>
  cleanText(raw, {
    min: 1,
    max: 60,
    code: 'INVALID_SERVICE_NAME',
    message: 'Service name must have 1 to 60 characters.',
  });
const description = (raw: string) =>
  cleanText(raw, {
    min: 0,
    max: 500,
    code: 'INVALID_DESCRIPTION',
    message: 'Description can have at most 500 characters.',
  });

function price(cents: number): number {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new DomainError('INVALID_PRICE', 'Price must be a whole number of cents, zero or more.');
  }
  return cents;
}

function duration(minutes: number): number {
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480 || minutes % 5 !== 0) {
    throw new DomainError('INVALID_DURATION', 'Duration must be 5 to 480 minutes, in steps of 5.');
  }
  return minutes;
}

/** Something a barber sells: each barber sets their own price and duration. */
export class Service {
  private constructor(private props: ServiceProps) {}

  static create(input: Editable & { barberId: string }, now: Date): Service {
    return new Service({
      id: randomUUID(),
      barberId: input.barberId,
      name: name(input.name),
      description: description(input.description),
      priceCents: price(input.priceCents),
      durationMinutes: duration(input.durationMinutes),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ServiceProps): Service {
    return new Service({ ...props });
  }

  update(patch: Partial<Editable>, now: Date): void {
    const p = this.props;
    if (patch.name !== undefined) p.name = name(patch.name);
    if (patch.description !== undefined) p.description = description(patch.description);
    if (patch.priceCents !== undefined) p.priceCents = price(patch.priceCents);
    if (patch.durationMinutes !== undefined) p.durationMinutes = duration(patch.durationMinutes);
    p.updatedAt = now;
  }

  /** Archived services stay for history but can no longer be booked. */
  archive(now: Date): void {
    this.props.archivedAt ??= now;
    this.props.updatedAt = now;
  }

  get isArchived() {
    return this.props.archivedAt !== null;
  }
  get id() {
    return this.props.id;
  }
  get barberId() {
    return this.props.barberId;
  }
  get name() {
    return this.props.name;
  }
  get description() {
    return this.props.description;
  }
  get priceCents() {
    return this.props.priceCents;
  }
  get durationMinutes() {
    return this.props.durationMinutes;
  }
  get archivedAt() {
    return this.props.archivedAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
}
