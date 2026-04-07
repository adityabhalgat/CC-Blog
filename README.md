# Blog Application

A simple full-stack blog app starter with:

- React frontend
- Express backend
- Prisma database layer
- CRUD endpoints for blog posts

## Project structure

- `client/` - Vite React frontend
- `server/` - Express API and Prisma schema

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create the backend environment file:

```bash
cp .env.example .env
```

3. Push the Prisma schema to the local SQLite database:

```bash
npm run db:push
```

4. Start both apps:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## API routes

- `GET /health`
- `GET /posts`
- `GET /posts/:id`
- `POST /posts`
- `PUT /posts/:id`
- `DELETE /posts/:id`

## Deployment note

This starter uses SQLite for easy local setup. For a cloud deployment, switch `DATABASE_URL` to a managed PostgreSQL database and keep the same Prisma model.
