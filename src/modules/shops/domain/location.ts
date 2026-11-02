import { DomainError } from '../../../shared/domain/domain-error.js';

/** A point on the map (WGS 84), as the owner's app sends it. No geocoding in v1. */
export class Location {
  private constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {}

  static of(latitude: number, longitude: number): Location {
    const ok =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180;
    if (!ok) throw new DomainError('INVALID_LOCATION', 'Latitude or longitude is out of range.');
    return new Location(latitude, longitude);
  }
}
