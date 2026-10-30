import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { cleanText } from '../../../shared/domain/text.js';
import type { Location } from './location.js';

export type BarbershopProps = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  foundedYear: number;
  logoFileId: string | null;
  address: string;
  location: Location;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
};

type Editable = Pick<
  BarbershopProps,
  'name' | 'description' | 'foundedYear' | 'logoFileId' | 'address' | 'location' | 'timezone'
>;

const name = (raw: string) =>
  cleanText(raw, {
    min: 1,
    max: 80,
    code: 'INVALID_SHOP_NAME',
    message: 'Shop name must have 1 to 80 characters.',
  });
const description = (raw: string) =>
  cleanText(raw, {
    min: 0,
    max: 1000,
    code: 'INVALID_DESCRIPTION',
    message: 'Description can have at most 1000 characters.',
  });
const address = (raw: string) =>
  cleanText(raw, {
    min: 1,
    max: 200,
    code: 'INVALID_ADDRESS',
    message: 'Address must have 1 to 200 characters.',
  });

function foundedYear(year: number, now: Date): number {
  if (!Number.isInteger(year) || year < 1900 || year > now.getUTCFullYear()) {
    throw new DomainError(
      'INVALID_FOUNDED_YEAR',
      'Founded year must be between 1900 and this year.',
    );
  }
  return year;
}

function timezone(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    throw new DomainError('INVALID_TIMEZONE', 'Use an IANA time zone such as America/Sao_Paulo.');
  }
}

/** The shop page: a showcase. Booking rules live with the barbers, not here. */
export class Barbershop {
  private constructor(private props: BarbershopProps) {}

  static create(input: Editable & { ownerId: string }, now: Date): Barbershop {
    return new Barbershop({
      id: randomUUID(),
      ownerId: input.ownerId,
      name: name(input.name),
      description: description(input.description),
      foundedYear: foundedYear(input.foundedYear, now),
      logoFileId: input.logoFileId,
      address: address(input.address),
      location: input.location,
      timezone: timezone(input.timezone),
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: BarbershopProps): Barbershop {
    return new Barbershop({ ...props });
  }

  update(patch: Partial<Editable>, now: Date): void {
    const p = this.props;
    if (patch.name !== undefined) p.name = name(patch.name);
    if (patch.description !== undefined) p.description = description(patch.description);
    if (patch.foundedYear !== undefined) p.foundedYear = foundedYear(patch.foundedYear, now);
    if (patch.logoFileId !== undefined) p.logoFileId = patch.logoFileId;
    if (patch.address !== undefined) p.address = address(patch.address);
    if (patch.location !== undefined) p.location = patch.location;
    if (patch.timezone !== undefined) p.timezone = timezone(patch.timezone);
    p.updatedAt = now;
  }

  /** "Tempo de atuação" on the shop page. */
  yearsActive(now: Date): number {
    return Math.max(0, now.getUTCFullYear() - this.props.foundedYear);
  }

  get id() {
    return this.props.id;
  }
  get ownerId() {
    return this.props.ownerId;
  }
  get name() {
    return this.props.name;
  }
  get description() {
    return this.props.description;
  }
  get foundedYear() {
    return this.props.foundedYear;
  }
  get logoFileId() {
    return this.props.logoFileId;
  }
  get address() {
    return this.props.address;
  }
  get location() {
    return this.props.location;
  }
  get timezone() {
    return this.props.timezone;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
}
