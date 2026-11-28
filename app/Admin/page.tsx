import { connection } from "next/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { SESSION_COOKIE_NAME, verifySessionToken, roleFromFlags } from "@/lib/session";

export default async function AdminPage() {
  await connection();

  const cookieStore = await cookies();
  let session = null;
  try {
    session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  } catch (error) {
    console.error("Could not verify the session on the admin page:", error);
  }

  const role = session
    ? roleFromFlags(session.isHsuStaff, session.isHsuStudent)
    : "Public";
  const isStaff = role === "Staff";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold">Admin Panel</h1>
      <p className="mb-6 text-gray-600">
        Staff tools for managing user accounts, activities, and calendar events.
      </p>

      {!session ? (
        <p
          className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900"
          role="alert"
        >
          Please{" "}
          <Link className="underline font-medium" href="/Login">
            log in
          </Link>{" "}
          with an HSU staff account to access the admin panel.
        </p>
      ) : !isStaff ? (
        <p
          className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900"
          role="alert"
        >
          HSU staff access is required. You are signed in as{" "}
          <strong>{session.username}</strong> ({role}).
        </p>
      ) : (
        <>
          <p className="mb-6 text-sm text-gray-700">
            Signed in as <strong>{session.username}</strong> · Staff Mode
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/Students"
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-500 hover:shadow"
            >
              <h2 className="mb-1 text-lg font-semibold text-green-800">
                User accounts
              </h2>
              <p className="text-sm text-gray-600">
                View all registered accounts (students, staff, and public).
              </p>
            </Link>

            <Link
              href="/Activities"
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-500 hover:shadow"
            >
              <h2 className="mb-1 text-lg font-semibold text-green-800">
                Activities
              </h2>
              <p className="text-sm text-gray-600">
                Create, edit, and manage campus activities (Staff mode).
              </p>
            </Link>

            <Link
              href="/Calendar"
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-500 hover:shadow"
            >
              <h2 className="mb-1 text-lg font-semibold text-green-800">
                Calendar
              </h2>
              <p className="text-sm text-gray-600">
                Manage assignments and HSU-wide calendar events.
              </p>
            </Link>

            <Link
              href="/Register"
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-500 hover:shadow"
            >
              <h2 className="mb-1 text-lg font-semibold text-green-800">
                Register account
              </h2>
              <p className="text-sm text-gray-600">
                Create a new student, staff, or public account.
              </p>
            </Link>
          </div>

          <div className="mt-8 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-medium mb-1">Staff tips</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                On <strong>Activities</strong> and <strong>Calendar</strong>,
                your role badge shows &quot;Staff Mode&quot; so you can create
                and manage content.
              </li>
              <li>
                Register a staff account by choosing YES for staff and entering
                a staff number on the Register page.
              </li>
              <li>
                Ensure the updated <code>php-api/login.php</code> is copied into
                your XAMPP folder so student status is returned on login.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
