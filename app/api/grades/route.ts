import { getApiToken, getCurrentSession, resolvePhpEndpoint } from "@/lib/php-api";
import { getUserRole } from "@/lib/session";

export async function GET(request: Request) {
  const apiUrl = resolvePhpEndpoint("PHP_GRADES_API_URL", "grades.php");
  const apiToken = getApiToken();

  if (!apiUrl || !apiToken) {
    return Response.json(
      { error: "Grades API is not configured. Check .env.local." },
      { status: 500 },
    );
  }

  const session = await getCurrentSession();
  const role = getUserRole(session);
  const username = session?.username ?? "";

  try {
    const incomingUrl = new URL(request.url);
    const statsOnly = incomingUrl.searchParams.get("stats") === "1";

    const url = new URL(apiUrl);
    if (username && !statsOnly) {
      url.searchParams.set("username", username);
    }
    url.searchParams.set("role", role);
    if (statsOnly) {
      url.searchParams.set("stats", "1");
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({
      error: "Invalid response from Grades PHP API.",
    }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP grades API:", error);
    return Response.json(
      {
        error:
          "Could not reach XAMPP Grades API. Make sure Apache and MySQL are running.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return Response.json({ error: "Please log in first." }, { status: 401 });
  }

  // Only HSU students (or staff for testing) may submit grades
  if (!session.isHsuStudent && !session.isHsuStaff) {
    return Response.json(
      { error: "Only HSU students can submit academic grades." },
      { status: 403 },
    );
  }

  const apiUrl = resolvePhpEndpoint("PHP_GRADES_API_URL", "grades.php");
  const apiToken = getApiToken();
  if (!apiUrl || !apiToken) {
    return Response.json({ error: "Grades API is not configured." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (typeof parsed !== "object" || parsed === null) {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  // Force username from session (never trust client)
  body.username = session.username;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({
      error: "Invalid response from Grades PHP API.",
    }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP grades API for POST:", error);
    return Response.json(
      { error: "Could not reach XAMPP Grades API." },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return Response.json({ error: "Please log in first." }, { status: 401 });
  }

  const apiUrl = resolvePhpEndpoint("PHP_GRADES_API_URL", "grades.php");
  const apiToken = getApiToken();
  if (!apiUrl || !apiToken) {
    return Response.json({ error: "Grades API is not configured." }, { status: 500 });
  }

  try {
    const incomingUrl = new URL(request.url);
    const gradeId = incomingUrl.searchParams.get("grade_id");
    if (!gradeId) {
      return Response.json({ error: "grade_id is required." }, { status: 400 });
    }

    const url = new URL(apiUrl);
    url.searchParams.set("grade_id", gradeId);
    url.searchParams.set("username", session.username);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({
      error: "Invalid response from Grades PHP API.",
    }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP grades API for DELETE:", error);
    return Response.json(
      { error: "Could not reach XAMPP Grades API." },
      { status: 502 },
    );
  }
}