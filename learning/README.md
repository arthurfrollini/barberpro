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
8. [Agenda e regras](Agenda-e-Regras.md): horários livres, fuso horário, regra das 2 horas, exclusion constraint, travas (fase 3).
9. [Notificações, filas e tempo real](Notificacoes-Filas-e-Tempo-Real.md): eventos, BullMQ, lembretes, subscription (fase 4).
10. [Apresentação](Apresentacao.md): roteiro de demo e perguntas prováveis com respostas.

## Em uma frase

Uma API GraphQL de agendamento de barbearia: o cliente acha barbearias perto dele, escolhe barbeiro e serviço e marca um horário que cabe na agenda; cada barbeiro define seus serviços, preços, durações e horários.

## Números (fase 4, outubro de 2026)

- 220 testes: 154 unitários, 30 de integração, 36 end to end.
- 4 módulos (`identity`, `shops`, `scheduling`, `notifications`), 4 ADRs, 4 migrations, 2 processos (API e worker).
- As 4 fases da API estão feitas. Próximo passo: a dashboard do barbeiro.
