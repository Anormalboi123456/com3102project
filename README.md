This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Student records with XAMPP

The student list is served by a PHP API that connects to MariaDB/MySQL from XAMPP. The Next.js server fetches the PHP API and renders the list; database credentials stay in Apache's server environment.

1. In the XAMPP Control Panel, start **MySQL** and **Apache**.
2. In phpMyAdmin, import [`database/student_records.sql`](./database/student_records.sql). This creates the `hsu_student_app` database and its `students` table.
3. In phpMyAdmin's SQL tab, create a local read-only user. Replace the example password with your own:

   ```sql
   CREATE USER 'hsu_app'@'127.0.0.1' IDENTIFIED BY 'replace-with-your-own-password';
   GRANT SELECT ON hsu_student_app.students TO 'hsu_app'@'127.0.0.1';
   ```

4. Copy [`php-api/students.php`](./php-api/students.php) to a directory served by XAMPP Apache, for example:

   ```text
   /Applications/XAMPP/xamppfiles/htdocs/com3102project-api/students.php
   ```

   The PHP installation used by XAMPP must have the PDO MySQL extension enabled.
5. In XAMPP Control Panel, open **Apache > Config > httpd.conf** and add these `SetEnv` directives to its server configuration, using your own database password and the same API token you will configure for Next.js:

   ```apache
   SetEnv DB_HOST "127.0.0.1"
   SetEnv DB_PORT "3306"
   SetEnv DB_USER "hsu_app"
   SetEnv DB_PASSWORD "replace-with-the-same-password"
   SetEnv DB_NAME "hsu_student_app"
   SetEnv STUDENTS_API_TOKEN "replace-with-a-long-random-token"
   ```

   Restart Apache after changing its configuration. Keep these values private and out of source control. The `STUDENTS_API_TOKEN` protects the JSON/XML API; it is not student login.
6. Add the PHP endpoint URL and the matching API token to `.env.local` in the project root:

   ```dotenv
   PHP_STUDENTS_API_URL=http://localhost/com3102project-api/students.php
   STUDENTS_API_TOKEN=replace-with-the-same-token-configured-in-Apache
   ```

   Do not use a `NEXT_PUBLIC_` prefix for the token. The Next.js server sends it to the PHP endpoint; it is not exposed to the browser. The previous `DB_*` values are no longer used by Next.js.

7. Add records using phpMyAdmin's **Insert** tab for the `students` table. Leave `last_login` empty if the student has never logged in, and leave `registered_at` empty to use its automatic timestamp.
8. Run `npm run dev`, then open [http://localhost:3000/Students](http://localhost:3000/Students).

The page is read-only. The existing login and registration pages are still mock forms; they do not create accounts or update `last_login`. The API token protects server-to-server access but does not authenticate website visitors, so do not expose this student list publicly until user authentication and authorization have been added.

To access the app from another computer, the Next.js server must be able to reach the PHP API, and PHP/Apache must be able to reach the database. For a public deployment, host the PHP API and database securely; do not expose XAMPP's database port directly to the internet.

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
