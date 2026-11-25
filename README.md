This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Student records with XAMPP

The student list is served by a PHP API that connects to MariaDB/MySQL from XAMPP. The Next.js server fetches the PHP API and renders the list; database credentials stay in Apache's server environment.

1. In the XAMPP Control Panel, start **MySQL** and **Apache**.
2. In phpMyAdmin, import [`database/student_records.sql`](./database/student_records.sql). This creates the `hsu_student_app` database and its `students` and `user_accounts` tables.
3. In phpMyAdmin's SQL tab, create a local read-only user. an example has been provided:

   ```sql
   CREATE USER 'hsu_admin'@'127.0.0.1' IDENTIFIED BY 'admin123';
   GRANT SELECT ON hsu_student_app.students TO 'hsu_admin'@'127.0.0.1';
   ```
Some notes:
## Find the users in the data base
SELECT User, Host FROM mysql.user WHERE User = '(user)';
## Change password
ALTER USER '(name)'@'127.0.0.1' IDENTIFIED BY '(password)';
## Grant user premission
GRANT SELECT ON hsu_student_app.students TO 'hsu_app'@'127.0.0.1';
GRANT SELECT, INSERT ON hsu_student_app.user_accounts TO 'hsu_app'@'127.0.0.1';
## Add student(register)
INSERT INTO hsu_student_app.students (student_id, student_name, programme)
VALUES ('stu-num', 'stu-name', 'program');


4. Copy [`php-api/students.php`](./php-api/students.php), [`php-api/login.php`](./php-api/login.php), and [`php-api/register.php`](./php-api/register.php) to a directory served by XAMPP Apache, for example:

   ```text
   /Applications/XAMPP/xamppfiles/htdocs/com3102project-api/students.php
   ```

   The PHP installation used by XAMPP must have the PDO MySQL extension enabled. The database user must be allowed to select from `user_accounts` for login and insert into it for registration.
5. In XAMPP Control Panel, open **Apache > Config > httpd.conf** and add these `SetEnv` directives to its server configuration, using your own database password and the same API token you will configure for Next.js:

   ```apache
   SetEnv DB_HOST "127.0.0.1"
   SetEnv DB_PORT "3306"
   SetEnv DB_USER "hsu_app"
   SetEnv DB_PASSWORD "replace-with-the-same-password"
   SetEnv DB_NAME "hsu_student_app"
   SetEnv STUDENTS_API_TOKEN "123456"
   ```

   Restart Apache after changing its configuration. Keep these values private and out of source control.    The `STUDENTS_API_TOKEN` protects the PHP endpoints; it is not student login.
6. Add the PHP endpoint URL and the matching API token to `.env.local` in the project root:
## 123456 is a test example, change to anything else later:

   ```dotenv
   PHP_STUDENTS_API_URL=http://localhost/com3102project-api/students.php
   PHP_LOGIN_API_URL=http://localhost/com3102project-api/login.php
   PHP_REGISTER_API_URL=http://localhost/com3102project-api/register.php
   STUDENTS_API_TOKEN=123456
   ```

7. Add records using phpMyAdmin's **Insert** tab for the `students` table. Leave `last_login` empty if the student has never logged in, and leave `registered_at` empty to use its automatic timestamp.
8. Run `npm run dev`, then open [http://localhost:3000/Students](http://localhost:3000/Students) or register at [http://localhost:3000/Register](http://localhost:3000/Register).

The student list is read-only. Registration inserts accounts into `user_accounts` and stores password hashes rather than plain-text passwords. For non-student accounts, student ID, entrance year, and programme are stored as `NULL`; "How did you hear about this application?" is optional. Login checks the saved password hash. The API token protects server-to-server access but does not authenticate website visitors, so do not expose the student list publicly until user authentication and authorization have been added.

To access the app from another computer, the Next.js server must be able to reach the PHP API, and PHP/Apache must be able to reach the database. For a public deployment, host the PHP API and database securely; do not expose XAMPP's database port directly to the internet.


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
