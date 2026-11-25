export type UserAccount = {
  account_id: number;
  username: string;
  is_hsu_student: boolean;
  is_hsu_staff: boolean;
  student_id: string | null;
  staff_number: string | null;
  entrance_year: number | null;
  programme: string | null;
  heard_about: string | null;
  registered_at: string;
};

type UserAccountPayload = Omit<UserAccount, "is_hsu_student" | "is_hsu_staff"> & {
  is_hsu_student: boolean | 0 | 1;
  is_hsu_staff: boolean | 0 | 1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === "number" || value === null;
}

function isUserAccount(value: unknown): value is UserAccountPayload {
  if (!isRecord(value)) return false;

  return (
    typeof value.account_id === "number" &&
    typeof value.username === "string" &&
    (value.is_hsu_student === true || value.is_hsu_student === false ||
      value.is_hsu_student === 0 || value.is_hsu_student === 1) &&
    (value.is_hsu_staff === true || value.is_hsu_staff === false ||
      value.is_hsu_staff === 0 || value.is_hsu_staff === 1) &&
    isNullableString(value.student_id) &&
    isNullableString(value.staff_number) &&
    isNullableNumber(value.entrance_year) &&
    isNullableString(value.programme) &&
    isNullableString(value.heard_about) &&
    typeof value.registered_at === "string"
  );
}

export async function getUserAccounts(): Promise<UserAccount[]> {
  const apiUrl = process.env.PHP_USER_ACCOUNTS_API_URL;
  const apiToken = process.env.STUDENTS_API_TOKEN;
  if (!apiUrl || !apiToken) {
    throw new Error(
      "PHP_USER_ACCOUNTS_API_URL and STUDENTS_API_TOKEN must be configured in .env.local.",
    );
  }

  const response = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`PHP user accounts API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !Array.isArray(payload.accounts) ||
    !payload.accounts.every(isUserAccount)
  ) {
    throw new Error("PHP user accounts API returned an invalid response.");
  }

  return payload.accounts.map((account) => ({
    ...account,
    is_hsu_student: account.is_hsu_student === true || account.is_hsu_student === 1,
    is_hsu_staff: account.is_hsu_staff === true || account.is_hsu_staff === 1,
  }));
}
