# Docker — BarberPro

## O que sobe com `docker compose up`

| Serviço    | Imagem                           | Porta no seu Mac        | Para quê                                                       |
| ---------- | -------------------------------- | ----------------------- | -------------------------------------------------------------- |
| `postgres` | `imresamu/postgis:17-3.5-alpine` | 5442                    | banco, com PostGIS                                             |
| `redis`    | `redis:8-alpine`                 | 6390                    | filas (BullMQ) e pub/sub das subscriptions, a partir da fase 4 |
| `mailpit`  | `axllent/mailpit`                | 8025 (web), 1025 (SMTP) | pega todo email que a API manda; nada sai de verdade           |
| `api`      | `Dockerfile`, estágio `dev`      | 4000                    | a API com reload; roda as migrations ao subir                  |

As portas fogem de 5432 e 6379 porque o Postgres e o Redis de outros projetos já usam essas.

## Detalhes

- **Imagem do PostGIS.** A oficial (`postgis/postgis`) só tem build amd64; no Mac com chip Apple rodaria emulada. A `imresamu/postgis` é multi-arquitetura e mantida por um dos mantenedores da imagem oficial.
- **Banco de teste.** `docker/postgres/init.sql` cria `barberpro_test` na primeira subida, para os testes nunca tocarem nos dados de dev. Se o volume já existia antes desse arquivo, rode `docker compose down -v` uma vez.
- **Healthchecks.** A `api` só sobe quando Postgres e Redis respondem (`depends_on: condition: service_healthy`).
- **Hot reload.** `./src` é montado dentro do container e o `tsx watch` recarrega quando um arquivo muda.

## Dockerfile em estágios

- `dev`: todas as dependências; usado pelo compose.
- `build`: compila o TypeScript para `dist/` e copia os `.graphql`.
- `prod`: só dependências de produção, o `dist/` e usuário `node` (não root).

## Comandos úteis

```bash
docker compose up                         # tudo, com logs
docker compose up -d postgres redis mailpit   # só os serviços; API no host com npm run dev
docker compose logs -f api
docker compose down -v                    # derruba e apaga os dados
```
