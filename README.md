# 💈 BarberPro

## ↪ Tecnologias

Esse projeto foi desenvolvido com as seguintes tecnologias:

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/) com [PostgreSQL](https://www.postgresql.org/)
- [Mongoose](https://mongoosejs.com/) com [MongoDB](https://www.mongodb.com/) para as notificações
- [Bee-Queue](https://github.com/bee-queue/bee-queue) com [Redis](https://redis.io/) para a fila de e-mails
- [Nodemailer](https://nodemailer.com/) com templates Handlebars
- [Sentry](https://sentry.io/) para monitoramento de erros

## ↪ Projeto

API REST em JavaScript, no padrão MVC, para agendamento de horários em barbearias. Clientes se cadastram, escolhem um prestador, consultam os horários livres e marcam ou cancelam atendimentos. Prestadores veem a agenda do dia e recebem notificações de cada novo agendamento. Um cancelamento dispara um e-mail para o prestador.

## ↪ Rotas

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/users` | Cadastro de usuário |
| `POST` | `/sessions` | Login (JWT) |
| `PUT` | `/users` | Atualização do perfil |
| `GET` | `/providers` | Lista de prestadores |
| `GET` | `/providers/:providerId/available` | Horários livres de um prestador |
| `GET` | `/appointments` | Agendamentos do usuário |
| `POST` | `/appointments` | Novo agendamento |
| `DELETE` | `/appointments/:id` | Cancelamento |
| `GET` | `/schedule` | Agenda do prestador |
| `GET` | `/notifications` | Notificações do prestador |
| `PUT` | `/notifications/:id` | Marca notificação como lida |
| `POST` | `/files` | Upload de avatar |

Todas as rotas, exceto `POST /users` e `POST /sessions`, exigem o header `Authorization: Bearer <token>`.

## ↪ Como executar

- Clone o repositório
- Instale as dependências com `yarn`
- Copie `.env.example` para `.env` e preencha as variáveis
- Suba PostgreSQL, MongoDB e Redis
- Rode as migrations com `yarn sequelize db:migrate`
- Inicie a API com `yarn dev` e a fila com `yarn queue`
