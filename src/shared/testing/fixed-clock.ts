import type { Clock } from '../application/clock.js';

export class FixedClock implements Clock {
  constructor(private current: Date = new Date('2026-11-02T12:00:00Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  set(at: Date | string): void {
    this.current = new Date(at);
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}
