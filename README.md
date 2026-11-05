# Laplog — Stopwatch Productivity Analytics

A Next.js App Router + TypeScript + Prisma + PostgreSQL app for importing daily stopwatch lap exports and analyzing time over days, weeks, months, and categories.

## What it does

- Paste rows in the format `lap number  lap time  cumulative time`.
- Parses `mm:ss.cc`, `hh:mm:ss.cc`, and decimal-second values.
- Saves one record per date, with individual laps and an activity category.
- Prevents accidental duplicate-date imports; explicit overwrite is available.
- Shows daily lap detail, total and average lap time, longest lap, category totals, weekly/monthly summaries.
- Exports all saved laps to CSV.

## Important interpretation

This app treats each lap as a measured time interval. The category selected during import applies to all laps in that import. If a stopwatch lap is just a split and not a distinct task, choose the category that best describes the whole stopwatch session. The first column is the lap number, the second is the lap duration, and the third is the cumulative stopwatch time.

## Requirements

- Node.js 20.9+
- PostgreSQL database

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from the example and set your PostgreSQL connection string:
   ```bash
   cp .env.example .env
   ```
3. Create the database named `productivity` (or change the database name in `DATABASE_URL`).
4. Create tables and generate Prisma Client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000.

## Data model

- `DayRecord`: unique calendar date, title, notes.
- `Lap`: lap number, lap duration in milliseconds, cumulative time in milliseconds, category, optional label.
- `ActivityCategory`: STUDY, DEVELOPMENT, CAREER, PERSONAL, DISTRACTION, BREAK, OTHER.

## API

### `POST /api/import`

```json
{
  "date": "2026-11-06",
  "rawText": "1 00:01.06 00:01.06\n2 00:01.43 00:02.49",
  "category": "STUDY",
  "title": "GATE study session",
  "notes": "Routing algorithms",
  "replaceExisting": false
}
```

### `GET /api/days`

Returns all daily records, their laps, and category totals.

### `GET /api/days/YYYY-MM-DD`

Returns the record and laps for one date.

## Before production

This is a local-first MVP scaffold, not a multi-user production deployment. Add authentication and per-user ownership before deploying it publicly. Also configure backups for PostgreSQL. The app currently assumes each import contains one activity category; a future enhancement can add per-lap labels/categories and activity start/end timestamps.
