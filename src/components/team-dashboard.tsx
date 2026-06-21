"use client";

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@/app/page";

type Tab = "fixtures" | "submit" | "confirm" | "standings" | "knockout" | "roster" | "info";

type Match = {
  id: number;
  team1: string;
  team2: string;
  team1Id: number;
  team2Id: number;
  group: string;
  kickoff: string | null;
  pitch: string | null;
  score1: number | null;
  score2: number | null;
  status: string;
  submittedBy: number | null;
};

const PITCH_COLORS: Record<string, string> = {
  orange: "bg-orange-500 text-white",
  blue: "bg-[#274296] text-white",
  yellow: "bg-yellow-400 text-gray-900",
  red: "bg-red-600 text-white",
};

export function TeamDashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("fixtures");
  const [matches, setMatches] = useState<Match[]>([]);
  const [koMatches, setKoMatches] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const [scoresRes, koRes] = await Promise.all([
      fetch("/api/scores"),
      fetch("/api/knockout"),
    ]);
    if (scoresRes.ok) setMatches(await scoresRes.json());
    if (koRes.ok) setKoMatches(await koRes.json());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const myMatches = matches.filter(
    (m) => m.team1 === session.teamName || m.team2 === session.teamName
  );

  const pendingConfirm = myMatches.filter(
    (m) => m.status === "pending" && m.submittedBy !== session.teamId
  );

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "fixtures", label: "Fixtures" },
    { id: "submit", label: "Report" },
    { id: "confirm", label: "Confirm", badge: pendingConfirm.length },
    { id: "standings", label: "Standings" },
    { id: "knockout", label: "Knockout" },
    { id: "roster", label: "Roster" },
    { id: "info", label: "Info" },
  ];

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="bg-[#274296] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Churches Cup 2027</h1>
            <p className="text-blue-200 text-xs">{session.teamName} — Group {session.group}</p>
          </div>
          <button onClick={onLogout} className="text-blue-200 text-xs hover:text-white">
            Logout
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white border-b overflow-x-auto">
        <div className="flex gap-1 px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap uppercase tracking-wide transition-colors ${
                tab === t.id
                  ? "bg-[#274296] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 space-y-3">
        {tab === "fixtures" && (
          <FixturesTab matches={myMatches} teamName={session.teamName!} />
        )}
        {tab === "submit" && (
          <SubmitTab
            matches={myMatches}
            session={session}
            onSubmitted={fetchData}
          />
        )}
        {tab === "confirm" && (
          <ConfirmTab
            matches={pendingConfirm}
            session={session}
            onConfirmed={fetchData}
          />
        )}
        {tab === "standings" && <StandingsTab />}
        {tab === "knockout" && <KnockoutTab matches={koMatches} />}
        {tab === "roster" && <RosterTab session={session} />}
        {tab === "info" && <InfoTab />}
      </main>
    </div>
  );
}

