"use client";

import { createContext, useContext, type ReactNode } from "react";

type AuthContextValue = {
  isLoggedIn: boolean;
  username: string | null;
  isHsuStaff: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  username: null,
  isHsuStaff: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
  username,
  isHsuStaff,
}: {
  children: ReactNode;
  username: string | null;
  isHsuStaff: boolean;
}) {
  return (
    <AuthContext.Provider value={{ isLoggedIn: username !== null, username, isHsuStaff }}>
      {children}
    </AuthContext.Provider>
  );
}
