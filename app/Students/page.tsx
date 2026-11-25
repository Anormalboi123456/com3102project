import { connection } from "next/server";
import { cookies } from "next/headers";
import { getUserAccounts } from "@/lib/user-accounts";
import type { UserAccount } from "@/lib/user-accounts";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export default async function StudentsPage() {
  await connection();

  const cookieStore = await cookies();
  let session = null;
  try {
    session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  } catch (error) {
    console.error("Could not verify the session on the user accounts page:", error);
  }

  let accounts: UserAccount[] = [];
  let apiError = false;

  if (session?.isHsuStaff) {
    try {
      accounts = await getUserAccounts();
    } catch (error) {
      console.error("Failed to render the user accounts page:", error);
      apiError = true;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold">User accounts</h1>
      <p className="mb-6 text-gray-600">
        Registered accounts fetched from the PHP API.
      </p>
      {/*isHsuStaff, check the user is staff from the value passed from getUserAccount(should get is student/is staff) */}
      {!session ? (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900" role="alert">
          Log in to view user accounts.
        </p>
      ) : !session.isHsuStaff ? (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900" role="alert">
          HSU staff access is required to view user accounts.
        </p>
      ) : apiError ? (
        <p className="rounded border border-red-300 bg-red-50 p-4 text-red-800" role="alert">
          Could not load user accounts. Check that XAMPP Apache and MySQL are
          running and that the user accounts PHP endpoint is configured correctly.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Username</th>
                <th className="p-3">HSU student</th>
                <th className="p-3">HSU staff</th>
                <th className="p-3">Student ID</th>
                <th className="p-3">Staff number</th>
                <th className="p-3">Entrance year</th>
                <th className="p-3">Programme</th>
                <th className="p-3">Heard about</th>
                <th className="p-3">Registered at</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={9}>
                    No user accounts found. Register an account to see it here.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr className="border-t border-gray-200" key={account.account_id}>
                    <td className="p-3">{account.username}</td>
                    <td className="p-3">{account.is_hsu_student ? "Yes" : "No"}</td>
                    <td className="p-3">{account.is_hsu_staff ? "Yes" : "No"}</td>
                    <td className="p-3">{account.student_id ?? "—"}</td>
                    <td className="p-3">{account.staff_number ?? "—"}</td>
                    <td className="p-3">{account.entrance_year ?? "—"}</td>
                    <td className="p-3">{account.programme ?? "—"}</td>
                    <td className="p-3">{account.heard_about ?? "—"}</td>
                    <td className="p-3">{account.registered_at}</td>
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
