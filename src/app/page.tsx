"use client";

import { useState } from "react";

interface MatchResult {
  slug: string;
  company: string;
  title: string;
  location: string;
  url: string;
  score: number;
  whyItFits: string;
  interviewQuestion: string;
  tags: string[];
  remote: boolean;
}

export default function Home() {
  const [skills, setSkills] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [city, setCity] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "results">("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMatches([]);

    try {
      const jobsRes = await fetch(
        `/api/jobs?keywords=${encodeURIComponent(skills + "," + targetRole)}&city=${encodeURIComponent(city)}`
      );
      const jobsData = await jobsRes.json();

      if (!jobsRes.ok) {
        throw new Error(jobsData.error || "Failed to fetch jobs");
      }

      if (jobsData.jobs.length === 0) {
        setError(
          "No jobs found matching your criteria. Try broadening your search with different skills or a different city."
        );
        setLoading(false);
        return;
      }

      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills,
          targetRole,
          city,
          jobs: jobsData.jobs,
        }),
      });

      const matchData = await matchRes.json();

      if (!matchRes.ok) {
        throw new Error(matchData.error || "Failed to match jobs");
      }

      setMatches(matchData.matches);
      setStep("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setMatches([]);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50";
    if (score >= 60) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreRing = (score: number) => {
    if (score >= 80) return "border-emerald-500";
    if (score >= 60) return "border-amber-500";
    return "border-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Job Matcher
          </h1>
          <p className="text-muted text-lg">
            AI-powered job matching from thousands of listings
          </p>
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card rounded-2xl shadow-lg border border-card-border p-8 space-y-6">
              <div>
                <label
                  htmlFor="skills"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Your Skills
                </label>
                <input
                  id="skills"
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, Python, SQL, AWS"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-input-border bg-input-bg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent transition-all"
                />
                <p className="mt-1.5 text-xs text-muted">
                  Comma-separated list of your key skills
                </p>
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Target Role
                </label>
                <input
                  id="role"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Frontend Developer, Data Scientist"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-input-border bg-input-bg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Berlin, Munich, Remote"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-input-border bg-input-bg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Searching & matching jobs...
                </span>
              ) : (
                "Find My Matches"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <button
              onClick={resetForm}
              className="flex items-center gap-2 text-muted hover:text-foreground transition-colors font-medium"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New Search
            </button>

            <div className="bg-card rounded-2xl shadow-lg border border-card-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Top Matches
              </h2>
              <p className="text-muted text-sm mb-6">
                AI-scored based on your skills ({skills}), role ({targetRole}),
                and location ({city})
              </p>

              {error && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm mb-6">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {matches.map((match, index) => (
                  <div
                    key={match.slug}
                    className="border border-card-border rounded-xl p-6 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex-shrink-0 w-14 h-14 rounded-full border-4 ${getScoreRing(match.score)} flex items-center justify-center bg-white`}
                      >
                        <span
                          className={`text-lg font-bold ${getScoreColor(match.score).split(" ")[0]}`}
                        >
                          {match.score}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {match.title}
                            </h3>
                            <p className="text-muted">
                              {match.company} &middot; {match.location}
                              {match.remote && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                  Remote
                                </span>
                              )}
                            </p>
                          </div>
                          <a
                            href={match.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary-light transition-colors"
                          >
                            Apply
                          </a>
                        </div>

                        {match.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {match.tags.slice(0, 5).map((tag) => (
                              <span
                                key={tag}
                                className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="bg-indigo-50 rounded-lg p-4 mb-3">
                          <p className="text-sm font-medium text-indigo-800 mb-1">
                            Why it fits:
                          </p>
                          <p className="text-sm text-indigo-700">
                            {match.whyItFits}
                          </p>
                        </div>

                        <div className="bg-amber-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-amber-800 mb-1">
                            Prepare for this question:
                          </p>
                          <p className="text-sm text-amber-700 italic">
                            &ldquo;{match.interviewQuestion}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className="text-center mt-12 text-sm text-muted">
          Powered by Arbeitnow API &amp; OpenRouter AI
        </footer>
      </div>
    </div>
  );
}
