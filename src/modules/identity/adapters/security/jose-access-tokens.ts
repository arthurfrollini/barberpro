import { jwtVerify, SignJWT } from 'jose';
import type { Clock } from '../../../../shared/application/clock.js';
import type { AccessTokens } from '../../application/ports.js';

/** HS256 JWTs carrying only the user id (`sub`). */
export class JoseAccessTokens implements AccessTokens {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly ttlSeconds: number,
    private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async issue(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);
    const exp = issuedAt + this.ttlSeconds;
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(issuedAt)
      .setExpirationTime(exp)
      .sign(this.key);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  async verify(token: string): Promise<string | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        currentDate: this.clock.now(),
      });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
