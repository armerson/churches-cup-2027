"use client";

import { useState, useEffect, useCallback } from "react";
import { useTournament, getPitchClass } from "@/lib/use-tournament";
import { useDarkMode } from "@/lib/use-dark-mode";
import { useLiveData } from "@/lib/use-live-data";

type Tab = "live" | "fixtures" | "standings" | "knockout" | "boot" | "info";

export function PlayerView({ onBack }: { onBack: () => void }) {
  const { config } = useTournament();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [tab, setTab] = useState<Tab>("live");
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

  useEffect(() => { fetchData(); }, [fetchData]);
  useLiveData(fetchData);

  const groups = config?.groups || {};
  const pitchColors = config?.pitchColors || {};
  const tournamentName = config?.name || "Churches Cup";
  const koComps = config?.koCompetitions || [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "Live" },
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
            <h1 className="text-lg font-bold">{tournamentName}</h1>
            <p className="text-blue-200 text-xs">Player View</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleDark} className="text-blue-200 text-xs hover:text-white">{dark ? "Light" : "Dark"}</button>
            <button onClick={onBack} className="text-blue-200 text-xs hover:text-white">Back</button>
          </div>
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
        {tab === "live" && <LiveView matches={matches} koMatches={koMatches} pitchColors={pitchColors} gameDuration={config?.gameDurationMins || 12} />}
        {tab === "fixtures" && <AllFixtures matches={matches} groups={groups} pitchColors={pitchColors} />}
        {tab === "standings" && <Standings matches={matches} groups={groups} koComps={koComps} />}
        {tab === "knockout" && <Knockout matches={koMatches} koComps={koComps} pitchColors={pitchColors} />}
        {tab === "boot" && <GoldenBoot data={goldenBoot} />}
        {tab === "info" && <Info config={config} />}
      </main>
    </div>
  );
}

