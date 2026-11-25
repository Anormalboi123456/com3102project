"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import "../../css/common.css"

export default function Register() {
  const [message, setMessage] = useState("")
  const [isHsuStudent, setIsHsuStudent] = useState<"yes" | "no" | "">("")
  const [redirectSeconds, setRedirectSeconds] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (redirectSeconds === null) return

    const timer = window.setTimeout(() => {
      if (redirectSeconds === 1) {
        router.replace("/Login")
      } else {
        setRedirectSeconds(redirectSeconds - 1)
      }
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [redirectSeconds, router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!username || !password) {
      setMessage("Enter your username and password.")
      return
    }

    const payload = {
      username,
      password,
      isHsuStudent: formData.get("isHsuStudent") === "yes",
      studentId: String(formData.get("student_id") ?? "") || null,
      entranceYear: String(formData.get("entrance_year") ?? "") || null,
      programme: String(formData.get("programme") ?? "") || null,
      heardAbout: String(formData.get("heard_about") ?? "") || null,
    }

    setMessage("Submitting registration...")
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        setMessage(`Registration failed (HTTP ${response.status}). Please contact HSU Registry.`)
        return
      }

      setMessage("")
      setRedirectSeconds(3)
    } catch {
      setMessage("Could not connect to the registration service. Please try again.")
    }
  }

  return (
    <div className="login-page">
      <form
        className="mx-auto mt-8 flex w-fit flex-col gap-4"
        onSubmit={handleSubmit}
        onReset={() => {
          setMessage("")
          setIsHsuStudent("")
          setRedirectSeconds(null)
        }}
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
          <span>Password:</span>
          <input
            className="login-input slide-in"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend>Are you a HSU student?</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input
                name="isHsuStudent"
                type="radio"
                value="yes"
                checked={isHsuStudent === "yes"}
                onChange={() => setIsHsuStudent("yes")}
              />
              Yes
            </label>
            <label className="flex items-center gap-1">
              <input
                name="isHsuStudent"
                type="radio"
                value="no"
                checked={isHsuStudent === "no"}
                onChange={() => setIsHsuStudent("no")}
              />
              No
            </label>
          </div>
        </fieldset>

        {isHsuStudent === "yes" && (
          <>
            <label className="flex flex-col gap-1">
              <span>Student ID</span>
              <input
                className="login-input slide-in"
                name="student_id"
                type="text"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Year of entrance</span>
              <input
                className="login-input slide-in"
                name="entrance_year"
                type="text"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Programme</span>
              <input
                className="login-input slide-in"
                name="programme"
                type="text"
                required
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1">
          <span>How did you hear about this application?</span>
          <input
            className="login-input slide-in"
            name="heard_about"
            type="text"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
            Register
          </button>
          <button className="rounded border border-blue-500 px-4 py-2" type="reset">
            Reset
          </button>
          <Link className="rounded bg-blue-600 px-4 py-2 text-white" href="/Login">
            Log in
          </Link>
        </div>
        <p aria-live="polite" role="status">
          {redirectSeconds === null
            ? message
            : `Registration successful. Redirecting in ${redirectSeconds} second${redirectSeconds === 1 ? "" : "s"}...`}
        </p>
      </form>
    </div>
  )
}
