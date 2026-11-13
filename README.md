# HouseLedger — Connected Admin Web

Next.js 16.4.5, React 19.3, TypeScript. All business state loads and saves through the NestJS `/api/v1` API and PostgreSQL. The old local demo store and browser reset button are **not included**.

See [SETUP_AND_CONNECTION.md](./SETUP_AND_CONNECTION.md) for the full Mac PostgreSQL setup, `.env` credentials, migrations, demo seeding, administrator login, manager NID and password flow, manager mobile authentication, and tests.

Quick start after backend migration/bootstrap:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `API_ORIGIN=http://127.0.0.1:4000` in `.env.local`, then visit http://localhost:3000. Do not expose database credentials to this frontend.
