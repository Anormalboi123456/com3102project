"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserRole } from "@/lib/session";
import { roleFromFlags } from "@/lib/session";

type AuthContextValue = {
  isLoggedIn: boolean;
  username: string | null;
  isHsuStaff: boolean;
  isHsuStudent: boolean;
  role: UserRole;
};

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  username: null,
  isHsuStaff: false,
  isHsuStudent: false,
  role: "Public",
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
  username,
  isHsuStaff,
  isHsuStudent,
}: {
  children: ReactNode;
  username: string | null;
  isHsuStaff: boolean;
  isHsuStudent: boolean;
}) {
  const role = roleFromFlags(isHsuStaff, isHsuStudent);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: username !== null,
        username,
        isHsuStaff,
        isHsuStudent,
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
