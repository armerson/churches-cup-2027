"use client";

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@/app/page";

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

const GROUPS: Record<string, string[]> = {
  A: ["Covenant", "Mourne", "Spain Madrid", "Waringstown Presbyterian Church"],
  B: ["Bethany FC", "Ballymagerney FPC", "YAKAAR ACADEMY", "Sloan Street Presbyterian"],
  C: ["Grace Community Church Richhill", "Portabello Baptist", "NTPC", "Portadown Elim"],
  D: ["Eagles", "Acpc fc", "Lurgan Elim", "Ulster wonders fc"],
  E: ["Craigavon PC", "Newmills", "Bleary FC", "Benburb Ballers"],
  F: ["Killicomaine Baptist church", "CGR FC", "CFPC Originals", "Gortmerron Goats"],
  G: ["Ancora Church Football", "Legacurry Presbyterian", "Emmanuel Baptist", "Downshire Church"],
  H: ["Derry/Edenderry", "The Blues", "Ardtrea Aardvarks", "Team Black"],
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
  const [notices, setNotices] = useState<any[]>([]);
  const [goldenBoot, setGoldenBoot] = useState<any[]>([]);

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

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "fixtures", label: "Fixtures" },
    { id: "submit", label: "Report" },
    { id: "confirm", label: "Confirm", badge: pendingConfirm.length },
    { id: "standings", label: "Table" },
    { id: "knockout", label: "KO" },
    { id: "roster", label: "Roster" },
    { id: "boot", label: "Boot" },
    { id: "info", label: "Info" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <header className="bg-[#274296] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Churches Cup 2027</h1>
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
        {tab === "fixtures" && <FixturesTab matches={myMatches} teamName={session.teamName!} />}
        {tab === "submit" && <SubmitTab matches={myMatches} session={session} onSubmitted={fetchData} />}
        {tab === "confirm" && <ConfirmTab matches={pendingConfirm} session={session} onConfirmed={fetchData} />}
        {tab === "standings" && <StandingsTab matches={matches} myGroup={session.group!} />}
        {tab === "knockout" && <KnockoutTab matches={koMatches} />}
        {tab === "roster" && <RosterTab session={session} />}
        {tab === "boot" && <GoldenBootTab data={goldenBoot} />}
        {tab === "info" && <InfoTab />}
      </main>
    </div>
  );
}

function FixturesTab({ matches, teamName }: { matches: Match[]; teamName: string }) {
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PITCH_COLORS[m.pitch] || "bg-gray-200"}`}>
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
              <button key={m.id} onClick={() => { setSelectedMatch(m); setMsg(""); }}
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
              <input type="number" min="0" max="99" value={score1} onChange={(e) => setScore1(e.target.value)}
                className="w-full border rounded-lg px-3 py-3 text-center text-2xl font-bold" required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Opponent</label>
              <input type="number" min="0" max="99" value={score2} onChange={(e) => setScore2(e.target.value)}
                className="w-full border rounded-lg px-3 py-3 text-center text-2xl font-bold" required />
            </div>
          </div>
          <button type="submit" disabled={submitting}
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

  async function handleAction(match: Match, action: "confirm" | "dispute") {
    setConfirming(match.id);
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, matchId: match.id, confirmedById: session.teamId }),
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
        return (
          <div key={m.id} className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{session.teamName} vs {opp}</p>
              <span className="text-2xl font-bold">{myScore}–{oppScore}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAction(m, "confirm")} disabled={confirming === m.id}
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

function StandingsTab({ matches, myGroup }: { matches: Match[]; myGroup: string }) {
  const confirmed = matches.filter((m) => m.status === "confirmed");
  const standings: Record<string, Record<string, Standing>> = {};
  for (const [group, teams] of Object.entries(GROUPS)) {
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

  const groupOrder = [myGroup, ...Object.keys(GROUPS).filter((g) => g !== myGroup)];

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
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span> Championship</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span> Shield</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span> Plate</span>
      </div>
    </div>
  );
}

function KnockoutTab({ matches }: { matches: any[] }) {
  const comps = ["championship", "shield", "plate"];
  const compLabels: Record<string, string> = { championship: "Championship", shield: "Shield", plate: "Plate" };
  const roundLabels: Record<string, string> = { r16: "Round of 16", r1: "Round 1", qf: "Quarter-Final", sf: "Semi-Final", final: "Final" };

  if (matches.length === 0) return (
    <div>
      <h2 className="text-lg font-bold mb-3">Knockout</h2>
      <p className="text-gray-500 text-sm">Bracket not yet available.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Knockout</h2>
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
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PITCH_COLORS[m.pitch] || "bg-gray-200"}`}>
                              {m.pitch}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.winnerId ? (
                        <div className="text-right">
                          <span className="text-lg font-bold">{m.score1}–{m.score2}</span>
                          {m.penScore1 !== null && <span className="block text-[10px] text-gray-500">Pens: {m.penScore1}–{m.penScore2}</span>}
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
          <li>3rd place goes to Shield, 4th to Plate</li>
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
          <li>Championship: R16 13:40, QF 14:20, SF 14:44, Final 15:28</li>
          <li>Shield: R1 14:04, QF 14:32, SF 14:56, Final 15:28</li>
          <li>Plate: R1 14:28, SF 15:04, Final 15:28</li>
        </ul>
      </div>
    </div>
  );
}
