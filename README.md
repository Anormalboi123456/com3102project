This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## User accounts with XAMPP

Registered accounts are stored in the `user_accounts` table. PHP endpoints connect to MariaDB/MySQL from XAMPP, while the Next.js server fetches account data; database credentials stay in Apache's server environment.

1. In the XAMPP Control Panel, start **MySQL** and **Apache**.
2. In phpMyAdmin, import [`database/user_accounts.sql`](./database/user_accounts.sql). This creates the `hsu_student_app` database and its `user_accounts` table.
3. In phpMyAdmin's SQL tab, create a local database user and grant access to accounts:

   ```sql
   CREATE USER 'hsu_admin'@'127.0.0.1' IDENTIFIED BY 'admin123';
   GRANT SELECT, INSERT ON hsu_student_app.user_accounts TO 'hsu_app'@'127.0.0.1';
   ```

4. Copy [`php-api/user_accounts.php`](./php-api/user_accounts.php), [`php-api/login.php`](./php-api/login.php), and [`php-api/register.php`](./php-api/register.php) to a directory served by XAMPP Apache, for example:

   ```text
   /Applications/XAMPP/xamppfiles/htdocs/com3102project-api/
   ```

   The PHP installation used by XAMPP must have the PDO MySQL extension enabled. The database user needs `SELECT` permission for the accounts and login endpoints, and `INSERT` permission for registration.
5. In XAMPP Control Panel, open **Apache > Config > httpd.conf** and add these `SetEnv` directives to its server configuration, using your own database password and the same API token you will configure for Next.js:

   ```apache
   SetEnv DB_HOST "127.0.0.1"
   SetEnv DB_PORT "3306"
   SetEnv DB_USER "hsu_admin"
   SetEnv DB_PASSWORD "admin123"
   SetEnv DB_NAME "hsu_student_app"
   SetEnv STUDENTS_API_TOKEN "123456"
   ```

   Restart Apache after changing its configuration. Keep these values private and out of source control.       The `STUDENTS_API_TOKEN` protects the PHP endpoints; it is not user login.
6. Add the PHP endpoint URL and the matching API token to `.env.local` in the project root:
## 123456 is a test example, change to anything else later:

   ```dotenv
   PHP_USER_ACCOUNTS_API_URL=http://localhost/com3102project-api/user_accounts.php
   PHP_LOGIN_API_URL=http://localhost/com3102project-api/login.php
   PHP_REGISTER_API_URL=http://localhost/com3102project-api/register.php
   STUDENTS_API_TOKEN=123456
   SESSION_SECRET=replace-with-at-least-32-random-bytes
   ```

   Generate a private session secret (for example, with `openssl rand -base64 32`) and put its output in `SESSION_SECRET`. Keep it only in `.env.local`; restart Next.js after changing the file.

7. Run `npm run dev`, then register at [http://localhost:3000/Register](http://localhost:3000/Register) and log in. Open [http://localhost:3000/Students](http://localhost:3000/Students) to view registered user accounts.


To access the app from another computer, the Next.js server must be able to reach the PHP API, and PHP/Apache must be able to reach the database. For a public deployment, host the PHP API and database securely; do not expose XAMPP's database port directly to the internet.


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
