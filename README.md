# Website Change & Restock Monitor

A modern, fast Next.js application that lets users monitor web pages for changes and get instant alerts. 

## Features (Phase 1)
- User authentication (custom JWT auth)
- Add URLs to monitor for text changes
- Background worker that checks pages on a schedule
- Resend email integration for alerts
- Responsive dashboard built with Tailwind CSS v3

## Prerequisites
- Node.js 18+
- PostgreSQL installed and running locally
- A free [Resend API key](https://resend.com) (optional for local testing, falls back to console.log)

## 1. Local Setup

1. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and configure your `DATABASE_URL` with your local PostgreSQL credentials. 
   *(Example: `postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/webmonitor`)*
   Ensure you create the database in PostgreSQL first:
   ```sql
   CREATE DATABASE webmonitor;
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the database migrations (this will set up all tables and initial seed data):
   ```bash
   npm run db:migrate
   ```

## 2. Running the Application

You need to run two processes in separate terminals:

**Terminal 1: The Next.js Web App**
```bash
npm run dev
```
Access the dashboard at `http://localhost:3000`.

**Terminal 2: The Background Worker**
This independent process fetches pages and sends alerts.
```bash
npm run worker:dev
```

## How to Test
1. Go to `http://localhost:3000/signup` and create an account.
2. In the dashboard, add a monitor (e.g., `https://example.com`).
3. The background worker will fetch the page and store the initial snapshot.
4. If you have control over the URL (like a GitHub gist), change the content on the page.
5. The next time the worker checks (default 30 seconds for dev polling), it will detect the change.
6. An alert will be sent via email (if `RESEND_API_KEY` is configured) or logged to the worker's console output.
