import { connection, NextResponse } from "next/server";
import { getStudents } from "@/lib/students";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: Request) {
  await connection();

  const apiToken = process.env.STUDENTS_API_TOKEN;
  if (!apiToken) {
    console.error("STUDENTS_API_TOKEN is not configured.");
    return NextResponse.json(
      { error: true, message: "Student API is not configured." },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${apiToken}`) {
    return NextResponse.json(
      { error: true, message: "Unauthorized. A valid bearer token is required." },
      { status: 401 },
    );
  }

  try {
    const students = await getStudents();
    const format = new URL(request.url).searchParams.get("format")?.toLowerCase();

    if (format === "xml") {
      const studentXml = students
        .map(
          (student) => `  <student>
    <student_name>${escapeXml(student.student_name)}</student_name>
    <student_id>${escapeXml(student.student_id)}</student_id>
    <programme>${escapeXml(student.programme)}</programme>
    <last_login>${escapeXml(student.last_login ?? "")}</last_login>
    <registered_at>${escapeXml(student.registered_at)}</registered_at>
  </student>`,
        )
        .join("\n");

      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>\n<students>\n${studentXml}\n</students>`,
        {
          status: 200,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        },
      );
    }

    return NextResponse.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Failed to load students from MariaDB:", error);
    return NextResponse.json(
      { error: true, message: "Unable to load students from the database." },
      { status: 503 },
    );
  }
}
