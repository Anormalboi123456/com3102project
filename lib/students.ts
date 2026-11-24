import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

export type Student = {
  student_name: string;
  student_id: string;
  programme: string;
  last_login: string | null;
  registered_at: string;
};

interface StudentRow extends RowDataPacket, Student {}

let pool: Pool | undefined;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured. Add it to .env.local.`);
  }
  return value;
}

function getPool(): Pool {
  if (pool) return pool;

  const port = Number(process.env.DB_PORT ?? "3306");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid TCP port number.");
  }

  pool = mysql.createPool({
    host: requiredEnvironmentVariable("DB_HOST"),
    port,
    user: requiredEnvironmentVariable("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: requiredEnvironmentVariable("DB_NAME"),
    connectionLimit: 10,
    waitForConnections: true,
    dateStrings: true,
  });

  return pool;
}

export async function getStudents(): Promise<Student[]> {
  const [rows] = await getPool().execute<StudentRow[]>(
    `SELECT student_name, student_id, programme, last_login, registered_at
     FROM students
     ORDER BY registered_at DESC, student_id ASC`,
  );

  return rows;
}
