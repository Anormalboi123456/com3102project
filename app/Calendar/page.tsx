"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

type CalendarEvent = {
  event_id: number;
  title: string;
  module_code: string | null;
  event_date: string;
  event_time: string | null;
  event_type: "Assignment" | "Test" | "Exam" | "Event" | "Holiday" | "Personal";
  visibility: "Public" | "HSU" | "Personal";
  description: string | null;
  created_by: string;
  created_by_role: "Staff" | "Student" | "Public";
};

type RegisteredActivity = {
  activity_id: number;
  title: string;
  category: string;
  activity_date: string;
  activity_time: string;
  location: string;
  audience: string;
  description: string | null;
};

type DisplayItem = {
  key: string;
  source: "calendar" | "activity";
  id: number;
  title: string;
  date: string;
  time: string | null;
  type: "Assignment" | "Test" | "Exam" | "Event" | "Holiday" | "Personal" | "Activity";
  moduleOrLocation: string;
  visibility: string;
  description: string | null;
  createdBy: string | null;
  canDelete: boolean;
};

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDaysUntil(targetDateStr: string, todayStr: string): number {
  const [ty, tm, td] = targetDateStr.split("-").map(Number);
  const [cy, cm, cd] = todayStr.split("-").map(Number);
  const target = Date.UTC(ty, tm - 1, td);
  const current = Date.UTC(cy, cm - 1, cd);
  return Math.round((target - current) / 86_400_000);
}

function getDotClass(type: DisplayItem["type"]): string {
  switch (type) {
    case "Assignment":
      return "dot-assignment";
    case "Test":
      return "dot-test";
    case "Exam":
      return "dot-exam";
    case "Holiday":
      return "dot-holiday";
    case "Personal":
      return "dot-personal";
    case "Activity":
      return "dot-activity";
    default:
      return "dot-event";
  }
}

function getPillClass(type: DisplayItem["type"]): string {
  switch (type) {
    case "Assignment":
      return "pill-tag pill-danger";
    case "Test":
    case "Activity":
      return "pill-tag pill-warn";
    case "Exam":
      return "pill-tag pill-purple";
    case "Holiday":
      return "pill-tag pill-info";
    default:
      return "pill-tag";
  }
}

