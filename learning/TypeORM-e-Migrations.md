# TypeORM e migrations — BarberPro

## Record x entidade de domínio

No TypeORM "normal", a mesma classe tem os decorators (`@Entity`, `@Column`) e as regras de negócio. Aqui são duas classes:

|              | Onde                                                   | Papel                                          |
| ------------ | ------------------------------------------------------ | ---------------------------------------------- |
| `User`       | `modules/identity/domain/user.ts`                      | regras (nome válido, `rename`), sem decorators |
| `UserRecord` | `modules/identity/adapters/persistence/user.record.ts` | o formato da linha na tabela `users`           |
| `userMapper` | ao lado do record                                      | converte um no outro (`toDomain`, `toRecord`)  |

O repositório (`TypeOrmUserRepository`) implementa a porta `UserRepository` e é o único que vê o record. Custa um mapper por entidade; em troca, o domínio não sabe que o TypeORM existe e os testes unitários usam um repositório em memória.

## Migrations escritas à mão

- `synchronize: false` sempre. O `synchronize` altera o banco para bater com as entidades, e em produção isso pode apagar coluna com dado.
- As migrations ficam em `src/shared/adapters/database/migrations/` e são listadas **explicitamente** em `data-source.ts` (sem glob), o que funciona igual no tsx, no tsc e no Vitest.
- Escrevo o SQL direto (`CREATE TABLE ...`). Recursos que o TypeORM não modela bem, como extensões, `EXCLUDE USING gist` e colunas PostGIS, ficam claros.
- Comandos: `npm run migration:run`, `npm run migration:revert`, `npm run migration:generate -- src/shared/adapters/database/migrations/nome`.

A primeira migration instala três extensões que o projeto vai usar:

- `postgis`: tipo `geography` e `ST_DWithin`/`ST_Distance` para "barbearias perto de mim";
- `pg_trgm`: busca por nome tolerante a erro de digitação;
- `btree_gist`: permite misturar `=` (barbeiro) e `&&` (sobreposição de horário) na mesma constraint.

## Detalhes que valem citar

- **`invalidWhereValuesBehavior: { null: 'throw', undefined: 'throw' }`.** No TypeORM, `findOneBy({ id: undefined })` pode virar "sem filtro" e devolver a primeira linha da tabela. Com isso, vira erro. Para buscar `NULL` de propósito, uso `IsNull()`.
- **Upsert no `save`.** `manager.upsert(UserRecord, record, ['id'])` faz `INSERT ... ON CONFLICT (id) DO UPDATE` numa query só, em vez do `save()` do TypeORM, que faz um SELECT antes.
- **Revogar com UPDATE condicional.** `UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL`, e o `affected` diz se fui eu que revoguei. É assim que duas requisições simultâneas não conseguem usar o mesmo refresh token (ver [Autenticação](Autenticacao.md)).
- **TypeORM 1.x.** O projeto usa a versão 1 (lançada em 2026). A API do dia a dia é a mesma da 0.3; os decorators continuam no estilo "legacy" (`experimentalDecorators: true` no tsconfig).

## Frase para entrevista

"TypeORM entities are persistence records only; the domain has its own classes and a mapper in between. Synchronize is off, migrations are hand-written SQL so things like PostGIS columns and exclusion constraints are explicit, and I made TypeORM throw on null or undefined in where clauses, because silently matching every row is a classic bug."
