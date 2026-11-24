This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Student records with XAMPP

The student list uses MariaDB/MySQL from XAMPP. The database connection runs on the Next.js server; database credentials must stay in `.env.local` and must not use a `NEXT_PUBLIC_` prefix.

1. In the XAMPP Control Panel, start **MySQL**. Start **Apache** as well if you want to use phpMyAdmin.
2. In phpMyAdmin, import [`database/student_records.sql`](./database/student_records.sql). This creates the `hsu_student_app` database and its `students` table.
3. In phpMyAdmin's SQL tab, create a local read-only user. Replace the example password with your own:

   ```sql
   CREATE USER 'hsu_app'@'127.0.0.1' IDENTIFIED BY 'replace-with-your-own-password';
   GRANT SELECT ON hsu_student_app.students TO 'hsu_app'@'127.0.0.1';
   ```

4. Create `.env.local` in the project root:

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=hsu_app
   DB_PASSWORD=replace-with-the-same-password
   DB_NAME=hsu_student_app
   STUDENTS_API_TOKEN=replace-with-a-long-random-token
   ```

   Keep this file private; it is ignored by Git. The `STUDENTS_API_TOKEN` is for the JSON/XML API, not student login. You can generate a random value in Terminal with `openssl rand -hex 32`.

5. Add records using phpMyAdmin's **Insert** tab for the `students` table. Leave `last_login` empty if the student has never logged in, and leave `registered_at` empty to use its automatic timestamp.
6. Run `npm run dev`, then open [http://localhost:3000/Students](http://localhost:3000/Students).

The page is read-only. The existing login and registration pages are still mock forms; they do not create accounts or update `last_login`. Do not expose this student list publicly until real authentication and authorization have been added.

To access the app from another computer, both the Next.js server and database must be reachable from it. For a public deployment, use a hosted database and configure the same environment variables in the hosting provider; do not expose XAMPP's database port directly to the internet.

## Useful commands for mySQLadmin terminal(SQL page)
## List the users in the data base
SELECT User, Host FROM mysql.user WHERE User = 'hsu_app';
## Change password
ALTER USER '(name)'@'127.0.0.1' IDENTIFIED BY '(password)';
## Grant user premission
GRANT SELECT ON hsu_student_app.students TO 'hsu_app'@'127.0.0.1';
## Add student(register)
INSERT INTO hsu_student_app.students (student_id, student_name, programme)
VALUES ('stu-num', 'stu-name', 'program');

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
