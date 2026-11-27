import { getApiToken, getCurrentSession, resolvePhpEndpoint } from "@/lib/php-api";
import { getUserRole } from "@/lib/session";

export async function GET() {
  const apiUrl = resolvePhpEndpoint("PHP_CALENDAR_API_URL", "calendar.php");
  const apiToken = getApiToken();

  if (!apiUrl || !apiToken) {
    return Response.json(
      { error: "Calendar API is not configured. Check .env.local." },
      { status: 500 },
    );
  }

  const session = await getCurrentSession();
  const role = getUserRole(session);
  const username = session?.username ?? "";

  try {
    const url = new URL(apiUrl);
    if (username) url.searchParams.set("username", username);
    url.searchParams.set("role", role);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ error: "Invalid response from Calendar PHP API." }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP calendar API:", error);
    return Response.json(
      { error: "Could not reach XAMPP Calendar API. Make sure Apache and MySQL are running." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return Response.json({ error: "Please log in to add calendar events." }, { status: 401 });
  }

  const apiUrl = resolvePhpEndpoint("PHP_CALENDAR_API_URL", "calendar.php");
  const apiToken = getApiToken();
  if (!apiUrl || !apiToken) {
    return Response.json({ error: "Calendar API is not configured." }, { status: 500 });
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

  const role = getUserRole(session);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: body.title,
        module_code: body.module_code ?? "",
        event_date: body.event_date,
        event_time: body.event_time ?? "",
        event_type: body.event_type ?? "Assignment",
        visibility: role === "Staff" ? (body.visibility ?? "HSU") : "Personal",
        description: body.description ?? "",
        created_by: session.username,
        created_by_role: role,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ error: "Invalid response from Calendar PHP API." }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP calendar API:", error);
    return Response.json({ error: "Calendar service is unavailable." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return Response.json({ error: "Please log in to delete calendar events." }, { status: 401 });
  }

  const apiUrl = resolvePhpEndpoint("PHP_CALENDAR_API_URL", "calendar.php");
  const apiToken = getApiToken();
  if (!apiUrl || !apiToken) {
    return Response.json({ error: "Calendar API is not configured." }, { status: 500 });
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

  const role = getUserRole(session);

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_id: body.event_id,
        username: session.username,
        role,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ error: "Invalid response from Calendar PHP API." }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP calendar API:", error);
    return Response.json({ error: "Calendar service is unavailable." }, { status: 502 });
  }
}
