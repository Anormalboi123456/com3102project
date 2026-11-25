import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";

type RegisterRequest = {
  username: string;
  password: string;
  isHsuStudent: boolean;
  isHsuStaff: boolean;
  studentId: string | null;
  entranceYear: string | null;
  programme: string | null;
  staffNumber: string | null;
  heardAbout: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === "string" && value.length <= maxLength);
}

function isRegisterRequest(value: unknown): value is RegisterRequest {
  if (!isRecord(value)) return false;

  if (
    typeof value.username !== "string" ||
    value.username.trim().length === 0 ||
    value.username.trim().length > 80 ||
    typeof value.password !== "string" ||
    value.password.length === 0 ||
    new TextEncoder().encode(value.password).length > 72 ||
    typeof value.isHsuStudent !== "boolean" ||
    typeof value.isHsuStaff !== "boolean" ||
    !isNullableString(value.studentId, 32) ||
    !isNullableString(value.entranceYear, 5) ||
    !isNullableString(value.programme, 80) ||
    !isNullableString(value.staffNumber, 32) ||
    !isNullableString(value.heardAbout, 255)
  ) {
    return false;
  }

  const validStudentDetails =
    !value.isHsuStudent ||
    (typeof value.studentId === "string" &&
      /^S\d{6}$/i.test(value.studentId.trim()) &&
      typeof value.entranceYear === "string" &&
      /^\d{1,5}$/.test(value.entranceYear) &&
      Number(value.entranceYear) <= 65535 &&
      typeof value.programme === "string" &&
      value.programme.trim().length > 0);
  const validStaffDetails =
    !value.isHsuStaff ||
    (typeof value.staffNumber === "string" && value.staffNumber.trim().length > 0);

  return validStudentDetails && validStaffDetails;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRegisterRequest(payload)) {
    return Response.json(
      { error: "Complete the required account, student, and staff fields." },
      { status: 400 },
    );
  }

  const apiUrl = process.env.PHP_REGISTER_API_URL;
  const apiToken = process.env.STUDENTS_API_TOKEN;
  if (!apiUrl || !apiToken) {
    console.error("PHP_REGISTER_API_URL and STUDENTS_API_TOKEN must be configured.");
    return Response.json({ error: "Registration service is not configured." }, { status: 500 });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: payload.username.trim(),
        password: payload.password,
        isHsuStudent: payload.isHsuStudent,
        isHsuStaff: payload.isHsuStaff,
        studentId: payload.isHsuStudent ? payload.studentId?.trim().toUpperCase() || null : null,
        entranceYear: payload.isHsuStudent ? payload.entranceYear : null,
        programme: payload.isHsuStudent ? payload.programme?.trim() || null : null,
        staffNumber: payload.isHsuStaff ? payload.staffNumber?.trim() || null : null,
        heardAbout: payload.heardAbout?.trim() || null,
      }),
      cache: "no-store",
    });

    if (response.status === 201) {
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE_NAME);
      return Response.json({ success: true }, { status: 201 });
    }

    if (response.status === 409) {
      return Response.json({ error: "That username is already registered." }, { status: 409 });
    }

    if (response.status === 400) {
      return Response.json(
        { error: "Check the registration details and try again." },
        { status: 400 },
      );
    }

    console.error(`PHP registration API returned HTTP ${response.status}.`);
    return Response.json({ error: "Registration service is unavailable." }, { status: 502 });
  } catch (error) {
    console.error("Could not reach the PHP registration API:", error);
    return Response.json({ error: "Registration service is unavailable." }, { status: 502 });
  }
}
