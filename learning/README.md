# Learning — BarberPro

Material de estudo do BarberPro API: como o sistema funciona, por que ele é assim e o que dizer numa entrevista. O código e o README ficam em inglês; aqui é tudo em português.

## Por onde começar

1. [Arquitetura](Arquitetura.md): camadas, módulos e o caminho de uma requisição. Leia primeiro.
2. [GraphQL](GraphQL.md): Yoga dentro do Fastify, SDL + codegen, contexto e erros.
3. [TypeORM e migrations](TypeORM-e-Migrations.md): records separados do domínio, mappers, migrations escritas à mão.
4. [Autenticação](Autenticacao.md): argon2, JWT curto, refresh token rotativo com detecção de reuso.
5. [Testes e CI](Testes-e-CI.md): unit, integração e e2e, relógio fixo, banco de teste.
6. [Docker](Docker.md): o que sobe no `docker compose up` e por quê.
7. [Barbearias e convites](Barbearias-e-Convites.md): PostGIS, busca por trigramas, convites, uploads, DataLoader (fase 2).

## Em uma frase

Uma API GraphQL de agendamento de barbearia: o cliente acha barbearias perto dele, escolhe barbeiro e serviço e marca um horário que cabe na agenda; cada barbeiro define seus serviços, preços, durações e horários.

## Números (fase 2, outubro de 2026)

- 132 testes: 88 unitários, 16 de integração, 28 end to end.
- 2 módulos completos (`identity`, `shops`), 4 ADRs, 2 migrations.
- Fases: 1 esqueleto + login (feito), 2 barbearias (feito), 3 agenda, 4 notificações. Depois, a dashboard do barbeiro.
