import { connection } from "next/server";
import { getStudents } from "@/lib/students";
import type { Student } from "@/lib/students";

function displayDateTime(value: string | null): string {
  return value ?? "Never";
}

export default async function StudentsPage() {
  await connection();

  let students: Student[] = [];
  let databaseError = false;

  try {
    students = await getStudents();
  } catch (error) {
    console.error("Failed to render the students page:", error);
    databaseError = true;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold">Students</h1>
      <p className="mb-6 text-gray-600">
        Student records stored in the local MariaDB database.
      </p>

      {databaseError ? (
        <p className="rounded border border-red-300 bg-red-50 p-4 text-red-800" role="alert">
          Could not load student records. Check that XAMPP Apache and MySQL are
          running and that the PHP endpoint is configured correctly.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Student name</th>
                <th className="p-3">Student ID</th>
                <th className="p-3">Programme</th>
                <th className="p-3">Last login</th>
                <th className="p-3">Registered at</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={5}>
                    No students found. Add a row in phpMyAdmin to see it here.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr className="border-t border-gray-200" key={student.student_id}>
                    <td className="p-3">{student.student_name}</td>
                    <td className="p-3">{student.student_id}</td>
                    <td className="p-3">{student.programme}</td>
                    <td className="p-3">{displayDateTime(student.last_login)}</td>
                    <td className="p-3">{student.registered_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
