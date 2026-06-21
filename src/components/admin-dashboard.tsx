"use client";

import { useState, useEffect, useCallback } from "react";
import { useTournament, getPitchClass } from "@/lib/use-tournament";

type Tab = "scores" | "knockout" | "golden-boot" | "notices";

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
};

type KoMatch = {
  id: number;
  matchId: string;
  competition: string;
  round: string;
  team1Id: number | null;
  team2Id: number | null;
  team1Name: string;
  team2Name: string;
  score1: number | null;
  score2: number | null;
  penScore1: number | null;
  penScore2: number | null;
  winnerId: number | null;
  winnerName: string | null;
  kickoff: string | null;
  pitch: string | null;
};

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { config } = useTournament();
  const [tab, setTab] = useState<Tab>("scores");
  const [matches, setMatches] = useState<Match[]>([]);
  const [koMatches, setKoMatches] = useState<KoMatch[]>([]);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "scores", label: "Scores" },
    { id: "knockout", label: "Knockout" },
    { id: "golden-boot", label: "Boot" },
    { id: "notices", label: "Notices" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <header className="bg-[#274296] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{config?.name || "Churches Cup"}</h1>
            <p className="text-blue-200 text-xs">Organiser Dashboard</p>
          </div>
          <button onClick={onLogout} className="text-blue-200 text-xs hover:text-white">Logout</button>
        </div>
      </header>

      <nav className="bg-white border-b overflow-x-auto">
        <div className="flex gap-1 px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap uppercase tracking-wide transition-colors ${
                tab === t.id ? "bg-[#274296] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-4">
        {tab === "scores" && <AdminScores matches={matches} onRefresh={fetchData} pitchColors={config?.pitchColors || {}} />}
        {tab === "knockout" && <AdminKnockout matches={koMatches} onRefresh={fetchData} pitchColors={config?.pitchColors || {}} koComps={config?.koCompetitions || []} />}
        {tab === "golden-boot" && <AdminGoldenBoot data={goldenBoot} />}
        {tab === "notices" && <AdminNotices notices={notices} onRefresh={fetchData} />}
      </main>
    </div>
  );
}

