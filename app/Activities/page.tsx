"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

type Activity = {
  activity_id: number;
  title: string;
  category: "Academic" | "Club" | "Workshop" | "Sports" | "Career" | "Social";
  activity_date: string;
  activity_time: string;
  location: string;
  capacity: number;
  audience: "Public" | "HSU Only";
  description: string | null;
  created_by: string;
  registered_count: number;
  is_registered: boolean;
};

type CalendarAssessment = {
  event_id: number;
  title: string;
  module_code: string | null;
  event_date: string;
  event_type: string;
};

type Participant = {
  registration_id: number;
  username: string;
  registered_at: string;
  is_hsu_student: number | boolean | null;
  is_hsu_staff: number | boolean | null;
  student_id: string | null;
  programme: string | null;
};

const CATEGORIES: Activity["category"][] = [
  "Academic",
  "Club",
  "Workshop",
  "Sports",
  "Career",
  "Social",
];

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ActivitiesPage() {
  const { isLoggedIn, username, role } = useAuth();
  const todayStr = useMemo(() => toLocalIsoDate(new Date()), []);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [assessments, setAssessments] = useState<CalendarAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyActivityId, setBusyActivityId] = useState<number | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [audienceFilter, setAudienceFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Staff: Create Activity Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Activity["category"]>("Club");
  const [activityDate, setActivityDate] = useState(todayStr);
  const [activityTime, setActivityTime] = useState("14:00 - 16:00");
  const [location, setLocation] = useState("HSU Campus");
  const [capacity, setCapacity] = useState("50");
  const [audience, setAudience] = useState<Activity["audience"]>("Public");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Staff: Participants Modal
  const [modalActivity, setModalActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [actRes, calRes] = await Promise.all([
        fetch("/api/activities", { cache: "no-store" }),
        fetch("/api/calendar", { cache: "no-store" }),
      ]);

      const actData = (await actRes.json()) as {
        success?: boolean;
        activities?: Activity[];
        error?: string;
      };

      if (!actRes.ok || !actData.success) {
        setError(actData.error || "Could not load campus activities.");
        return;
      }
      setActivities(Array.isArray(actData.activities) ? actData.activities : []);

      if (calRes.ok) {
        const calData = (await calRes.json()) as {
          success?: boolean;
          events?: CalendarAssessment[];
        };
        if (calData.success && Array.isArray(calData.events)) {
          setAssessments(
            calData.events.filter(
              (ev) =>
                ev.event_type === "Assignment" ||
                ev.event_type === "Test" ||
                ev.event_type === "Exam",
            ),
          );
        }
      }
    } catch {
      setError("Network error while loading activities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map date -> assessment conflicts for smart schedule checking
  const assessmentConflictsByDate = useMemo(() => {
    const map = new Map<string, CalendarAssessment[]>();
    for (const ev of assessments) {
      const list = map.get(ev.event_date) ?? [];
      list.push(ev);
      map.set(ev.event_date, list);
    }
    return map;
  }, [assessments]);

  const myRegisteredCount = useMemo(
    () => activities.filter((a) => a.is_registered).length,
    [activities],
  );

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((a) => {
      if (activeTab === "mine" && !a.is_registered) return false;
      if (categoryFilter !== "All" && a.category !== categoryFilter) return false;
      if (audienceFilter !== "All" && a.audience !== audienceFilter) return false;
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !a.location.toLowerCase().includes(q) &&
        !(a.description ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activities, activeTab, categoryFilter, audienceFilter, searchQuery]);

  async function handleRegister(activity: Activity) {
    const conflicts = assessmentConflictsByDate.get(activity.activity_date) ?? [];
    if (conflicts.length > 0) {
      const conflictSummary = conflicts
        .map((c) => `• ${c.title} (${c.event_type}${c.module_code ? `, ${c.module_code}` : ""})`)
        .join("\n");
      const proceed = window.confirm(
        `Schedule Conflict Warning!\n\n"${activity.title}" is on ${activity.activity_date}, the same day as:\n${conflictSummary}\n\nDo you still want to register?`,
      );
      if (!proceed) return;
    }

    setBusyActivityId(activity.activity_id);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          activity_id: activity.activity_id,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Could not register for this activity.");
        return;
      }
      setNotice(
        `Registered for "${activity.title}"! It has been synced to your Academic Calendar.`,
      );
      await loadData();
    } catch {
      setError("Network error while registering.");
    } finally {
      setBusyActivityId(null);
    }
  }

  async function handleUnregister(activity: Activity) {
    if (!window.confirm(`Cancel your registration for "${activity.title}"?`)) return;

    setBusyActivityId(activity.activity_id);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unregister",
          activity_id: activity.activity_id,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Could not cancel registration.");
        return;
      }
      setNotice(`Cancelled registration for "${activity.title}".`);
      await loadData();
    } catch {
      setError("Network error while cancelling registration.");
    } finally {
      setBusyActivityId(null);
    }
  }

  async function handleCreateActivity(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title.trim(),
          category,
          activity_date: activityDate,
          activity_time: activityTime.trim(),
          location: location.trim(),
          capacity: Number(capacity),
          audience,
          description: description.trim(),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to publish activity.");
        return;
      }

      setTitle("");
      setDescription("");
      setShowCreateForm(false);
      setNotice("New campus activity published!");
      await loadData();
    } catch {
      setError("Network error while publishing activity.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteActivity(activity: Activity) {
    if (!window.confirm(`Permanently delete "${activity.title}" and all its registrations?`)) {
      return;
    }

    setBusyActivityId(activity.activity_id);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activity.activity_id }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to delete activity.");
        return;
      }
      setNotice(`Deleted "${activity.title}".`);
      await loadData();
    } catch {
      setError("Network error while deleting activity.");
    } finally {
      setBusyActivityId(null);
    }
  }

  async function handleViewParticipants(activity: Activity) {
    setModalActivity(activity);
    setParticipants([]);
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/activities?participants=${activity.activity_id}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        success?: boolean;
        participants?: Participant[];
        error?: string;
      };
      if (res.ok && data.success && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      } else {
        setError(data.error || "Unable to load participant list.");
        setModalActivity(null);
      }
    } catch {
      setError("Network error while loading participant list.");
      setModalActivity(null);
    } finally {
      setLoadingParticipants(false);
    }
  }

  return (
    <div className="home-wrap">
      <h1 className="home-title">🎉 Campus Activities</h1>
      <p className="home-muted">
        Discover HSU clubs, workshops, seminars, and social events. Registered activities automatically sync to your Academic Calendar with deadline clash alerts.
      </p>

      {/* ROLE BANNER */}
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
              Signed in as <b>{username}</b>. You can publish/delete activities and inspect participant lists.
            </span>
          )}
          {role === "Student" && (
            <span>
              Signed in as <b>{username}</b>. You can register for both Public and HSU Only activities.
            </span>
          )}
          {role === "Public" && isLoggedIn && (
            <span>
              Signed in as <b>{username}</b> (Public). You can register for all Public campus activities.
            </span>
          )}
          {!isLoggedIn && (
            <span>
              Browse upcoming campus events below.{" "}
              <Link className="section-link" href="/Login">
                Log in
              </Link>{" "}
              or{" "}
              <Link className="section-link" href="/Register">
                Register
              </Link>{" "}
              to reserve a spot.
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="btn-secondary" href="/Calendar">
            📅 View My Calendar
          </Link>
          {role === "Staff" && (
            <button
              type="button"
              className="home-button btn-small"
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? "Close Form" : "+ Publish New Activity"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="status-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="home-ok" style={{ marginBottom: "1rem" }}>
          {notice}{" "}
          <Link className="section-link" href="/Calendar">
            Open Calendar →
          </Link>
        </div>
      )}

      {/* STAFF: CREATE ACTIVITY FORM */}
      {showCreateForm && role === "Staff" && (
        <div className="home-card">
          <h2>Publish a New Campus Activity</h2>
          <form onSubmit={handleCreateActivity}>
            <div className="form-grid-2">
              <div>
                <label className="home-label" htmlFor="act-title">Activity Title *</label>
                <input
                  id="act-title"
                  className="home-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Web Development Hackathon"
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <label className="home-label" htmlFor="act-cat">Category</label>
                <select
                  id="act-cat"
                  className="home-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Activity["category"])}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="home-label" htmlFor="act-date">Date *</label>
                <input
                  id="act-date"
                  type="date"
                  className="home-input"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="home-label" htmlFor="act-time">Time *</label>
                <input
                  id="act-time"
                  className="home-input"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                  placeholder="e.g. 14:00 - 16:30"
                  maxLength={64}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="home-label" htmlFor="act-loc">Location *</label>
                <input
                  id="act-loc"
                  className="home-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Room A201"
                  maxLength={150}
                  required
                />
              </div>
              <div className="form-grid-2">
                <div>
                  <label className="home-label" htmlFor="act-cap">Capacity *</label>
                  <input
                    id="act-cap"
                    type="number"
                    min={1}
                    max={5000}
                    className="home-input"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="home-label" htmlFor="act-aud">Audience</label>
                  <select
                    id="act-aud"
                    className="home-input"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as Activity["audience"])}
                  >
                    <option value="Public">Open to Public</option>
                    <option value="HSU Only">HSU Students &amp; Staff Only</option>
                  </select>
                </div>
              </div>
            </div>

            <label className="home-label" htmlFor="act-desc">Description</label>
            <textarea
              id="act-desc"
              className="home-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will participants learn or do?"
              rows={3}
            />

            <button className="home-button" type="submit" disabled={creating}>
              {creating ? "Publishing..." : "Publish Activity"}
            </button>
          </form>
        </div>
      )}

      {/* TABS & FILTERS */}
      <div className="home-card">
        <div className="cal-toolbar">
          <div className="cal-nav-group">
            <button
              type="button"
              className={`btn-secondary ${activeTab === "all" ? "active-tab" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Activities ({activities.length})
            </button>
            {isLoggedIn && (
              <button
                type="button"
                className={`btn-secondary ${activeTab === "mine" ? "active-tab" : ""}`}
                onClick={() => setActiveTab("mine")}
              >
                My Registered ({myRegisteredCount})
              </button>
            )}
          </div>
        </div>

        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            aria-label="Filter by audience"
          >
            <option value="All">All Audiences</option>
            <option value="Public">Open to Public</option>
            <option value="HSU Only">HSU Only</option>
          </select>

          <input
            className="filter-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity title, venue, or keyword..."
          />
        </div>
      </div>

      {/* ACTIVITIES CARDS GRID */}
      {loading ? (
        <div className="home-card">
          <p className="home-muted" style={{ margin: 0 }}>Loading campus activities...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="home-card">
          <p className="home-muted" style={{ margin: 0 }}>
            {activeTab === "mine"
              ? "You haven't registered for any activities yet."
              : "No activities match your current filters."}
          </p>
        </div>
      ) : (
        <div className="activities-grid">
          {filteredActivities.map((act) => {
            const spotsLeft = Math.max(0, act.capacity - act.registered_count);
            const pct = Math.min(100, Math.round((act.registered_count / Math.max(1, act.capacity)) * 100));
            const isFull = spotsLeft === 0;
            const clashes = assessmentConflictsByDate.get(act.activity_date) ?? [];
            const isRestrictedToHsu =
              act.audience === "HSU Only" && role !== "Student" && role !== "Staff";
            const isBusy = busyActivityId === act.activity_id;

            return (
              <div className="activity-card" key={act.activity_id}>
                <div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span className="pill-tag">{act.category}</span>
                    <span
                      className={`pill-tag ${act.audience === "HSU Only" ? "pill-purple" : "pill-info"}`}
                    >
                      {act.audience}
                    </span>
                    {act.is_registered && (
                      <span className="pill-tag" style={{ backgroundColor: "#16a34a", color: "#fff" }}>
                        ✓ Registered
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "19px" }}>{act.title}</h3>
                  <p className="home-note" style={{ margin: "0 0 0.35rem 0" }}>
                    📅 <b>{act.activity_date}</b> · {act.activity_time}
                  </p>
                  <p className="home-note" style={{ margin: "0 0 0.5rem 0" }}>
                    📍 {act.location}
                  </p>

                  {act.description && (
                    <p className="home-muted" style={{ marginBottom: "0.6rem" }}>
                      {act.description}
                    </p>
                  )}

                  {/* SMART SCHEDULE CONFLICT CHECK */}
                  {clashes.length > 0 && (
                    <div className="conflict-box">
                      ⚠️ <b>Calendar Clash:</b> Same day as{" "}
                      {clashes.map((c) => `${c.title} (${c.event_type})`).join(", ")}
                    </div>
                  )}

                  {/* CAPACITY PROGRESS BAR */}
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span>
                        <b>{act.registered_count}</b> / {act.capacity} registered
                      </span>
                      <span>{isFull ? "Full" : `${spotsLeft} spots left`}</span>
                    </div>
                    <div className="capacity-bar-bg">
                      <div
                        className={`capacity-bar-fill ${
                          isFull ? "is-full" : pct >= 75 ? "near-full" : ""
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
                  {!isLoggedIn ? (
                    <Link className="home-button btn-small" href="/Login" style={{ textDecoration: "none" }}>
                      Log in to Register
                    </Link>
                  ) : act.is_registered ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={isBusy}
                      onClick={() => handleUnregister(act)}
                    >
                      {isBusy ? "Updating..." : "Cancel Registration"}
                    </button>
                  ) : isRestrictedToHsu ? (
                    <button type="button" className="btn-secondary" disabled>
                      HSU Students &amp; Staff Only
                    </button>
                  ) : isFull ? (
                    <button type="button" className="btn-secondary" disabled>
                      Activity Full
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="home-button btn-small"
                      disabled={isBusy}
                      onClick={() => handleRegister(act)}
                    >
                      {isBusy ? "Registering..." : "Register Now"}
                    </button>
                  )}

                  {role === "Staff" && (
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleViewParticipants(act)}
                      >
                        Participants ({act.registered_count})
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        disabled={isBusy}
                        onClick={() => handleDeleteActivity(act)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STAFF PARTICIPANTS MODAL */}
      {modalActivity && (
        <div className="modal-backdrop" onClick={() => setModalActivity(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="section-header-row">
              <h2>Participants — {modalActivity.title}</h2>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalActivity(null)}
              >
                Close
              </button>
            </div>
            <p className="home-note" style={{ marginTop: 0 }}>
              {modalActivity.activity_date} · {modalActivity.location} ·{" "}
              {modalActivity.registered_count}/{modalActivity.capacity} registered
            </p>

            {loadingParticipants ? (
              <p className="home-muted">Loading participants...</p>
            ) : participants.length === 0 ? (
              <p className="home-muted">No users have registered for this activity yet.</p>
            ) : (
              <table className="home-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Student ID</th>
                    <th>Programme</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const pRole = p.is_hsu_staff
                      ? "Staff"
                      : p.is_hsu_student
                        ? "Student"
                        : "Public";
                    return (
                      <tr key={p.registration_id}>
                        <td><b>{p.username}</b></td>
                        <td>{pRole}</td>
                        <td>{p.student_id || "—"}</td>
                        <td>{p.programme || "—"}</td>
                        <td>{p.registered_at}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
