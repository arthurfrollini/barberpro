# 💈 BarberPro

## ↪ Tech stack

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/) with [PostgreSQL](https://www.postgresql.org/)
- [Mongoose](https://mongoosejs.com/) with [MongoDB](https://www.mongodb.com/) for notifications
- [Bee-Queue](https://github.com/bee-queue/bee-queue) with [Redis](https://redis.io/) for the email queue
- [Nodemailer](https://nodemailer.com/) with Handlebars templates
- [Sentry](https://sentry.io/) for error monitoring

## ↪ About

A REST API in JavaScript, following MVC, for booking barbershop appointments. Customers sign up, pick a provider, check open time slots, and book or cancel appointments. Providers see their daily schedule and get a notification for every new booking. A cancellation sends the provider an email.

## ↪ Routes

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/users` | Sign up |
| `POST` | `/sessions` | Log in (JWT) |
| `PUT` | `/users` | Update profile |
| `GET` | `/providers` | List providers |
| `GET` | `/providers/:providerId/available` | A provider's open slots |
| `GET` | `/appointments` | The user's appointments |
| `POST` | `/appointments` | Book an appointment |
| `DELETE` | `/appointments/:id` | Cancel an appointment |
| `GET` | `/schedule` | The provider's schedule |
| `GET` | `/notifications` | The provider's notifications |
| `PUT` | `/notifications/:id` | Mark a notification as read |
| `POST` | `/files` | Upload an avatar |

Every route except `POST /users` and `POST /sessions` requires an `Authorization: Bearer <token>` header.

## ↪ Running it

- Clone the repository
- Install dependencies with `yarn`
- Copy `.env.example` to `.env` and fill in the variables
- Start PostgreSQL, MongoDB and Redis
- Run the migrations with `yarn sequelize db:migrate`
- Start the API with `yarn dev` and the queue with `yarn queue`