function AdminScores({ matches, onRefresh, pitchColors }: { matches: Match[]; onRefresh: () => void; pitchColors: Record<string, string> }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const groups = [...new Set(matches.map((m) => m.group))].sort();
  const filtered = filter === "all" ? matches : matches.filter((m) => m.group === filter);

  async function handleUpdate(matchId: number) {
    setBusy(true);
    await fetch("/api/admin/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", matchId, score1: Number(s1), score2: Number(s2) }),
    });
    setEditing(null);
    setBusy(false);
    onRefresh();
  }

  async function handleReset(matchId: number) {
    if (!confirm("Reset this match? Scores and scorers will be deleted.")) return;
    setBusy(true);
    await fetch("/api/admin/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", matchId }),
    });
    setBusy(false);
    onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">All Scores</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs"
        >
          <option value="all">All Groups</option>
          {groups.map((g) => <option key={g} value={g}>Group {g}</option>)}
        </select>
      </div>

      {filtered.map((m) => (
        <div key={m.id} className="bg-white rounded-lg p-3 shadow-sm border">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{m.team1} vs {m.team2}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500 uppercase font-medium">Group {m.group}</span>
                {m.kickoff && <span className="text-[10px] text-gray-500">{m.kickoff}</span>}
                {m.pitch && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getPitchClass(pitchColors, m.pitch)}`}>
                    {m.pitch}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              {m.score1 !== null ? (
                <span className="text-lg font-bold">{m.score1}–{m.score2}</span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                m.status === "confirmed" ? "bg-green-100 text-green-700"
                : m.status === "pending" ? "bg-amber-100 text-amber-700"
                : m.status === "disputed" ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-500"
              }`}>{m.status}</span>
            </div>
          </div>

          {editing === m.id ? (
            <div className="mt-3 flex items-center gap-2">
              <input type="number" min="0" max="99" value={s1} onChange={(e) => setS1(e.target.value)}
                className="w-14 border rounded px-2 py-1.5 text-center text-sm font-bold" placeholder="H" />
              <span className="text-gray-400">–</span>
              <input type="number" min="0" max="99" value={s2} onChange={(e) => setS2(e.target.value)}
                className="w-14 border rounded px-2 py-1.5 text-center text-sm font-bold" placeholder="A" />
              <button onClick={() => handleUpdate(m.id)} disabled={busy}
                className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">Save</button>
              <button onClick={() => setEditing(null)}
                className="text-gray-400 text-xs px-2 py-1.5">Cancel</button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setEditing(m.id); setS1(String(m.score1 ?? "")); setS2(String(m.score2 ?? "")); }}
                className="text-[11px] text-[#274296] font-semibold hover:underline">Edit</button>
              {m.status !== "upcoming" && (
                <button onClick={() => handleReset(m.id)} disabled={busy}
                  className="text-[11px] text-red-600 font-semibold hover:underline">Reset</button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AdminKnockout({ matches, onRefresh, pitchColors, koComps }: { matches: KoMatch[]; onRefresh: () => void; pitchColors: Record<string, string>; koComps: any[] }) {
  const [seeding, setSeeding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [ps1, setPs1] = useState("");
  const [ps2, setPs2] = useState("");
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function seedBracket() {
    if (!confirm("Seed the knockout bracket from current standings? This will overwrite any existing seedings.")) return;
    setSeeding(true);
    await fetch("/api/admin/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    setSeeding(false);
    onRefresh();
  }

  async function submitResult(matchId: string) {
    const match = matches.find((m) => m.matchId === matchId);
    if (!match) return;
    setBusy(true);

    const sc1 = Number(s1);
    const sc2 = Number(s2);
    let w = winnerId;
    if (sc1 > sc2) w = match.team1Id;
    else if (sc2 > sc1) w = match.team2Id;

    await fetch("/api/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        score1: sc1,
        score2: sc2,
        penScore1: sc1 === sc2 ? Number(ps1) : null,
        penScore2: sc1 === sc2 ? Number(ps2) : null,
        winnerId: w,
      }),
    });

    // Advance winner
    await fetch("/api/admin/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance", matchId }),
    });

    setEditing(null);
    setBusy(false);
    onRefresh();
  }

  const comps = koComps.map((c) => c.key);
  const compLabels = Object.fromEntries(koComps.map((c) => [c.key, c.label]));
  const roundLabels: Record<string, string> = { r16: "Round of 16", r1: "Round 1", qf: "Quarter-Final", sf: "Semi-Final", final: "Final" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Knockout</h2>
        <button onClick={seedBracket} disabled={seeding}
          className="bg-[#274296] text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
          {seeding ? "Seeding..." : "Seed Bracket"}
        </button>
      </div>

      {comps.map((comp) => {
        const compMatches = matches.filter((m) => m.competition === comp);
        if (compMatches.length === 0) return null;
        const rounds = [...new Set(compMatches.map((m) => m.round))];
        return (
          <div key={comp}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{compLabels[comp]}</h3>
            {rounds.map((round) => (
              <div key={round} className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{roundLabels[round] || round}</p>
                <div className="space-y-1.5">
                  {compMatches.filter((m) => m.round === round).map((m) => (
                    <div key={m.matchId} className="bg-white rounded-lg p-3 shadow-sm border">
                      <div className="flex justify-between items-center">
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
                            <span className="block text-[10px] text-green-600 font-medium">{m.winnerName} wins</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>

                      {!m.winnerId && m.team1Id && m.team2Id && (
                        editing === m.matchId ? (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <input type="number" min="0" max="99" value={s1} onChange={(e) => setS1(e.target.value)}
                                className="w-14 border rounded px-2 py-1.5 text-center text-sm font-bold" placeholder={m.team1Name.substring(0,3)} />
                              <span className="text-gray-400">–</span>
                              <input type="number" min="0" max="99" value={s2} onChange={(e) => setS2(e.target.value)}
                                className="w-14 border rounded px-2 py-1.5 text-center text-sm font-bold" placeholder={m.team2Name.substring(0,3)} />
                            </div>
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
                                  <button onClick={() => setWinnerId(m.team1Id)}
                                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${winnerId === m.team1Id ? "bg-green-600 text-white" : "bg-gray-100"}`}>
                                    {m.team1Name} wins
                                  </button>
                                  <button onClick={() => setWinnerId(m.team2Id)}
                                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${winnerId === m.team2Id ? "bg-green-600 text-white" : "bg-gray-100"}`}>
                                    {m.team2Name} wins
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => submitResult(m.matchId)} disabled={busy || !s1 || !s2}
                                className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">Save</button>
                              <button onClick={() => setEditing(null)}
                                className="text-gray-400 text-xs px-2 py-1.5">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setEditing(m.matchId); setS1(""); setS2(""); setPs1(""); setPs2(""); setWinnerId(null); }}
                            className="mt-2 text-[11px] text-[#274296] font-semibold hover:underline">Enter Result</button>
                        )
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

function AdminGoldenBoot({ data }: { data: any[] }) {
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

function AdminNotices({ notices, onRefresh }: { notices: any[]; onRefresh: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", message }),
    });
    setMessage("");
    setBusy(false);
    onRefresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this notice?")) return;
    await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Notice Board</h2>
      <form onSubmit={handlePost} className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type an announcement..."
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button type="submit" disabled={busy || !message.trim()}
          className="bg-[#274296] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
          {busy ? "Posting..." : "Post Notice"}
        </button>
      </form>

      {notices.map((n) => (
        <div key={n.id} className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm whitespace-pre-wrap">{n.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <button onClick={() => handleDelete(n.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
