"use client"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import '../../css/common.css'
import Link from "next/link"

export default function Login() {
    const [message, setMessage] = useState("")
    const router = useRouter()

   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()

  const formData = new FormData(event.currentTarget)
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const staffNumber = String(formData.get("staff_number") ?? "").trim()

  if (!username || !password) {
    setMessage("Please enter your username and password.")
    return
  }

  setMessage("Checking...")

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, staffNumber: staffNumber || null }),
    })

    if (response.status === 401) {
      setMessage("Incorrect username or password.")
      return
    }

    if (response.status === 422) {
      setMessage("Enter the staff number registered with this staff account.")
      return
    }

    if (response.status === 403) {
      setMessage("This staff account is missing its staff number. Contact the administrator.")
      return
    }

    if (!response.ok) {
      setMessage(`Login failed (HTTP ${response.status}). Please try again.`)
      return
    }

    router.replace("/Homepage")
    router.refresh()
  } catch {
    setMessage("Could not connect to the login service. Please try again.")
  }
}
    return(
        //header
    <div className="login-page">
<form
    className="mx-auto mt-8 flex w-fit flex-col gap-4"
    onSubmit={handleSubmit}
    onReset={() => setMessage("")}
    action ={""}
>
    <label className="flex flex-col gap-1">
        <span>Username</span>
        <input
            className="login-input slide-in"
            name="username"
            type="text"
            autoComplete="username"
            required
        />
    </label>
    <label className="flex flex-col gap-1">
        <span>Password</span>
        <input
            className="login-input slide-in"
            name="password"
            type="password"
            autoComplete="current-password"
            required
        />
    </label>
    <label className="flex flex-col gap-1">
        <span>Staff number (HSU staff only)</span>
        <input
            className="login-input slide-in"
            name="staff_number"
            type="text"
            autoComplete="off"
        />
    </label>
    <div className="flex flex-wrap gap-2">
        <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
            Log in
        </button>
        <button className="rounded border border-gray-500 px-4 py-2" type="reset">
            Reset
        </button>
        <button
            className="rounded border border-gray-500 px-4 py-2"
            type="button"
            onClick={() => setMessage("Password recovery is not available yet.")}
        >
            Forgot password?
        </button>
        <Link className="rounded bg-blue-600 px-4 py-2 text-white" href='../Register'>
            Register
        </Link>
    </div>
    <p aria-live="polite" role="status">{message}</p>
    </form>
</div>
)}