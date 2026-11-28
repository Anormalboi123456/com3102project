"use client";

import { useEffect, useState } from "react";

type LatestItem = {
  date: string;
  title: string;
  type: string;
  module: string;
};

type ActivityItem = {
  date: string;
  title: string;
  place: string;
  desc: string;
};

export default function Homepage() {
  const [latest, setLatest] = useState<LatestItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [calRes, actRes] = await Promise.all([
          fetch("/api/calendar", { cache: "no-store" }),
          fetch("/api/activities", { cache: "no-store" }),
        ]);

        const calData = await calRes.json();
        const actData = await actRes.json();

        // Map calendar events → Latest table
        const events = Array.isArray(calData.events) ? calData.events : [];
        const mappedLatest: LatestItem[] = events
          .slice(0, 6)
          .map((e: any) => ({
            date: e.event_date,
            title: e.title,
            type: e.event_type || "Event",
            module: e.module_code || "-",
          }));

        // Map activities
        const acts = Array.isArray(actData.activities) ? actData.activities : [];
        const mappedActs: ActivityItem[] = acts
          .slice(0, 5)
          .map((a: any) => ({
            date: a.activity_date,
            title: a.title,
            place: a.location || "HSU Campus",
            desc: a.description
              ? a.description.length > 80
                ? a.description.slice(0, 80) + "…"
                : a.description
              : "",
          }));

        setLatest(mappedLatest);
        setActivities(mappedActs);
      } catch (err) {
        console.error("Homepage data load failed", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Calendar mini view
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString("en-HK", { month: "long", year: "numeric" });

  const eventDays = new Set(
    latest.map((x) => Number(x.date?.split("-")[2])).filter((n) => !isNaN(n))
  );

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Contact Us
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  function sendContact() {
    if (!name || !email || !message) {
      alert("Please fill in name, email and message.");
      return;
    }
    setSent(true);
  }

  return (
    <>
      <div className="home-wrap">
        <h1 className="home-title">Homepage</h1>
        <p className="home-muted">One hub for Student · Staff · Public.</p>

        {/* 1. LATEST TABLE */}
        <div className="home-card">
          <h2>📌 Latest</h2>
          {loading ? (
            <p className="home-muted">Loading latest events…</p>
          ) : latest.length === 0 ? (
            <p className="home-muted">No upcoming events yet.</p>
          ) : (
            <table className="home-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Module</th>
                </tr>
              </thead>
              <tbody>
                {[...latest]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((x, i) => (
                    <tr key={i}>
                      <td>
                        <b>{x.date}</b>
                      </td>
                      <td>{x.title}</td>
                      <td>
                        <span className="home-pill">{x.type}</span>
                      </td>
                      <td>{x.module}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="home-grid">
          {/* 2. ACTIVITIES */}
          <div className="home-card">
            <h2>🎉 Activities</h2>
            {loading ? (
              <p className="home-muted">Loading activities…</p>
            ) : activities.length === 0 ? (
              <p className="home-muted">No activities scheduled.</p>
            ) : (
              activities.map((a, i) => (
                <div className="home-activity" key={i}>
                  <b>{a.date}</b> — {a.title} · {a.place}
                  <br />
                  <span className="home-muted">{a.desc}</span>
                </div>
              ))
            )}
          </div>

          {/* 3. CALENDAR */}
          <div className="home-card">
            <h2>📅 Calendar — {monthName}</h2>
            <table className="home-calendar">
              <thead>
                <tr>
                  <th>Sun</th>
                  <th>Mon</th>
                  <th>Tue</th>
                  <th>Wed</th>
                  <th>Thu</th>
                  <th>Fri</th>
                  <th>Sat</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, week) => (
                  <tr key={week}>
                    {cells.slice(week * 7, week * 7 + 7).map((d, j) => (
                      <td
                        key={j}
                        className={d === today.getDate() ? "home-cal-today" : undefined}
                      >
                        {d ?? ""}
                        {d && eventDays.has(d) ? (
                          <span className="home-cal-dot"> ●</span>
                        ) : (
                          ""
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="home-note">● = has something on that day · Highlighted = today</p>
          </div>
        </div>

        {/* 4. CONTACT US BOX */}
        <div className="home-card">
          <h2>📩 Contact Us</h2>
          <div className="home-contact-info">
            Email: contact@hsu.edu.hk · Room: A201 · Mon–Fri, 9:00–17:00
          </div>
          {sent ? (
            <div className="home-ok">
              Thank you, {name}! We received your message and will reply to {email}.
            </div>
          ) : (
            <>
              <label className="home-label">Your name</label>
              <input
                className="home-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tommy Leung"
              />
              <label className="home-label">Email</label>
              <input
                className="home-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hsu.edu.hk"
              />
              <label className="home-label">Message</label>
              <textarea
                className="home-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What do you want to ask?"
                rows={3}
              />
              <button className="home-button" onClick={sendContact}>
                Send Message
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
