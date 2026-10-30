# Autenticação — BarberPro

## Fluxo

```
signUp / signIn  ──▶  { accessToken (JWT, 15 min), refreshToken (opaco, 30 dias) }
requisições      ──▶  Authorization: Bearer <accessToken>
access expirou   ──▶  refreshToken(token)  ──▶  par novo; o refresh antigo morre
```

## As peças

| Peça          | Implementação                                         | Por quê                                                                                                    |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Senha         | argon2id (`argon2-password-hasher.ts`)                | hash lento e que gasta memória, o padrão recomendado pela OWASP; bcrypt é o antecessor                     |
| Access token  | JWT HS256 com `jose`, só o `sub` (id do usuário)      | curto (15 min): se vazar, dura pouco; não precisa ir ao banco para validar                                 |
| Refresh token | 32 bytes aleatórios em base64url                      | não é JWT: é só um segredo opaco                                                                           |
| No banco      | `sha256(refreshToken)` em `refresh_tokens.token_hash` | se o banco vazar, os tokens não servem; sha256 basta porque o valor é aleatório (para senha, não bastaria) |

## Regras que valem citar

1. **Email normalizado.** `Email.parse` faz trim e lowercase, então `Ana@X.com` e `ana@x.com` são a mesma conta.
2. **Mesmo erro para email inexistente e senha errada** (`INVALID_CREDENTIALS`). Senão a API vira um jeito de descobrir quem tem conta.
3. **Rotação.** Cada refresh token vale uma vez. Usou, ele é revogado e um novo é emitido.
4. **Detecção de reuso.** Se um token já usado aparece de novo, alguém copiou ele (ou duas abas correram). A resposta: revogar **todas** as sessões daquele usuário. O dono legítimo faz login de novo; o atacante perde o acesso.
5. **Corrida.** Duas requisições com o mesmo token ao mesmo tempo: a revogação é um `UPDATE ... WHERE revoked_at IS NULL`, e só uma recebe `affected = 1`. A outra cai na regra 4.
6. **Token válido de conta apagada** é tratado como sem sessão (`UNAUTHENTICATED`).

## Onde está no código

- Casos de uso: `src/modules/identity/application/` (`sign-up.ts`, `sign-in.ts`, `refresh-session.ts`, `issue-session.ts`).
- Portas: `application/ports.ts` (`PasswordHasher`, `AccessTokens`, `Secrets`, repositórios).
- Adaptadores: `adapters/security/` e `adapters/persistence/`.
- Contexto GraphQL que lê o Bearer: `src/app.ts`.

## Frase para entrevista

"Short-lived JWT access tokens and opaque refresh tokens that rotate on every use, stored only as a SHA-256 hash. If a used refresh token shows up again I revoke every session of that user, and the revoke is a conditional update, so two concurrent refreshes can't both win."
