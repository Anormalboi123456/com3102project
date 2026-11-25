type LoginRequest = {
  username: string;
  password: string;
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
    credentials.password.length <= 4096
  );
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
      }),
      cache: "no-store",
    });

    if (response.status === 200) {
      return Response.json({ success: true });
    }

    if (response.status === 401) {
      return Response.json({ error: "Incorrect username or password." }, { status: 401 });
    }

    console.error(`PHP login API returned HTTP ${response.status}.`);
    return Response.json({ error: "Login service is unavailable." }, { status: 502 });
  } catch (error) {
    console.error("Could not reach the PHP login API:", error);
    return Response.json({ error: "Login service is unavailable." }, { status: 502 });
  }
}
