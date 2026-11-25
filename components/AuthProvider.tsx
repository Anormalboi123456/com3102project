"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

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
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");

  async function logout() {
    setLogoutError("");
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) {
        console.error(`Logout failed with HTTP ${response.status}.`);
        setLogoutError("Could not log out. Please try again.");
        return;
      }
      router.replace("/Login");
      router.refresh();
    } catch (error) {
      console.error("Could not reach the logout route:", error);
      setLogoutError("Could not log out. Please try again.");
    }
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn: username !== null, username, isHsuStaff }}>
      <div className="login-page">
        <table className="menutable">
          <tbody>
            <tr>
              <td>
                <Image
                  src="/resources/HSU_logo_2.png"
                  className="menuimage slide-in"
                  alt="HSU logo"
                  width={3244}
                  height={816}
                />
              </td>
              <td colSpan={2}>
                <h1 className="slide-in">Welcome to Hang Sheng University App!</h1>
              </td>
              <td className="login-cell">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isHsuStaff && (
                    <Link
                      className="slide-in inline-flex items-center rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white"
                      href="/Students"
                    >
                      Database
                    </Link>
                  )}
                  {username ? (
                    <span className="home-login-link slide-in">
                      <Image
                        src="/resources/user_icon.png"
                        className="home-login-icon"
                        alt=""
                        width={512}
                        height={512}
                      />
                      {username}
                      <button className="ml-2 underline" type="button" onClick={logout}>
                        Log out
                      </button>
                      {logoutError && <span role="alert">{logoutError}</span>}
                    </span>
                  ) : (
                    <Link className="home-login-link slide-in" href="/Login">
                      <Image
                        src="/resources/user_icon.png"
                        className="home-login-icon"
                        alt=""
                        width={512}
                        height={512}
                      />
                      Log in
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="buttontable">
          <tbody>
            <tr>
              <td>
                <Link
                  className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                  href="/Homepage"
                >
                  Home
                </Link>
              </td>
              <td>
                <Link
                  className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                  href="/About"
                >
                  About Us
                </Link>
              </td>
              <td>
                <Link
                  className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                  href="/About"
                >
                  Test
                </Link>
              </td>
              <td>
                <Link
                  className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                  href="/About"
                >
                  Test
                </Link>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="page-spacer" aria-hidden="true" />
      </div>
      {children}
    </AuthContext.Provider>
  );
}