export default function CalendarPage() {
  const { isLoggedIn, username, role } = useAuth();
  const todayStr = useMemo(() => toLocalIsoDate(new Date()), []);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [registeredActivities, setRegisteredActivities] = useState<RegisteredActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Calendar view state
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Add event form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [eventDate, setEventDate] = useState(todayStr);
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["event_type"]>(
    role === "Staff" ? "Assignment" : "Personal",
  );
  const [visibility, setVisibility] = useState<CalendarEvent["visibility"]>(
    role === "Staff" ? "HSU" : "Personal",
  );
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar", { cache: "no-store" });
      const data = (await res.json()) as {
        success?: boolean;
        events?: CalendarEvent[];
        registeredActivities?: RegisteredActivity[];
        error?: string;
      };
      if (!res.ok || !data.success) {
        setError(data.error || "Could not load Academic Calendar.");
        return;
      }
      setEvents(Array.isArray(data.events) ? data.events : []);
      setRegisteredActivities(
        Array.isArray(data.registeredActivities) ? data.registeredActivities : [],
      );
    } catch {
      setError("Network error while loading Academic Calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (role === "Staff") {
      setEventType("Assignment");
      setVisibility("HSU");
    } else {
      setEventType("Personal");
      setVisibility("Personal");
    }
  }, [role]);

  const allItems = useMemo<DisplayItem[]>(() => {
    const calItems: DisplayItem[] = events.map((e) => ({
      key: `cal-${e.event_id}`,
      source: "calendar",
      id: e.event_id,
      title: e.title,
      date: e.event_date,
      time: e.event_time,
      type: e.event_type,
      moduleOrLocation: e.module_code || "University-wide",
      visibility: e.visibility,
      description: e.description,
      createdBy: e.created_by,
      canDelete:
        role === "Staff" ||
        (isLoggedIn && e.visibility === "Personal" && e.created_by === username),
    }));

    const actItems: DisplayItem[] = registeredActivities.map((a) => ({
      key: `act-${a.activity_id}`,
      source: "activity",
      id: a.activity_id,
      title: `[Activity] ${a.title}`,
      date: a.activity_date,
      time: a.activity_time,
      type: "Activity",
      moduleOrLocation: a.location,
      visibility: "Synced Registration",
      description: a.description,
      createdBy: null,
      canDelete: false,
    }));

    return [...calItems, ...actItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [events, registeredActivities, role, isLoggedIn, username]);

  // Deadlines within next 7 days
  const upcomingAlerts = useMemo(() => {
    return allItems.filter((item) => {
      if (item.type !== "Assignment" && item.type !== "Test" && item.type !== "Exam") {
        return false;
      }
      const diff = getDaysUntil(item.date, todayStr);
      return diff >= 0 && diff <= 7;
    });
  }, [allItems, todayStr]);

  // Map date -> DisplayItems for calendar dots
  const itemsByDate = useMemo(() => {
    const map = new Map<string, DisplayItem[]>();
    for (const item of allItems) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [allItems]);

  // Filtered list for right/bottom panel
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      if (selectedDate && item.date !== selectedDate) return false;
      if (typeFilter !== "All" && item.type !== typeFilter) return false;
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !item.moduleOrLocation.toLowerCase().includes(q) &&
        !(item.description ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [allItems, selectedDate, typeFilter, searchQuery]);

  // Month grid cells
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("en-HK", {
    month: "long",
    year: "numeric",
  });
  const gridCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function jumpToToday() {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(null);
  }

  async function handleAddEvent(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          module_code: moduleCode.trim(),
          event_date: eventDate,
          event_time: eventTime.trim(),
          event_type: eventType,
          visibility: role === "Staff" ? visibility : "Personal",
          description: description.trim(),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to add calendar event.");
        return;
      }

      setTitle("");
      setModuleCode("");
      setEventTime("");
      setDescription("");
      setShowAddForm(false);
      setNotice("Event added to Academic Calendar.");
      await loadCalendar();
    } catch {
      setError("Network error while adding calendar event.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEvent(eventId: number, itemTitle: string) {
    if (!window.confirm(`Delete "${itemTitle}" from the calendar?`)) return;
    setNotice(null);
    setError(null);

    try {
      const res = await fetch("/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Could not delete event.");
        return;
      }
      setNotice("Event removed from calendar.");
      await loadCalendar();
    } catch {
      setError("Network error while deleting event.");
    }
  }

  return (
    <div className="home-wrap">
      <h1 className="home-title">Academic Calendar</h1>
      <p className="home-muted">
        Track HSU assessment deadlines, university dates, personal reminders, and your registered campus activities in one place.
      </p>

      {/* ROLE STATUS BANNER */}
      <div className="role-banner">
        <div>
          <span
            className={`role-badge ${
              role === "Staff"
                ? "role-badge-staff"
                : role === "Student"
                  ? "role-badge-student"
                  : "role-badge-public"
            }`}
          >
            {role} Mode
          </span>{" "}
          {role === "Staff" && (
            <span>
              Signed in as <b>{username}</b>. You can publish &amp; manage official HSU assessments and public dates.
            </span>
          )}
          {role === "Student" && (
            <span>
              Signed in as <b>{username}</b>. Viewing official HSU deadlines, your personal reminders, and registered activities.
            </span>
          )}
          {role === "Public" && isLoggedIn && (
            <span>
              Signed in as <b>{username}</b> (Public). Viewing public university dates and your personal reminders.
            </span>
          )}
          {!isLoggedIn && (
            <span>
              Viewing public HSU dates.{" "}
              <Link className="section-link" href="/Login">
                Log in
              </Link>{" "}
              to see module deadlines, personal reminders, and synced activities.
            </span>
          )}
        </div>

        {isLoggedIn && (
          <button
            type="button"
            className="home-button btn-small"
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            {showAddForm
              ? "Close Form"
              : role === "Staff"
                ? "+ Publish Assessment / Event"
                : "+ Add Personal Reminder"}
          </button>
        )}
      </div>

      {error && (
        <div className="status-error" role="alert">
          {error}
        </div>
      )}
      {notice && <div className="home-ok" style={{ marginBottom: "1rem" }}>{notice}</div>}

      {/* UPCOMING DEADLINES ALERT (NEXT 7 DAYS) */}
      {upcomingAlerts.length > 0 && (
        <div className="alert-banner">
          <h3>⏰ Upcoming Assessment Deadlines (Next 7 Days)</h3>
          {upcomingAlerts.map((item) => {
            const diff = getDaysUntil(item.date, todayStr);
            const badgeText =
              diff === 0 ? "Due Today!" : diff === 1 ? "Due Tomorrow!" : `Due in ${diff} days`;
            return (
              <div className="alert-item" key={item.key}>
                <div>
                  <b>{item.date}</b> — {item.title}{" "}
                  {item.moduleOrLocation !== "University-wide" && (
                    <span className="pill-tag">{item.moduleOrLocation}</span>
                  )}{" "}
                  <span className={getPillClass(item.type)}>{item.type}</span>
                </div>
                <span className="countdown-chip">{badgeText}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD EVENT FORM */}
      {showAddForm && isLoggedIn && (
        <div className="home-card">
          <h2>
            {role === "Staff"
              ? "Publish Official Assessment / University Event"
              : "Add Personal Study Reminder"}
          </h2>
          <form onSubmit={handleAddEvent}>
            <div className="form-grid-2">
              <div>
                <label className="home-label" htmlFor="cal-title">Title *</label>
                <input
                  id="cal-title"
                  className="home-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. COM3102 Final Report Submission"
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <label className="home-label" htmlFor="cal-module">Module Code (Optional)</label>
                <input
                  id="cal-module"
                  className="home-input"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  placeholder="e.g. COM3102"
                  maxLength={32}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="home-label" htmlFor="cal-date">Date *</label>
                <input
                  id="cal-date"
                  type="date"
                  className="home-input"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="home-label" htmlFor="cal-time">Time (Optional)</label>
                <input
                  id="cal-time"
                  className="home-input"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="e.g. 23:59 or 14:00 - 16:00"
                  maxLength={64}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="home-label" htmlFor="cal-type">Event Type</label>
                <select
                  id="cal-type"
                  className="home-input"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as CalendarEvent["event_type"])}
                >
                  {role === "Staff" ? (
                    <>
                      <option value="Assignment">Assignment Deadline</option>
                      <option value="Test">Test / Quiz</option>
                      <option value="Exam">Examination</option>
                      <option value="Event">University Event</option>
                      <option value="Holiday">Public Holiday</option>
                      <option value="Personal">Personal Note</option>
                    </>
                  ) : (
                    <>
                      <option value="Personal">Personal Reminder</option>
                      <option value="Assignment">Personal Assignment Note</option>
                      <option value="Test">Personal Test Prep</option>
                      <option value="Exam">Personal Exam Prep</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="home-label" htmlFor="cal-visibility">Visibility</label>
                {role === "Staff" ? (
                  <select
                    id="cal-visibility"
                    className="home-input"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as CalendarEvent["visibility"])}
                  >
                    <option value="HSU">HSU Students &amp; Staff Only</option>
                    <option value="Public">Public (Everyone)</option>
                    <option value="Personal">Personal (Only Me)</option>
                  </select>
                ) : (
                  <input
                    id="cal-visibility"
                    className="home-input"
                    value="Personal (Visible only to you)"
                    disabled
                  />
                )}
              </div>
            </div>

            <label className="home-label" htmlFor="cal-desc">Description / Notes</label>
            <textarea
              id="cal-desc"
              className="home-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Location, submission link, or study notes..."
              rows={2}
            />

            <button className="home-button" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save to Calendar"}
            </button>
          </form>
        </div>
      )}

      {/* MAIN CALENDAR GRID */}
      <div className="home-card">
        <div className="cal-toolbar">
          <h2 style={{ margin: 0 }}>{monthLabel}</h2>
          <div className="cal-nav-group">
            <button type="button" className="btn-secondary" onClick={prevMonth}>
              ← Prev
            </button>
            <button type="button" className="btn-secondary" onClick={jumpToToday}>
              Today
            </button>
            <button type="button" className="btn-secondary" onClick={nextMonth}>
              Next →
            </button>
          </div>
        </div>

        <table className="cal-grid-table">
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
            {Array.from({ length: Math.ceil(gridCells.length / 7) }).map((_, weekIdx) => (
              <tr key={weekIdx}>
                {gridCells.slice(weekIdx * 7, weekIdx * 7 + 7).map((dayNum, dayIdx) => {
                  if (dayNum === null) {
                    return <td key={dayIdx} className="cal-cell-empty" />;
                  }
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const dayItems = itemsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <td
                      key={dayIdx}
                      className={`${isToday ? "cal-cell-today" : ""} ${isSelected ? "cal-cell-selected" : ""}`}
                      onClick={() =>
                        setSelectedDate((prev) => (prev === dateStr ? null : dateStr))
                      }
                      title={
                        dayItems.length > 0
                          ? dayItems.map((x) => `${x.type}: ${x.title}`).join("\n")
                          : "Click to filter by this date"
                      }
                    >
                      <div className="cal-day-num">{dayNum}</div>
                      <div className="cal-dots-wrap">
                        {dayItems.slice(0, 6).map((item) => (
                          <span
                            key={item.key}
                            className={`cal-dot-tag ${getDotClass(item.type)}`}
                          />
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="legend-row">
          <span className="legend-item"><span className="cal-dot-tag dot-assignment" /> Assignment</span>
          <span className="legend-item"><span className="cal-dot-tag dot-test" /> Test</span>
          <span className="legend-item"><span className="cal-dot-tag dot-exam" /> Exam</span>
          <span className="legend-item"><span className="cal-dot-tag dot-event" /> University Event</span>
          <span className="legend-item"><span className="cal-dot-tag dot-holiday" /> Holiday</span>
          <span className="legend-item"><span className="cal-dot-tag dot-personal" /> Personal</span>
          <span className="legend-item"><span className="cal-dot-tag dot-activity" /> Registered Activity</span>
        </div>
      </div>

      {/* EVENT LIST & FILTERS */}
      <div className="home-card">
        <div className="section-header-row">
          <h2>
            {selectedDate ? `Schedule for ${selectedDate}` : "All Upcoming Schedule Items"}
          </h2>
          {selectedDate && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedDate(null)}
            >
              Show All Dates
            </button>
          )}
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by event type"
          >
            <option value="All">All Types</option>
            <option value="Assignment">Assignment</option>
            <option value="Test">Test</option>
            <option value="Exam">Exam</option>
            <option value="Event">University Event</option>
            <option value="Holiday">Holiday</option>
            <option value="Personal">Personal</option>
            <option value="Activity">Registered Activity</option>
          </select>

          <input
            className="filter-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, module (e.g. COM3102), or location..."
          />
        </div>

        {loading ? (
          <p className="home-muted">Loading calendar...</p>
        ) : filteredItems.length === 0 ? (
          <p className="home-muted">
            No matching calendar items found.
          </p>
        ) : (
          filteredItems.map((item) => (
            <div className={`event-list-card type-${item.type}`} key={item.key}>
              <div className="section-header-row" style={{ marginBottom: "0.35rem" }}>
                <div>
                  <b>{item.date}</b>
                  {item.time ? ` (${item.time})` : ""} — <b>{item.title}</b>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span className={getPillClass(item.type)}>{item.type}</span>
                  <span className="pill-tag">{item.moduleOrLocation}</span>
                  <span className="pill-tag pill-info">{item.visibility}</span>
                </div>
              </div>

              {item.description && (
                <p className="home-muted" style={{ marginBottom: "0.4rem" }}>
                  {item.description}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <span className="home-note">
                  {item.source === "activity"
                    ? "Auto-synced from Campus Activities"
                    : `Posted by ${item.createdBy ?? "HSU"}`}
                </span>

                {item.source === "activity" ? (
                  <Link className="section-link" href="/Activities">
                    Manage Registration on Activities →
                  </Link>
                ) : item.canDelete ? (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleDeleteEvent(item.id, item.title)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