function FixturesTab({ matches, teamName }: { matches: Match[]; teamName: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold">Your Fixtures</h2>
      {matches.length === 0 && (
        <p className="text-gray-500 text-sm">No fixtures found.</p>
      )}
      {matches.map((m) => {
        const isTeam1 = m.team1 === teamName;
        const opp = isTeam1 ? m.team2 : m.team1;
        const myScore = isTeam1 ? m.score1 : m.score2;
        const oppScore = isTeam1 ? m.score2 : m.score1;
        return (
          <div key={m.id} className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{teamName} <span className="text-gray-400">vs</span> {opp}</p>
                <div className="flex items-center gap-2 mt-1">
                  {m.kickoff && <span className="text-xs text-gray-500">⏰ {m.kickoff}</span>}
                  {m.pitch && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PITCH_COLORS[m.pitch] || "bg-gray-200"}`}>
                      {m.pitch.charAt(0).toUpperCase() + m.pitch.slice(1)} Pitch
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {m.score1 !== null ? (
                  <>
                    <span className="text-2xl font-bold">{myScore}–{oppScore}</span>
                    <span className={`block text-xs mt-1 font-medium ${
                      m.status === "confirmed" ? "text-green-600" : m.status === "disputed" ? "text-red-600" : "text-amber-600"
                    }`}>
                      {m.status}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Not played</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubmitTab({ matches, session, onSubmitted }: { matches: Match[]; session: Session; onSubmitted: () => void }) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const available = matches.filter((m) => m.status === "upcoming");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch) return;
    setSubmitting(true);
    setMsg("");

    const isTeam1 = selectedMatch.team1 === session.teamName;
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        matchId: selectedMatch.id,
        score1: isTeam1 ? Number(score1) : Number(score2),
        score2: isTeam1 ? Number(score2) : Number(score1),
        submittedById: session.teamId,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      setMsg(data.error);
    } else {
      setMsg("Score submitted! Waiting for opponent to confirm.");
      setSelectedMatch(null);
      setScore1("");
      setScore2("");
      onSubmitted();
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Report Score</h2>
      {available.length === 0 ? (
        <p className="text-gray-500 text-sm">No matches available to report.</p>
      ) : (
        <div className="space-y-2">
          {available.map((m) => {
            const opp = m.team1 === session.teamName ? m.team2 : m.team1;
            return (
              <button
                key={m.id}
                onClick={() => { setSelectedMatch(m); setMsg(""); }}
                className={`w-full text-left bg-white rounded-lg p-4 shadow-sm border transition-colors ${
                  selectedMatch?.id === m.id ? "border-[#274296] ring-2 ring-blue-200" : ""
                }`}
              >
                <span className="font-semibold">vs {opp}</span>
                {m.kickoff && <span className="text-xs text-gray-500 ml-2">⏰ {m.kickoff}</span>}
              </button>
            );
          })}
        </div>
      )}

      {selectedMatch && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 shadow-sm border space-y-4">
          <p className="font-semibold text-sm text-[#274296]">
            {session.teamName} vs {selectedMatch.team1 === session.teamName ? selectedMatch.team2 : selectedMatch.team1}
          </p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Your Score</label>
              <input
                type="number"
                min="0"
                max="99"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="w-full border rounded-lg px-3 py-3 text-center text-2xl font-bold"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Opponent</label>
              <input
                type="number"
                min="0"
                max="99"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="w-full border rounded-lg px-3 py-3 text-center text-2xl font-bold"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Score"}
          </button>
        </form>
      )}

      {msg && (
        <div className={`text-sm font-medium rounded-lg px-3 py-2 ${
          msg.includes("error") || msg.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}>
          {msg}
        </div>
      )}
    </div>
  );
}

function ConfirmTab({ matches, session, onConfirmed }: { matches: Match[]; session: Session; onConfirmed: () => void }) {
  const [confirming, setConfirming] = useState<number | null>(null);

  async function handleAction(match: Match, action: "confirm" | "dispute") {
    setConfirming(match.id);
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        matchId: match.id,
        confirmedById: session.teamId,
      }),
    });
    setConfirming(null);
    onConfirmed();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Confirm Scores</h2>
      {matches.length === 0 && (
        <p className="text-gray-500 text-sm">No scores waiting for your confirmation.</p>
      )}
      {matches.map((m) => {
        const isTeam1 = m.team1 === session.teamName;
        const opp = isTeam1 ? m.team2 : m.team1;
        const myScore = isTeam1 ? m.score1 : m.score2;
        const oppScore = isTeam1 ? m.score2 : m.score1;
        return (
          <div key={m.id} className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{session.teamName} vs {opp}</p>
              <span className="text-2xl font-bold">{myScore}–{oppScore}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(m, "confirm")}
                disabled={confirming === m.id}
                className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {confirming === m.id ? "..." : "✓ Confirm"}
              </button>
              <button
                onClick={() => handleAction(m, "dispute")}
                disabled={confirming === m.id}
                className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                ✕ Dispute
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StandingsTab() {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Standings</h2>
      <p className="text-gray-500 text-sm">Coming soon — standings calculated from confirmed results.</p>
    </div>
  );
}

function KnockoutTab({ matches }: { matches: any[] }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Knockout</h2>
      {matches.length === 0 ? (
        <p className="text-gray-500 text-sm">Knockout bracket not yet available.</p>
      ) : (
        <div className="space-y-2">
          {matches.map((m: any) => (
            <div key={m.matchId} className="bg-white rounded-lg p-3 shadow-sm border text-sm">
              <div className="flex justify-between">
                <span>{m.team1Name} vs {m.team2Name}</span>
                {m.winnerId && <span className="font-bold">{m.score1}–{m.score2}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RosterTab({ session }: { session: Session }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Roster</h2>
      <p className="text-gray-500 text-sm">Roster management coming soon.</p>
    </div>
  );
}

function InfoTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Info</h2>
      <div className="bg-white rounded-lg p-4 shadow-sm border space-y-3 text-sm">
        <h3 className="font-bold">Group Stage Rules</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>Win = 3 points, Draw = 1 point, Loss = 0 points</li>
          <li>Games are 12 minutes (no half-time)</li>
          <li>Top 2 from each group go to Championship knockout</li>
          <li>3rd and 4th place go to Shield / Plate</li>
        </ul>
        <h3 className="font-bold mt-4">Score Reporting</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>One team submits the score, the other confirms</li>
          <li>If disputed, find an organiser — do not re-submit</li>
          <li>Penalty shootout goals do not count for Golden Boot</li>
        </ul>
      </div>
    </div>
  );
}
