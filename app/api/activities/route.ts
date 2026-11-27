import { getApiToken, getCurrentSession, resolvePhpEndpoint } from "@/lib/php-api";
import { getUserRole } from "@/lib/session";

export async function GET(request: Request) {
  const apiUrl = resolvePhpEndpoint("PHP_ACTIVITIES_API_URL", "activities.php");
  const apiToken = getApiToken();

  if (!apiUrl || !apiToken) {
    return Response.json(
      { error: "Activities API is not configured. Check .env.local." },
      { status: 500 },
    );
  }

  const session = await getCurrentSession();
  const role = getUserRole(session);
  const username = session?.username ?? "";

  try {
    const incomingUrl = new URL(request.url);
    const participantsFor = incomingUrl.searchParams.get("participants");

    const url = new URL(apiUrl);
    if (username) url.searchParams.set("username", username);
    url.searchParams.set("role", role);
    if (participantsFor) {
      if (role !== "Staff") {
        return Response.json(
          { error: "HSU staff access is required to view participants." },
          { status: 403 },
        );
      }
      url.searchParams.set("participants", participantsFor);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ error: "Invalid response from Activities PHP API." }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP activities API:", error);
    return Response.json(
      { error: "Could not reach XAMPP Activities API. Make sure Apache and MySQL are running." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return Response.json({ error: "Please log in first." }, { status: 401 });
  }

  const apiUrl = resolvePhpEndpoint("PHP_ACTIVITIES_API_URL", "activities.php");
  const apiToken = getApiToken();
  if (!apiUrl || !apiToken) {
    return Response.json({ error: "Activities API is not configured." }, { status: 500 });
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
        ...body,
        username: session.username,
        role,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ error: "Invalid response from Activities PHP API." }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP activities API:", error);
    return Response.json({ error: "Activities service is unavailable." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return Response.json({ error: "Please log in first." }, { status: 401 });
  }

  const role = getUserRole(session);
  if (role !== "Staff") {
    return Response.json({ error: "Only HSU Staff can delete activities." }, { status: 403 });
  }

  const apiUrl = resolvePhpEndpoint("PHP_ACTIVITIES_API_URL", "activities.php");
  const apiToken = getApiToken();
  if (!apiUrl || !apiToken) {
    return Response.json({ error: "Activities API is not configured." }, { status: 500 });
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

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activity_id: body.activity_id,
        role,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ error: "Invalid response from Activities PHP API." }));
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Could not reach PHP activities API:", error);
    return Response.json({ error: "Activities service is unavailable." }, { status: 502 });
  }
}
