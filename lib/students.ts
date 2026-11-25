export type Student = {
  student_name: string;
  student_id: string;
  programme: string;
  last_login: string | null;
  registered_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStudent(value: unknown): value is Student {
  if (!isRecord(value)) return false;

  return (
    typeof value.student_name === "string" &&
    typeof value.student_id === "string" &&
    typeof value.programme === "string" &&
    (typeof value.last_login === "string" || value.last_login === null) &&
    typeof value.registered_at === "string"
  );
}

export async function getStudents(): Promise<Student[]> {
  const apiUrl = process.env.PHP_STUDENTS_API_URL;
  const apiToken = process.env.STUDENTS_API_TOKEN;
  if (!apiUrl || !apiToken) {
    throw new Error(
      "PHP_STUDENTS_API_URL and STUDENTS_API_TOKEN must be configured in .env.local.",
    );
  }

  const response = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`PHP student API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !Array.isArray(payload.students) ||
    !payload.students.every(isStudent)
  ) {
    throw new Error("PHP student API returned an invalid response.");
  }

  return payload.students;
}
