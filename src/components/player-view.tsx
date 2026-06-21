"use client";

import { useState, useEffect, useCallback } from "react";

type Tab = "fixtures" | "standings" | "knockout" | "boot" | "info";

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

export function PlayerView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("standings");
  const [matches, setMatches] = useState<any[]>([]);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "fixtures", label: "Fixtures" },
    { id: "standings", label: "Standings" },
    { id: "knockout", label: "Knockout" },
    { id: "boot", label: "Boot" },
    { id: "info", label: "Info" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <header className="bg-[#274296] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Churches Cup 2027</h1>
            <p className="text-blue-200 text-xs">Player View</p>
          </div>
          <button onClick={onBack} className="text-blue-200 text-xs hover:text-white">Back</button>
        </div>
      </header>

      {notices.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <p className="text-xs text-amber-800 font-medium">{notices[0].message}</p>
        </div>
      )}

      <nav className="bg-white border-b">
        <div className="flex gap-1 px-2 py-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg uppercase tracking-wide transition-colors ${
                tab === t.id ? "bg-[#274296] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{t.label}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-4">
        {tab === "fixtures" && <AllFixtures matches={matches} />}
        {tab === "standings" && <Standings matches={matches} />}
        {tab === "knockout" && <Knockout matches={koMatches} />}
        {tab === "boot" && <GoldenBoot data={goldenBoot} />}
        {tab === "info" && <Info />}
      </main>
    </div>
  );
}

function AllFixtures({ matches }: { matches: any[] }) {
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const groups = Object.keys(GROUPS);
  const filtered = filterGroup === "all" ? matches : matches.filter((m: any) => m.group === filterGroup);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">All Fixtures</h2>
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs">
          <option value="all">All Groups</option>
          {groups.map((g) => <option key={g} value={g}>Group {g}</option>)}
        </select>
      </div>
      {(filterGroup === "all" ? groups : [filterGroup]).map((group) => {
        const groupMatches = filtered.filter((m: any) => m.group === group);
        if (groupMatches.length === 0) return null;
        return (
          <div key={group}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Group {group}</h3>
            <div className="space-y-1.5 mb-3">
              {groupMatches.map((m: any) => (
                <div key={m.id} className="bg-white rounded-lg px-3 py-2.5 shadow-sm border flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{m.team1} <span className="text-gray-400">vs</span> {m.team2}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.kickoff && <span className="text-xs text-gray-500">{m.kickoff}</span>}
                      {m.pitch && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PITCH_COLORS[m.pitch] || "bg-gray-200"}`}>
                          {m.pitch.charAt(0).toUpperCase() + m.pitch.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {m.score1 !== null ? (
                      <>
                        <span className="text-lg font-bold">{m.score1}–{m.score2}</span>
                        <span className={`block text-[10px] font-medium ${
                          m.status === "confirmed" ? "text-green-600" : m.status === "disputed" ? "text-red-600" : "text-amber-600"
                        }`}>{m.status}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Standing = { name: string; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number };

function Standings({ matches }: { matches: any[] }) {
  const confirmed = matches.filter((m: any) => m.status === "confirmed");
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
    s1.gf += m.score1; s1.ga += m.score2;
    s2.gf += m.score2; s2.ga += m.score1;
    if (m.score1 > m.score2) { s1.w++; s1.pts += 3; s2.l++; }
    else if (m.score1 < m.score2) { s2.w++; s2.pts += 3; s1.l++; }
    else { s1.d++; s2.d++; s1.pts++; s2.pts++; }
    s1.gd = s1.gf - s1.ga;
    s2.gd = s2.gf - s2.ga;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Standings</h2>
      {Object.entries(standings).map(([group, teams]) => {
        const sorted = Object.values(teams).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        return (
          <div key={group}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Group {group}</h3>
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

function Knockout({ matches }: { matches: any[] }) {
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
                          <span className="text-[10px] text-gray-500 uppercase">{roundLabels[m.round] || m.round}</span>
                          {m.kickoff && <span className="text-[10px] text-gray-500">{m.kickoff}</span>}
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

function GoldenBoot({ data }: { data: any[] }) {
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

function Info() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Info</h2>
      <div className="bg-white rounded-lg p-4 shadow-sm border text-sm space-y-3">
        <h3 className="font-bold">Group Stage Rules</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>Win = 3 points, Draw = 1 point, Loss = 0 points</li>
          <li>Games are 12 minutes (no half-time)</li>
          <li>Top 2 from each group → Championship</li>
          <li>3rd place → Shield, 4th place → Plate</li>
        </ul>
        <h3 className="font-bold mt-4">Knockout Rules</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>If drawn after full time → straight to penalties</li>
          <li>Penalty goals do not count for Golden Boot</li>
        </ul>
        <h3 className="font-bold mt-4">Schedule</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>Groups: 10:00–12:34</li>
          <li>Championship R16: 13:40 / QF: 14:20 / SF: 14:44 / Final: 15:28</li>
          <li>Shield R1: 14:04 / QF: 14:32 / SF: 14:56 / Final: 15:28</li>
          <li>Plate R1: 14:28 / SF: 15:04 / Final: 15:28</li>
        </ul>
      </div>
    </div>
  );
}
