# Event Portal — Server

Minimal Express server for the Event Portal project.

Quick start

1. Install dependencies

```bash
npm install
```

2. Start in development (requires `nodemon`):

```bash
npm run dev
```

3. Start production:

```bash
npm start
```

Endpoints

- `GET /` — basic welcome message
- `GET /health` — health check

Environment

Copy `.env.example` to `.env` to customize `PORT`.
