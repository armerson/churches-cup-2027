"use client";

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@/app/page";
import { useTournament, getPitchClass } from "@/lib/use-tournament";

type Tab = "fixtures" | "submit" | "confirm" | "standings" | "knockout" | "roster" | "boot" | "info";

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

export function TeamDashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { config } = useTournament();
  const [tab, setTab] = useState<Tab>("fixtures");
  const [matches, setMatches] = useState<Match[]>([]);
  const [koMatches, setKoMatches] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [goldenBoot, setGoldenBoot] = useState<any[]>([]);

  const groups = config?.groups || {};
  const pitchColors = config?.pitchColors || {};
  const tournamentName = config?.name || "Churches Cup";
  const koComps = config?.koCompetitions || [];

  const fetchData = useCallback(async () => {
    const [s, k, n, g] = await Promise.all([
      fetch("/api/scores"), fetch("/api/knockout"), fetch("/api/notices"), fetch("/api/golden-boot"),
    ]);
    if (s.ok) setMatches(await s.json());
    if (k.ok) setKoMatches(await k.json());
    if (n.ok) setNotices(await n.json());
    if (g.ok) setGoldenBoot(await g.json());
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

  const pendingKoConfirm = koMatches.filter(
    (m: any) => m.status === "pending" && m.submittedBy !== session.teamId &&
    (m.team1Id === session.teamId || m.team2Id === session.teamId)
  );

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "fixtures", label: "Fixtures" },
    { id: "submit", label: "Report" },
    { id: "confirm", label: "Confirm", badge: pendingConfirm.length },
    { id: "standings", label: "Table" },
    { id: "knockout", label: "KO", badge: pendingKoConfirm.length },
    { id: "roster", label: "Roster" },
    { id: "boot", label: "Boot" },
    { id: "info", label: "Info" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <header className="bg-[#274296] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{tournamentName}</h1>
            <p className="text-blue-200 text-xs">{session.teamName} — Group {session.group}</p>
          </div>
          <button onClick={onLogout} className="text-blue-200 text-xs hover:text-white">Logout</button>
        </div>
      </header>

      {notices.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <p className="text-xs text-amber-800 font-medium">{notices[0].message}</p>
        </div>
      )}

      <nav className="bg-white border-b overflow-x-auto">
        <div className="flex gap-1 px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap uppercase tracking-wide transition-colors ${
                tab === t.id ? "bg-[#274296] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

      <main className="flex-1 p-4 space-y-3">
        {tab === "fixtures" && <FixturesTab matches={myMatches} teamName={session.teamName!} pitchColors={pitchColors} />}
        {tab === "submit" && <SubmitTab matches={myMatches} session={session} onSubmitted={fetchData} />}
        {tab === "confirm" && <ConfirmTab matches={pendingConfirm} session={session} onConfirmed={fetchData} />}
        {tab === "standings" && <StandingsTab matches={matches} myGroup={session.group!} groups={groups} koComps={koComps} />}
        {tab === "knockout" && <KnockoutTab matches={koMatches} session={session} onRefresh={fetchData} pitchColors={pitchColors} koComps={koComps} />}
        {tab === "roster" && <RosterTab session={session} />}
        {tab === "boot" && <GoldenBootTab data={goldenBoot} />}
        {tab === "info" && <InfoTab config={config} />}
      </main>
    </div>
  );
}

function FixturesTab({ matches, teamName, pitchColors }: { matches: Match[]; teamName: string; pitchColors: Record<string, string> }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold">Your Fixtures</h2>
      {matches.length === 0 && <p className="text-gray-500 text-sm">No fixtures found.</p>}
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
                  {m.kickoff && <span className="text-xs text-gray-500">{m.kickoff}</span>}
                  {m.pitch && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPitchClass(pitchColors, m.pitch)}`}>
                      {m.pitch.charAt(0).toUpperCase() + m.pitch.slice(1)}
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
                    }`}>{m.status}</span>
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

function ScorerInputs({ count, scorers, onChange, label }: { count: number; scorers: string[]; onChange: (s: string[]) => void; label: string }) {
  if (count <= 0) return null;
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-600">{label} ({count} goal{count !== 1 ? "s" : ""})</label>
      {Array.from({ length: count }).map((_, i) => (
        <input
          key={i}
          type="text"
          value={scorers[i] || ""}
          onChange={(e) => { const next = [...scorers]; next[i] = e.target.value; onChange(next); }}
          placeholder={`Goal ${i + 1} scorer`}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          required
        />
      ))}
    </div>
  );
}