function LiveView({ matches, koMatches, pitchColors, gameDuration }: { matches: any[]; koMatches: any[]; pitchColors: Record<string, string>; gameDuration: number }) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  function addMins(time: string, mins: number) {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  const allGames = [
    ...matches.map((m: any) => ({ type: "group" as const, label: `Group ${m.group}`, team1: m.team1, team2: m.team2, kickoff: m.kickoff, pitch: m.pitch, score1: m.score1, score2: m.score2, status: m.status })),
    ...koMatches.map((m: any) => ({ type: "ko" as const, label: `${m.competition} · ${m.round}`, team1: m.team1Name, team2: m.team2Name, kickoff: m.kickoff, pitch: m.pitch, score1: m.score1, score2: m.score2, status: m.winnerId ? "confirmed" : m.status })),
  ].filter((g) => g.kickoff);

  const playing = allGames.filter((g) => g.kickoff && g.kickoff <= currentTime && addMins(g.kickoff, gameDuration) > currentTime && g.status !== "confirmed");
  const upcoming = allGames.filter((g) => g.kickoff && g.kickoff > currentTime).sort((a, b) => a.kickoff!.localeCompare(b.kickoff!));
  const nextKickoff = upcoming[0]?.kickoff;
  const nextUp = upcoming.filter((g) => g.kickoff === nextKickoff);
  const recent = allGames.filter((g) => g.status === "confirmed").sort((a, b) => (b.kickoff || "").localeCompare(a.kickoff || "")).slice(0, 6);

  function MatchCard({ g }: { g: typeof allGames[0] }) {
    return (
      <div className="bg-white rounded-lg px-3 py-2.5 shadow-sm border flex justify-between items-center">
        <div>
          <p className="font-semibold text-sm">{g.team1} <span className="text-gray-400">vs</span> {g.team2}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-medium">{g.label}</span>
            {g.kickoff && <span className="text-[10px] text-gray-500">{g.kickoff}</span>}
            {g.pitch && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getPitchClass(pitchColors, g.pitch)}`}>{g.pitch}</span>}
          </div>
        </div>
        {g.score1 !== null && <span className="text-lg font-bold">{g.score1}–{g.score2}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Match Day</h2>

      {playing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">Playing Now</h3>
          </div>
          <div className="space-y-1.5">
            {playing.map((g, i) => <MatchCard key={i} g={g} />)}
          </div>
        </div>
      )}

      {nextUp.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Up Next — {nextKickoff}</h3>
          <div className="space-y-1.5">
            {nextUp.map((g, i) => <MatchCard key={i} g={g} />)}
          </div>
        </div>
      )}

      {playing.length === 0 && nextUp.length === 0 && (
        <p className="text-gray-500 text-sm">No games scheduled right now.</p>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Results</h3>
          <div className="space-y-1.5">
            {recent.map((g, i) => <MatchCard key={i} g={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AllFixtures({ matches, groups, pitchColors }: { matches: any[]; groups: Record<string, string[]>; pitchColors: Record<string, string> }) {
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const groupKeys = Object.keys(groups).sort();
  const filtered = filterGroup === "all" ? matches : matches.filter((m: any) => m.group === filterGroup);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">All Fixtures</h2>
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs">
          <option value="all">All Groups</option>
          {groupKeys.map((g) => <option key={g} value={g}>Group {g}</option>)}
        </select>
      </div>
      {(filterGroup === "all" ? groupKeys : [filterGroup]).map((group) => {
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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getPitchClass(pitchColors, m.pitch)}`}>
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

function Standings({ matches, groups, koComps }: { matches: any[]; groups: Record<string, string[]>; koComps: any[] }) {
  const confirmed = matches.filter((m: any) => m.status === "confirmed");
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
    s1.gf += m.score1; s1.ga += m.score2;
    s2.gf += m.score2; s2.ga += m.score1;
    if (m.score1 > m.score2) { s1.w++; s1.pts += 3; s2.l++; }
    else if (m.score1 < m.score2) { s2.w++; s2.pts += 3; s1.l++; }
    else { s1.d++; s2.d++; s1.pts++; s2.pts++; }
    s1.gd = s1.gf - s1.ga;
    s2.gd = s2.gf - s2.ga;
  }

  const positionColors = ["bg-green-50", "bg-green-50", "bg-blue-50", "bg-orange-50"];

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
                    <tr key={s.name} className={positionColors[i] || ""}>
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
          {koComps.map((c, i) => {
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

function Knockout({ matches, koComps, pitchColors }: { matches: any[]; koComps: any[]; pitchColors: Record<string, string> }) {
  const roundLabels: Record<string, string> = { r16: "Round of 16", r1: "Round 1", qf: "Quarter-Final", sf: "Semi-Final", final: "Final" };

  if (matches.length === 0) return (
    <div>
      <h2 className="text-lg font-bold mb-3">Knockout</h2>
      <p className="text-gray-500 text-sm">Bracket not yet available.</p>
    </div>
  );

  const compKeys = koComps.map((c) => c.key);
  const compLabels = Object.fromEntries(koComps.map((c) => [c.key, c.label]));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Knockout</h2>
      {compKeys.map((comp) => {
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

function Info({ config }: { config: any }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Info</h2>
      <div className="bg-white rounded-lg p-4 shadow-sm border text-sm space-y-3">
        <h3 className="font-bold">Group Stage Rules</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>Win = 3 points, Draw = 1 point, Loss = 0 points</li>
          <li>Games are {config?.gameDurationMins || 12} minutes (no half-time)</li>
          {config?.koCompetitions?.map((c: any) => (
            <li key={c.key}>{c.qualifyPositions.map((p: number) => p <= 2 ? `${p === 1 ? "1st" : "2nd"}` : `${p}${p === 3 ? "rd" : "th"}`).join(" & ")} place → {c.label}</li>
          ))}
        </ul>
        <h3 className="font-bold mt-4">Knockout Rules</h3>
        <ul className="list-disc pl-4 space-y-1 text-gray-700">
          <li>If drawn after full time → straight to penalties</li>
          <li>Penalty goals do not count for Golden Boot</li>
        </ul>
      </div>
    </div>
  );
}
