"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type GradeRow = {
  grade_id: number;
  username: string;
  module_code: string;
  module_name: string | null;
  grade: string;
  semester: string | null;
  academic_year: number | null;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
};

type ModuleStat = {
  module_code: string;
  module_name: string | null;
  sample_size: number;
  pass_rate: number;
  a_rate: number;
  average_gpa_points: number | null;
  grade_distribution: Record<string, number>;
};

const GRADE_OPTIONS = [
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D", "F",
  "Pass", "Fail",
] as const;

export default function GradesPage() {
  const { username, isHsuStudent, isHsuStaff } = useAuth();
  const canSubmit = Boolean(username && (isHsuStudent || isHsuStaff));

  const [myGrades, setMyGrades] = useState<GradeRow[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleStat[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [modulesCovered, setModulesCovered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [moduleCode, setModuleCode] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [grade, setGrade] = useState<string>("B");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/grades", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load grades.");
        setMyGrades([]);
        setModuleStats([]);
        return;
      }
      setMyGrades(Array.isArray(data.my_grades) ? data.my_grades : []);
      setModuleStats(Array.isArray(data.module_stats) ? data.module_stats : []);
      setTotalSubmissions(typeof data.total_submissions === "number" ? data.total_submissions : 0);
      setModulesCovered(typeof data.modules_covered === "number" ? data.modules_covered : 0);
    } catch {
      setError("Network error while loading grades.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitMsg(null);
    setError(null);

    const payload: Record<string, unknown> = {
      moduleCode: moduleCode.trim(),
      grade,
      isAnonymous,
    };
    if (moduleName.trim()) payload.moduleName = moduleName.trim();
    if (semester.trim()) payload.semester = semester.trim();
    if (academicYear.trim()) {
      const y = parseInt(academicYear, 10);
      if (!Number.isNaN(y)) payload.academicYear = y;
    }
    if (comment.trim()) payload.comment = comment.trim();

    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit grade.");
        return;
      }
      setSubmitMsg("Grade submitted. Thank you for contributing to the community statistics!");
      setModuleCode("");
      setModuleName("");
      setGrade("B");
      setSemester("");
      setAcademicYear("");
      setComment("");
      setIsAnonymous(true);
      await load();
    } catch {
      setError("Network error while submitting grade.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(gradeId: number) {
    if (!confirm("Delete this grade entry?")) return;
    try {
      const res = await fetch(`/api/grades?grade_id=${gradeId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete.");
        return;
      }
      await load();
    } catch {
      setError("Network error while deleting.");
    }
  }

  function difficultyLabel(stat: ModuleStat): string {
    if (stat.sample_size < 2) return "Limited data";
    if (stat.a_rate >= 40 && stat.pass_rate >= 90) return "Easier";
    if (stat.a_rate <= 15 || stat.pass_rate < 70) return "Harder";
    return "Moderate";
  }

  function difficultyColor(label: string): string {
    if (label === "Easier") return "bg-green-100 text-green-800";
    if (label === "Harder") return "bg-red-100 text-red-800";
    if (label === "Limited data") return "bg-gray-100 text-gray-600";
    return "bg-amber-100 text-amber-800";
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold">Grade Database</h1>
      <p className="mb-2 text-gray-700">
        Students share academic results (with optional comments). Aggregated,
        anonymised data powers module statistics — a practical{" "}
        <strong>Big Data</strong> idea: more submissions → more accurate insights
        on which modules are easier (higher A / pass rates).
      </p>
      <p className="mb-6 text-sm text-gray-500">
        Current crowd: {totalSubmissions} submission{totalSubmissions !== 1 ? "s" : ""}{" "}
        across {modulesCovered} module{modulesCovered !== 1 ? "s" : ""}.
      </p>

      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-800" role="alert">
          {error}
        </p>
      )}
      {submitMsg && (
        <p className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-800">
          {submitMsg}
        </p>
      )}

      {/* ---------- Submit form ---------- */}
      <section className="mb-10 rounded border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Upload your result</h2>
        {!username ? (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
            Please log in as an HSU student to submit grades.
          </p>
        ) : !canSubmit ? (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
            Only HSU student accounts can submit academic grades.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Module code *</span>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={moduleCode}
                onChange={(e) => setModuleCode(e.target.value)}
                placeholder="e.g. COM3102"
                required
                maxLength={32}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Module name</span>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="e.g. Web Application Development"
                maxLength={150}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Grade *</span>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Semester</span>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. 2025-26 Sem 1"
                maxLength={40}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Academic year</span>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2025"
                inputMode="numeric"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span className="text-sm">Keep my submission anonymous in stats</span>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">Comment (optional)</span>
              <textarea
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What made this module easier or harder?"
                rows={3}
                maxLength={2000}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit grade"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ---------- Module statistics (Big Data) ---------- */}
      <section className="mb-10">
        <h2 className="mb-2 text-xl font-semibold">Module statistics (Big Data)</h2>
        <p className="mb-4 text-sm text-gray-600">
          Ranked by A-rate (then pass rate). Larger sample sizes give more reliable
          estimates of module difficulty.
        </p>
        {loading ? (
          <p className="text-gray-500">Loading statistics…</p>
        ) : moduleStats.length === 0 ? (
          <p className="rounded border border-gray-200 bg-gray-50 p-4 text-gray-600">
            No grade data yet. Be the first to submit a result!
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Module</th>
                  <th className="p-3">Sample size</th>
                  <th className="p-3">A rate</th>
                  <th className="p-3">Pass rate</th>
                  <th className="p-3">Avg GPA pts</th>
                  <th className="p-3">Difficulty</th>
                  <th className="p-3">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {moduleStats.map((s) => {
                  const label = difficultyLabel(s);
                  return (
                    <tr className="border-t border-gray-200" key={s.module_code}>
                      <td className="p-3">
                        <span className="font-medium">{s.module_code}</span>
                        {s.module_name && (
                          <span className="block text-xs text-gray-500">{s.module_name}</span>
                        )}
                      </td>
                      <td className="p-3">{s.sample_size}</td>
                      <td className="p-3">{s.a_rate}%</td>
                      <td className="p-3">{s.pass_rate}%</td>
                      <td className="p-3">
                        {s.average_gpa_points != null ? s.average_gpa_points.toFixed(2) : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${difficultyColor(label)}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {Object.entries(s.grade_distribution)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([g, n]) => `${g}:${n}`)
                          .join(" · ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- My grades ---------- */}
      {username && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">My submitted grades</h2>
          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : myGrades.length === 0 ? (
            <p className="rounded border border-gray-200 bg-gray-50 p-4 text-gray-600">
              You have not submitted any grades yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3">Module</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3">Year</th>
                    <th className="p-3">Comment</th>
                    <th className="p-3">Anonymous</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {myGrades.map((g) => (
                    <tr className="border-t border-gray-200" key={g.grade_id}>
                      <td className="p-3">
                        <span className="font-medium">{g.module_code}</span>
                        {g.module_name && (
                          <span className="block text-xs text-gray-500">{g.module_name}</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{g.grade}</td>
                      <td className="p-3">{g.semester ?? "—"}</td>
                      <td className="p-3">{g.academic_year ?? "—"}</td>
                      <td className="p-3 max-w-xs truncate" title={g.comment ?? undefined}>
                        {g.comment ?? "—"}
                      </td>
                      <td className="p-3">{g.is_anonymous ? "Yes" : "No"}</td>
                      <td className="p-3 whitespace-nowrap">{g.created_at}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(g.grade_id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}