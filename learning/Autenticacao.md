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
2. **Mesmo erro para email inexistente e senha errada** (`INVALID_CREDENTIALS`). Ajuda, mas não esconde tudo: o `signUp` responde `EMAIL_TAKEN`, e o tempo de resposta muda (sem usuário, o argon2 nem roda). Fechar isso de verdade pede rate limiting, que fica para depois.
3. **Rotação.** Cada refresh token vale uma vez. Usou, ele é revogado e um novo é emitido.
4. **Detecção de reuso.** Se um token já usado aparece de novo, alguém copiou ele (ou duas abas correram). A resposta: revogar **todas** as sessões daquele usuário. O dono legítimo faz login de novo; o atacante perde o acesso.
5. **Corrida.** Duas requisições com o mesmo token ao mesmo tempo: a troca roda numa transação que trava a linha do token (`SELECT ... FOR UPDATE`). A segunda espera a primeira terminar, vê o token já revogado e cai na regra 4, que agora pega também o token novo da primeira. A revisão do PR achou essa corrida: sem a trava, o "revogar tudo" da perdedora podia rodar antes de a vencedora gravar o token novo, e esse token sobrevivia. O teste `leaves no live session when one refresh token is used twice at once` cobre isso.
6. **Cadastro duplo.** Dois `signUp` iguais ao mesmo tempo passam pela checagem "email já existe"; quem decide é o índice único do banco, e o repositório traduz a violação (`23505`) para `EMAIL_TAKEN`.
7. **Token válido de conta apagada** é tratado como sem sessão (`UNAUTHENTICATED`).

## Onde está no código

- Casos de uso: `src/modules/identity/application/` (`sign-up.ts`, `sign-in.ts`, `refresh-session.ts`, `issue-session.ts`).
- Portas: `application/ports.ts` (`PasswordHasher`, `AccessTokens`, `Secrets`, repositórios).
- Adaptadores: `adapters/security/` e `adapters/persistence/`.
- Contexto GraphQL que lê o Bearer: `src/app.ts`.

## Frase para entrevista

"Short-lived JWT access tokens and opaque refresh tokens that rotate on every use, stored only as a SHA-256 hash. If a used refresh token shows up again I revoke every session of that user. The exchange locks the token row in a transaction, because code review found a race where two concurrent refreshes could leave one new token alive."
