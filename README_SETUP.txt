LAPLOG SETUP

1. Install Node.js 20.9 or newer and PostgreSQL.
2. Unzip this project.
3. Open a terminal in the project folder.
4. Run: npm install
5. Copy .env.example to .env and set DATABASE_URL to your PostgreSQL database.
6. Run: npx prisma db push
7. Run: npx prisma generate
8. Run: npm run dev
9. Open http://localhost:3000

Paste each day's stopwatch export, select its category, and import it. The app stores one record per date. If that date already exists, select the overwrite checkbox only when you intend to replace its existing laps.
