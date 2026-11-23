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
            setMessage("Enter both your username and password.")
            return
        }

        setMessage(`Login form received for ${username}`)
    }

    return(
        //header
    <div className="login-page">
<table className='menutable'>
<tbody>
<tr>
    <td><img src='/resources/HSU_logo.jpg' className='menuimage slide-in' alt='HSU logo' /></td>
    <td><h1 className="slide-in">Welcome to Login</h1></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/Login">Log in</Link></td>
</tr>
<tr>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/">Home</Link></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/About">About Us</Link></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/About">Test</Link></td>
</tr>
</tbody>
</table>
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
    </div>
    <p aria-live="polite" role="status">{message}</p>
</form>
<table className='menutable'>
    <tbody>
        <tr>
            <td>Contact Us</td>
            <td>reutn to top</td>
            <td>About us</td>
        </tr>
    </tbody>
</table>
</div>
)}