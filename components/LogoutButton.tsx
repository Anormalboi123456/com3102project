"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) {
        console.error(`Logout failed with HTTP ${response.status}.`);
        setError("Could not log out. Please try again.");
        return;
      }

      router.replace("/Login");
      router.refresh();
    } catch (logoutError) {
      console.error("Could not reach the logout route:", logoutError);
      setError("Could not log out. Please try again.");
    }
  }

  return (
    <>
      <button className="ml-2 underline" type="button" onClick={logout}>
        Log out
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
