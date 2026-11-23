"use client"
import { useState, type FormEvent } from "react"
import Link from "next/link";
import '/css/common.css'

export default function Register() {
  const [message, setMessage] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "").trim()

    if (!username) {
      setMessage("Enter your username.")
      return
    }

    setMessage(`Registration form received for ${username}`)
  }

  return (
      <div>
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
        <p aria-live="polite" role="status">{message}</p>
      </div>
  );
}