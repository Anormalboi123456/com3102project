"use client"
import { useState, type FormEvent } from "react"
import '../../css/common.css'
import Link from "next/link"

export default function Login() {
    const [message, setMessage] = useState("")

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const formData = new FormData(event.currentTarget)
        const username = String(formData.get("username") ?? "").trim()
        const password = String(formData.get("password") ?? "")

        if (!username || !password) {
            setMessage("Please enter your username and password.")
            return
        }

        setMessage(`Login form received for ${username}`)
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