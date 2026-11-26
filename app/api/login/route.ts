import { cookies } from "next/headers";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

type LoginRequest = {
  username: string;
  password: string;
  staffNumber: string | null;
};

function isLoginRequest(value: unknown): value is LoginRequest {
  if (typeof value !== "object" || value === null) return false;

  const credentials = value as Record<string, unknown>;
  return (
    typeof credentials.username === "string" &&
    credentials.username.trim().length > 0 &&
    credentials.username.trim().length <= 80 &&
    typeof credentials.password === "string" &&
    credentials.password.length > 0 &&
    credentials.password.length <= 4096 &&
    (credentials.staffNumber === null ||
      (typeof credentials.staffNumber === "string" && credentials.staffNumber.length <= 32))
  );
}

function getStaffStatus(value: object): boolean | null {
  const result = value as Record<string, unknown>;
  const status = result.isHsuStaff ?? result.is_hsu_staff;

  if (typeof status === "boolean") return status;
  if (status === 1 || status === "1") return true;
  if (status === 0 || status === "0") return false;
  return null;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isLoginRequest(payload)) {
    return Response.json({ error: "Username and password are required." }, { status: 400 });
  }

  const apiUrl = process.env.PHP_LOGIN_API_URL;
  const apiToken = process.env.STUDENTS_API_TOKEN;
  if (!apiUrl || !apiToken) {
    console.error("PHP_LOGIN_API_URL and STUDENTS_API_TOKEN must be configured.");
    return Response.json({ error: "Login service is not configured." }, { status: 500 });
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
        staffNumber: payload.staffNumber?.trim() || null,
      }),
      cache: "no-store",
    });

    if (response.status === 200) {
      let loginResult: unknown;
      try {
        loginResult = await response.json();
      } catch {
        console.error("PHP login API returned an invalid success response.");
        return Response.json({ error: "Login service is unavailable." }, { status: 502 });
      }

      if (
        typeof loginResult !== "object" ||
        loginResult === null ||
        !("success" in loginResult) ||
        loginResult.success !== true
      ) {
        console.error("PHP login API returned an invalid success response.");
        return Response.json({ error: "Login service is unavailable." }, { status: 502 });
      }
{/*Get the user is staff or not */}
      const isHsuStaff = getStaffStatus(loginResult);
      if (isHsuStaff === null) {
        console.error("PHP login API omitted or returned an invalid staff status.");
        return Response.json(
          {
            error:
              "The PHP login endpoint is outdated or missing the staff status. Copy the latest php-api/login.php into XAMPP and try again.",
          },
          { status: 502 },
        );
      }
{/*Write an isHsuStudent later for student only port*/}
      try {
        const sessionToken = createSessionToken(
          payload.username.trim(),
          isHsuStaff,
        );
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: SESSION_MAX_AGE_SECONDS,
        });
      } catch (error) {
        console.error("Could not create the login session:", error);
        return Response.json({ error: "Login service is not configured." }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    if (response.status === 401) {
      return Response.json({ error: "Incorrect username or password." }, { status: 401 });
    }

    if (response.status === 403) {
      return Response.json(
        { error: "This staff account is missing its staff number. Contact the administrator." },
        { status: 403 },
      );
    }

    if (response.status === 422) {
      return Response.json(
        { error: "Enter the staff number registered with this staff account." },
        { status: 422 },
      );
    }

    console.error(`PHP login API returned HTTP ${response.status}.`);
    return Response.json({ error: "Login service is unavailable." }, { status: 502 });
  } catch (error) {
    console.error("Could not reach the PHP login API:", error);
    return Response.json({ error: "Login service is unavailable." }, { status: 502 });
  }
}