function SubmitTab({ matches, session, onSubmitted }: { matches: Match[]; session: Session; onSubmitted: () => void }) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [myScorers, setMyScorers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const available = matches.filter((m) => m.status === "upcoming");

  const myGoals = Number(score1) || 0;
  const oppGoals = Number(score2) || 0;
  const myScorersValid = myGoals === 0 || (myScorers.slice(0, myGoals).every((s) => s.trim().length > 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch || !myScorersValid) return;
    setSubmitting(true);
    setMsg("");
    const isTeam1 = selectedMatch.team1 === session.teamName;
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        matchId: selectedMatch.id,
        score1: isTeam1 ? myGoals : oppGoals,
        score2: isTeam1 ? oppGoals : myGoals,
        submittedById: session.teamId,
        myScorers: myScorers.slice(0, myGoals).map((s) => s.trim()),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      setMsg(data.error);
    } else {
      setMsg("Score submitted! Waiting for opponent to confirm and add their scorers.");
      setSelectedMatch(null);
      setScore1("");
      setScore2("");
      setMyScorers([]);
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
              <button key={m.id} onClick={() => { setSelectedMatch(m); setMsg(""); setMyScorers([]); }}
                className={`w-full text-left bg-white rounded-lg p-4 shadow-sm border transition-colors ${
                  selectedMatch?.id === m.id ? "border-[#274296] ring-2 ring-blue-200" : ""
                }`}>
                <span className="font-semibold">vs {opp}</span>
                {m.kickoff && <span className="text-xs text-gray-500 ml-2">{m.kickoff}</span>}
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
              <input type="number" min="0" max="99" value={score1} onChange={(e) => { setScore1(e.target.value); setMyScorers([]); }}
                className="w-full border rounded-lg px-3 py-3 text-center text-2xl font-bold" required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Opponent</label>
              <input type="number" min="0" max="99" value={score2} onChange={(e) => setScore2(e.target.value)}
                className="w-full border rounded-lg px-3 py-3 text-center text-2xl font-bold" required />
            </div>
          </div>
          <ScorerInputs count={myGoals} scorers={myScorers} onChange={setMyScorers} label={`${session.teamName} scorers`} />
          <p className="text-xs text-gray-400">Your opponent will add their own scorers when they confirm.</p>
          <button type="submit" disabled={submitting || !myScorersValid}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            {submitting ? "Submitting..." : "Submit Score"}
          </button>
        </form>
      )}
      {msg && (
        <div className={`text-sm font-medium rounded-lg px-3 py-2 ${
          msg.includes("error") || msg.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}>{msg}</div>
      )}
    </div>
  );
}

function ConfirmTab({ matches, session, onConfirmed }: { matches: Match[]; session: Session; onConfirmed: () => void }) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [scorersMap, setScorersMap] = useState<Record<number, string[]>>({});

  function getMyGoals(m: Match) {
    const isTeam1 = m.team1 === session.teamName;
    return isTeam1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
  }

  function getScorers(matchId: number) {
    return scorersMap[matchId] || [];
  }

  function setScorers(matchId: number, s: string[]) {
    setScorersMap((prev) => ({ ...prev, [matchId]: s }));
  }

  async function handleAction(match: Match, action: "confirm" | "dispute") {
    const myGoals = getMyGoals(match);
    const mySc = getScorers(match.id);
    if (action === "confirm" && myGoals > 0 && mySc.slice(0, myGoals).some((s) => !s.trim())) return;

    setConfirming(match.id);
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        matchId: match.id,
        confirmedById: session.teamId,
        myScorers: action === "confirm" ? mySc.slice(0, myGoals).map((s) => s.trim()) : undefined,
      }),
    });
    setConfirming(null);
    onConfirmed();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Confirm Scores</h2>
      {matches.length === 0 && <p className="text-gray-500 text-sm">No scores waiting for your confirmation.</p>}
      {matches.map((m) => {
        const isTeam1 = m.team1 === session.teamName;
        const opp = isTeam1 ? m.team2 : m.team1;
        const myScore = isTeam1 ? m.score1 : m.score2;
        const oppScore = isTeam1 ? m.score2 : m.score1;
        const myGoals = myScore ?? 0;
        const mySc = getScorers(m.id);
        const scorersValid = myGoals === 0 || (mySc.slice(0, myGoals).every((s) => s.trim().length > 0));
        return (
          <div key={m.id} className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{session.teamName} vs {opp}</p>
              <span className="text-2xl font-bold">{myScore}–{oppScore}</span>
            </div>
            {myGoals > 0 && (
              <ScorerInputs count={myGoals} scorers={mySc} onChange={(s) => setScorers(m.id, s)}
                label={`${session.teamName} scorers`} />
            )}
            <div className="flex gap-2">
              <button onClick={() => handleAction(m, "confirm")} disabled={confirming === m.id || !scorersValid}
                className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                {confirming === m.id ? "..." : "Confirm"}
              </button>
              <button onClick={() => handleAction(m, "dispute")} disabled={confirming === m.id}
                className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
                Dispute
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Standing = { name: string; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number };

function StandingsTab({ matches, myGroup, groups, koComps }: { matches: Match[]; myGroup: string; groups: Record<string, string[]>; koComps: any[] }) {
  const confirmed = matches.filter((m) => m.status === "confirmed");
  const standings: Record<string, Record<string, Standing>> = {};
  for (const [group, teams] of Object.entries(groups)) {
    standings[group] = {};
    for (const t of teams) {
      standings[group][t] = { name: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    }
  }
  for (const m of confirmed) {
    const g = m.group;
    if (!standings[g]?.[m.team1] || !standings[g]?.[m.team2]) continue;
    const s1 = standings[g][m.team1];
    const s2 = standings[g][m.team2];
    s1.p++; s2.p++;
    s1.gf += m.score1!; s1.ga += m.score2!;
    s2.gf += m.score2!; s2.ga += m.score1!;
    if (m.score1! > m.score2!) { s1.w++; s1.pts += 3; s2.l++; }
    else if (m.score1! < m.score2!) { s2.w++; s2.pts += 3; s1.l++; }
    else { s1.d++; s2.d++; s1.pts++; s2.pts++; }
    s1.gd = s1.gf - s1.ga;
    s2.gd = s2.gf - s2.ga;
  }

  const groupOrder = [myGroup, ...Object.keys(groups).filter((g) => g !== myGroup)];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Standings</h2>
      {groupOrder.map((group) => {
        const teams = standings[group];
        if (!teams) return null;
        const sorted = Object.values(teams).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        return (
          <div key={group}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Group {group} {group === myGroup && <span className="text-[#274296]">(Your Group)</span>}
            </h3>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="text-left px-2 py-1.5 font-semibold">Team</th>
                    <th className="w-7 text-center font-semibold">P</th>
                    <th className="w-7 text-center font-semibold">W</th>
                    <th className="w-7 text-center font-semibold">D</th>
                    <th className="w-7 text-center font-semibold">L</th>
                    <th className="w-9 text-center font-semibold">GD</th>
                    <th className="w-9 text-center font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => (
                    <tr key={s.name} className={i < 2 ? "bg-green-50" : i === 2 ? "bg-blue-50" : "bg-orange-50"}>
                      <td className="px-2 py-1.5 font-medium truncate max-w-[140px]">{s.name}</td>
                      <td className="text-center">{s.p}</td>
                      <td className="text-center">{s.w}</td>
                      <td className="text-center">{s.d}</td>
                      <td className="text-center">{s.l}</td>
                      <td className="text-center">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                      <td className="text-center font-bold">{s.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {koComps.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
          {koComps.map((c: any, i: number) => {
            const colors = ["bg-green-100 border-green-200", "bg-blue-100 border-blue-200", "bg-orange-100 border-orange-200"];
            return (
              <span key={c.key} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded border ${colors[i] || "bg-gray-100 border-gray-200"}`}></span> {c.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KnockoutTab({ matches, session, onRefresh, pitchColors, koComps }: { matches: any[]; session: Session; onRefresh: () => void; pitchColors: Record<string, string>; koComps: any[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [ps1, setPs1] = useState("");
  const [ps2, setPs2] = useState("");
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [myScorers, setMyScorers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmScorers, setConfirmScorers] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState("");

  const comps = koComps.map((c) => c.key);
  const compLabels = Object.fromEntries(koComps.map((c) => [c.key, c.label]));
  const roundLabels: Record<string, string> = { r16: "Round of 16", r1: "Round 1", qf: "Quarter-Final", sf: "Semi-Final", final: "Final" };

  const myKoMatches = matches.filter((m: any) =>
    m.team1Id === session.teamId || m.team2Id === session.teamId
  );

  async function handleSubmit(m: any) {
    const isTeam1 = m.team1Id === session.teamId;
    const sc1 = Number(s1);
    const sc2 = Number(s2);
    const apiScore1 = isTeam1 ? sc1 : sc2;
    const apiScore2 = isTeam1 ? sc2 : sc1;
    let w = winnerId;
    if (apiScore1 > apiScore2) w = m.team1Id;
    else if (apiScore2 > apiScore1) w = m.team2Id;

    const myGoals = sc1;
    if (myGoals > 0 && myScorers.slice(0, myGoals).some((s) => !s.trim())) return;

    setBusy(true);
    setMsg("");
    const res = await fetch("/api/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        matchId: m.matchId,
        score1: apiScore1,
        score2: apiScore2,
        penScore1: apiScore1 === apiScore2 ? Number(ps1) : null,
        penScore2: apiScore1 === apiScore2 ? Number(ps2) : null,
        winnerId: w,
        submittedById: session.teamId,
        myScorers: myScorers.slice(0, myGoals).map((s) => s.trim()),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) {
      setMsg(data.error);
    } else {
      setMsg("KO result submitted! Waiting for opponent to confirm and add their scorers.");
      setEditing(null);
      onRefresh();
    }
  }

  async function handleAction(matchId: string, act: "confirm" | "dispute", m: any) {
    const isTeam1 = m.team1Id === session.teamId;
    const myGoals = isTeam1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const mySc = confirmScorers[matchId] || [];

    if (act === "confirm" && myGoals > 0 && mySc.slice(0, myGoals).some((s) => !s.trim())) return;

    setConfirming(matchId);
    await fetch("/api/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: act,
        matchId,
        confirmedById: session.teamId,
        myScorers: act === "confirm" ? mySc.slice(0, myGoals).map((s) => s.trim()) : undefined,
      }),
    });
    setConfirming(null);
    onRefresh();
  }

  if (matches.length === 0) return (
    <div>
      <h2 className="text-lg font-bold mb-3">Knockout</h2>
      <p className="text-gray-500 text-sm">Bracket not yet available.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Knockout</h2>

      {myKoMatches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#274296] uppercase tracking-wider">Your KO Matches</h3>
          {myKoMatches.map((m: any) => {
            const isTeam1 = m.team1Id === session.teamId;
            const opp = isTeam1 ? m.team2Name : m.team1Name;
            const canSubmit = m.status === "upcoming" && m.team1Id && m.team2Id;
            const canConfirm = m.status === "pending" && m.submittedBy !== session.teamId;
            const myScore = isTeam1 ? m.score1 : m.score2;
            const oppScore = isTeam1 ? m.score2 : m.score1;

            return (
              <div key={m.matchId} className="bg-white rounded-lg p-3 shadow-sm border space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{session.teamName} vs {opp}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500 uppercase">{compLabels[m.competition]} — {roundLabels[m.round] || m.round}</span>
                      {m.kickoff && <span className="text-[10px] text-gray-500">{m.kickoff}</span>}
                    </div>
                  </div>
                  {m.winnerId ? (
                    <div className="text-right">
                      <span className="text-lg font-bold">{myScore}–{oppScore}</span>
                      {m.penScore1 !== null && <span className="block text-[10px] text-gray-500">Pens: {m.penScore1}–{m.penScore2}</span>}
                      <span className={`block text-[10px] font-medium ${
                        m.status === "confirmed" ? "text-green-600" : m.status === "disputed" ? "text-red-600" : "text-amber-600"
                      }`}>{m.status}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">{m.status === "pending" ? "pending" : "—"}</span>
                  )}
                </div>

                {canConfirm && (() => {
                  const confirmMyGoals = isTeam1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
                  const cSc = confirmScorers[m.matchId] || [];
                  const cValid = confirmMyGoals === 0 || (cSc.slice(0, confirmMyGoals).every((s: string) => s.trim().length > 0));
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">Opponent submitted: <span className="font-bold">{myScore}–{oppScore}</span>
                        {m.penScore1 !== null && <span> (Pens: {m.penScore1}–{m.penScore2})</span>}
                      </p>
                      {confirmMyGoals > 0 && (
                        <ScorerInputs count={confirmMyGoals} scorers={cSc}
                          onChange={(s) => setConfirmScorers((prev) => ({ ...prev, [m.matchId]: s }))}
                          label={`${session.teamName} scorers`} />
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(m.matchId, "confirm", m)} disabled={confirming === m.matchId || !cValid}
                          className="flex-1 bg-green-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50">Confirm</button>
                        <button onClick={() => handleAction(m.matchId, "dispute", m)} disabled={confirming === m.matchId}
                          className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50">Dispute</button>
                      </div>
                    </div>
                  );
                })()}

                {canSubmit && editing !== m.matchId && (
                  <button onClick={() => { setEditing(m.matchId); setS1(""); setS2(""); setPs1(""); setPs2(""); setWinnerId(null); setMyScorers([]); setMsg(""); }}
                    className="text-[11px] text-[#274296] font-semibold hover:underline">Submit Result</button>
                )}

                {editing === m.matchId && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">{session.teamName}</label>
                        <input type="number" min="0" max="99" value={s1} onChange={(e) => { setS1(e.target.value); setMyScorers([]); }}
                          className="w-full border rounded px-2 py-2 text-center text-lg font-bold" />
                      </div>
                      <span className="text-gray-400 mt-4">–</span>
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">{opp}</label>
                        <input type="number" min="0" max="99" value={s2} onChange={(e) => setS2(e.target.value)}
                          className="w-full border rounded px-2 py-2 text-center text-lg font-bold" />
                      </div>
                    </div>

                    <ScorerInputs count={Number(s1) || 0} scorers={myScorers} onChange={setMyScorers} label={`${session.teamName} scorers`} />
                    {(Number(s2) || 0) > 0 && <p className="text-xs text-gray-400">Opponent will add their scorers when they confirm.</p>}

                    {s1 && s2 && Number(s1) === Number(s2) && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium">Penalty shootout:</p>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="99" value={ps1} onChange={(e) => setPs1(e.target.value)}
                            className="w-14 border rounded px-2 py-1.5 text-center text-sm font-bold" />
                          <span className="text-gray-400">–</span>
                          <input type="number" min="0" max="99" value={ps2} onChange={(e) => setPs2(e.target.value)}
                            className="w-14 border rounded px-2 py-1.5 text-center text-sm font-bold" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setWinnerId(isTeam1 ? m.team1Id : m.team2Id)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${winnerId === (isTeam1 ? m.team1Id : m.team2Id) ? "bg-green-600 text-white" : "bg-gray-100"}`}>
                            {session.teamName} wins
                          </button>
                          <button onClick={() => setWinnerId(isTeam1 ? m.team2Id : m.team1Id)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${winnerId === (isTeam1 ? m.team2Id : m.team1Id) ? "bg-green-600 text-white" : "bg-gray-100"}`}>
                            {opp} wins
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => handleSubmit(m)} disabled={busy || !s1 || !s2}
                        className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
                        {busy ? "Submitting..." : "Submit"}
                      </button>
                      <button onClick={() => setEditing(null)} className="text-gray-400 text-xs px-3">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {msg && (
        <div className={`text-sm font-medium rounded-lg px-3 py-2 ${
          msg.includes("error") || msg.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}>{msg}</div>
      )}

      {comps.map((comp) => {
        const compMatches = matches.filter((m: any) => m.competition === comp);
        if (compMatches.length === 0) return null;
        const rounds = [...new Set(compMatches.map((m: any) => m.round))] as string[];
        return (
          <div key={comp}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{compLabels[comp]}</h3>
            {rounds.map((round) => (
              <div key={round} className="mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{roundLabels[round] || round}</p>
                <div className="space-y-1.5">
                  {compMatches.filter((m: any) => m.round === round).map((m: any) => (
                    <div key={m.matchId} className="bg-white rounded-lg px-3 py-2.5 shadow-sm border flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm">{m.team1Name} <span className="text-gray-400">vs</span> {m.team2Name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.kickoff && <span className="text-[10px] text-gray-500">{m.kickoff}</span>}
                          {m.pitch && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getPitchClass(pitchColors, m.pitch)}`}>
                              {m.pitch}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.winnerId ? (
                        <div className="text-right">
                          <span className="text-lg font-bold">{m.score1}–{m.score2}</span>
                          {m.penScore1 !== null && <span className="block text-[10px] text-gray-500">Pens: {m.penScore1}–{m.penScore2}</span>}
                          <span className={`block text-[10px] font-medium ${
                            m.status === "confirmed" ? "text-green-600" : m.status === "disputed" ? "text-red-600" : "text-amber-600"
                          }`}>{m.status}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{m.kickoff || "TBC"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RosterTab({ session }: { session: Session }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchRoster = useCallback(async () => {
    const res = await fetch(`/api/rosters?teamId=${session.teamId}`);
    if (res.ok) setPlayers(await res.json());
  }, [session.teamId]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await fetch("/api/rosters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", teamId: session.teamId, playerName: name, shirtNumber: number ? Number(number) : null }),
    });
    setName("");
    setNumber("");
    setBusy(false);
    fetchRoster();
  }

  async function handleRemove(id: number) {
    await fetch("/api/rosters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id }),
    });
    fetchRoster();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Roster — {session.teamName}</h2>
      <form onSubmit={handleAdd} className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
        <div className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Player name"
            className="flex-1 border rounded-lg px-3 py-2 text-sm" required />
          <input type="number" min="1" max="99" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="#"
            className="w-16 border rounded-lg px-3 py-2 text-sm text-center" />
        </div>
        <button type="submit" disabled={busy || !name.trim()}
          className="w-full bg-[#274296] text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 text-sm">
          {busy ? "Adding..." : "Add Player"}
        </button>
      </form>

      {players.length === 0 ? (
        <p className="text-gray-500 text-sm">No players added yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {players.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t" : ""}`}>
              <div className="flex items-center gap-3">
                {p.shirtNumber && (
                  <span className="w-7 h-7 rounded-full bg-[#274296] text-white text-xs font-bold flex items-center justify-center">
                    {p.shirtNumber}
                  </span>
                )}
                <span className="text-sm font-medium">{p.playerName}</span>
              </div>
              <button onClick={() => handleRemove(p.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">{players.length} player{players.length !== 1 ? "s" : ""} registered</p>
    </div>
  );
}

function GoldenBootTab({ data }: { data: any[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Golden Boot</h2>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No goals scored yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-3 py-2 font-semibold">#</th>
                <th className="text-left px-3 py-2 font-semibold">Player</th>
                <th className="text-left px-3 py-2 font-semibold">Team</th>
                <th className="text-center px-3 py-2 font-semibold">Goals</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={`${p.playerName}-${p.teamName}`} className={i === 0 ? "bg-yellow-50" : ""}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{p.playerName}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{p.teamName}</td>
                  <td className="px-3 py-2 text-center font-bold">{p.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoTab({ config }: { config: any }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Info</h2>
      <div className="bg-white rounded-lg p-4 shadow-sm border space-y-3 text-sm">
        <h3 className="font-bold">Group Stage Rules</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>Win = 3 points, Draw = 1 point, Loss = 0 points</li>
          <li>Games are {config?.gameDurationMins || 12} minutes (no half-time)</li>
          {config?.koCompetitions?.map((c: any) => (
            <li key={c.key}>{c.qualifyPositions.map((p: number) => p <= 2 ? `${p === 1 ? "1st" : "2nd"}` : `${p}${p === 3 ? "rd" : "th"}`).join(" & ")} place → {c.label}</li>
          ))}
        </ul>
        <h3 className="font-bold mt-4">Score Reporting</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>One team submits the score, the other confirms</li>
          <li>If disputed, find an organiser — do not re-submit</li>
          <li>Penalty shootout goals do not count for Golden Boot</li>
        </ul>
        <h3 className="font-bold mt-4">Knockout</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>If drawn after full time, straight to penalties</li>
        </ul>
      </div>
    </div>
  );
}
