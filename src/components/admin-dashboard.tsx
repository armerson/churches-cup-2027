"use client";

import { useState, useEffect, useCallback } from "react";
import { useTournament, getPitchClass } from "@/lib/use-tournament";
import { useDarkMode } from "@/lib/use-dark-mode";
import { useLiveData } from "@/lib/use-live-data";

type Tab = "setup" | "schedule" | "teams" | "scores" | "knockout" | "golden-boot" | "notices" | "export";

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
  submittedByName: string | null;
  confirmedByName: string | null;
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
  submittedByName: string | null;
  confirmedByName: string | null;
  kickoff: string | null;
  pitch: string | null;
};

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { config } = useTournament();
  const { dark, toggle: toggleDark } = useDarkMode();
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

  useEffect(() => { fetchData(); }, [fetchData]);
  useLiveData(fetchData);

  const tabs: { id: Tab; label: string }[] = [
    { id: "setup", label: "Setup" },
    { id: "schedule", label: "Schedule" },
    { id: "teams", label: "Teams" },
    { id: "scores", label: "Scores" },
    { id: "knockout", label: "Knockout" },
    { id: "golden-boot", label: "Boot" },
    { id: "notices", label: "Notices" },
    { id: "export", label: "Export" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <header className="bg-[#274296] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{config?.name || "Churches Cup"}</h1>
            <p className="text-blue-200 text-xs">Organiser Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleDark} className="text-blue-200 text-xs hover:text-white">{dark ? "Light" : "Dark"}</button>
            <button onClick={onLogout} className="text-blue-200 text-xs hover:text-white">Logout</button>
          </div>
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
        {tab === "setup" && <AdminSetup config={config} />}
        {tab === "schedule" && <AdminSchedule matches={matches} koMatches={koMatches} onRefresh={fetchData} pitchColors={config?.pitchColors || {}} pitches={config?.pitches as string[] || []} />}
        {tab === "teams" && <AdminTeams />}
        {tab === "scores" && <AdminScores matches={matches} onRefresh={fetchData} pitchColors={config?.pitchColors || {}} />}
        {tab === "knockout" && <AdminKnockout matches={koMatches} onRefresh={fetchData} pitchColors={config?.pitchColors || {}} koComps={config?.koCompetitions || []} />}
        {tab === "golden-boot" && <AdminGoldenBoot data={goldenBoot} />}
        {tab === "export" && <AdminExport />}
        {tab === "notices" && <AdminNotices notices={notices} onRefresh={fetchData} />}
      </main>
    </div>
  );
}

const AVAILABLE_COLORS: { name: string; classes: string }[] = [
  { name: "orange", classes: "bg-orange-500 text-white" },
  { name: "blue", classes: "bg-[#274296] text-white" },
  { name: "yellow", classes: "bg-yellow-400 text-gray-900" },
  { name: "red", classes: "bg-red-600 text-white" },
  { name: "green", classes: "bg-green-600 text-white" },
  { name: "purple", classes: "bg-purple-600 text-white" },
  { name: "pink", classes: "bg-pink-500 text-white" },
  { name: "white", classes: "bg-white text-gray-900 border border-gray-300" },
];

function AdminSetup({ config }: { config: any }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(config?.name || "");
  const [year, setYear] = useState(String(config?.year || new Date().getFullYear()));
  const [gameDuration, setGameDuration] = useState(String(config?.gameDurationMins || 12));
  const [maxSquad, setMaxSquad] = useState(String(config?.maxSquadSize || 20));
  const [gapMins, setGapMins] = useState(String(config?.groupStageGapMins || 14));
  const [startTime, setStartTime] = useState(config?.groupStageStartTime || "10:00");
  const [numGroups, setNumGroups] = useState(String(config?.totalGroups || 8));
  const [teamsPerGroup, setTeamsPerGroup] = useState(String(config?.teamsPerGroup || 4));
  const [adminPin, setAdminPin] = useState("");
  const [thirdPlace, setThirdPlace] = useState(config?.thirdPlacePlayoff || false);
  const [selectedPitches, setSelectedPitches] = useState<string[]>((config?.pitches as string[]) || ["orange", "blue", "yellow", "red"]);
  const [groups, setGroups] = useState<Record<string, string[]>>(() => {
    if (config?.groups && Object.keys(config.groups).length > 0) return config.groups;
    const g: Record<string, string[]> = {};
    const n = Number(numGroups) || 8;
    const tpg = Number(teamsPerGroup) || 4;
    for (let i = 0; i < n; i++) {
      g[String.fromCharCode(65 + i)] = Array(tpg).fill("");
    }
    return g;
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  function rebuildGroups() {
    const n = Number(numGroups) || 1;
    const tpg = Number(teamsPerGroup) || 2;
    const newGroups: Record<string, string[]> = {};
    for (let i = 0; i < n; i++) {
      const letter = String.fromCharCode(65 + i);
      const existing = groups[letter] || [];
      newGroups[letter] = Array.from({ length: tpg }, (_, j) => existing[j] || "");
    }
    setGroups(newGroups);
  }

  function togglePitch(pitch: string) {
    setSelectedPitches((prev) =>
      prev.includes(pitch) ? prev.filter((p) => p !== pitch) : [...prev, pitch]
    );
  }

  async function handleGenerate() {
    const allTeams = Object.values(groups).flat();
    const emptyTeams = allTeams.filter((t) => !t.trim());
    if (emptyTeams.length > 0) {
      setResult(`Please fill in all ${emptyTeams.length} empty team name(s).`);
      return;
    }
    if (selectedPitches.length === 0) {
      setResult("Please select at least one pitch.");
      return;
    }
    if (!name.trim()) {
      setResult("Please enter a tournament name.");
      return;
    }

    const msg = `This will delete ALL existing teams, matches, scores, and rosters. Create new tournament "${name.trim()}" with ${allTeams.length} teams?`;
    if (!confirm(msg)) return;

    setBusy(true);
    setResult("");
    const pitchColors = Object.fromEntries(
      selectedPitches.map((p) => [p, AVAILABLE_COLORS.find((c) => c.name === p)?.classes || "bg-gray-200 text-gray-800"])
    );

    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setup",
        name: name.trim(),
        year: Number(year),
        groups,
        pitches: selectedPitches,
        pitchColors,
        gameDurationMins: Number(gameDuration),
        maxSquadSize: Number(maxSquad),
        groupStageGapMins: Number(gapMins),
        groupStageStartTime: startTime,
        koCompetitions: [
          { key: "championship", label: "Championship", qualifyPositions: [1, 2], format: "r16" },
          ...(Number(teamsPerGroup) >= 3 ? [{ key: "shield", label: "Shield", qualifyPositions: [3], format: "r1" }] : []),
          ...(Number(teamsPerGroup) >= 4 ? [{ key: "plate", label: "Plate", qualifyPositions: [4], format: "r1" }] : []),
        ],
        adminPin: adminPin.trim() || undefined,
        thirdPlacePlayoff: thirdPlace,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) {
      setResult(`Error: ${data.error}`);
    } else {
      setResult(`Tournament created! ${data.teams} teams, ${data.groupMatches} group matches, ${data.koMatches} KO fixtures. Team PINs: 0001–${String(data.teams).padStart(4, "0")}. Reload to see changes.`);
    }
  }

  const steps = [
    { label: "Basics", icon: "1" },
    { label: "Pitches", icon: "2" },
    { label: "Teams", icon: "3" },
    { label: "Review", icon: "4" },
  ];

  const [settingsPin, setSettingsPin] = useState("");
  const [settingsThirdPlace, setSettingsThirdPlace] = useState(config?.thirdPlacePlayoff || false);
  const [settingsMsg, setSettingsMsg] = useState("");

  async function saveSettings() {
    const updates: any = {};
    if (settingsPin.trim()) updates.adminPin = settingsPin.trim();
    updates.thirdPlacePlayoff = settingsThirdPlace;
    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ...updates }),
    });
    if (res.ok) {
      setSettingsMsg("Settings saved.");
      setSettingsPin("");
    } else {
      setSettingsMsg("Error saving settings.");
    }
    setTimeout(() => setSettingsMsg(""), 3000);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Tournament Setup</h2>

      {config?.setupComplete && (
        <div className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
          <h3 className="text-sm font-bold">Settings</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Change Admin PIN</label>
            <input type="text" value={settingsPin} onChange={(e) => setSettingsPin(e.target.value)}
              placeholder="Leave blank to keep current" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settingsThirdPlace} onChange={(e) => setSettingsThirdPlace(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#274296] focus:ring-[#274296]" />
            <span className="text-sm text-gray-700">3rd/4th Place Playoff</span>
          </label>
          <button onClick={saveSettings} className="bg-[#274296] text-white text-xs font-semibold px-4 py-2 rounded-lg">
            Save Settings
          </button>
          {settingsMsg && <p className="text-xs font-medium text-green-700">{settingsMsg}</p>}
        </div>
      )}

      <div className="flex gap-1">
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              step === i ? "bg-[#274296] text-white" : i < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tournament Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Schools Cup 2027" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Game Duration (mins)</label>
              <input type="number" min="5" max="90" value={gameDuration} onChange={(e) => setGameDuration(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Max Squad Size</label>
              <input type="number" min="5" max="50" value={maxSquad} onChange={(e) => setMaxSquad(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Gap Between Games (mins)</label>
              <input type="number" min="1" max="60" value={gapMins} onChange={(e) => setGapMins(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">First Kick-off</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Number of Groups</label>
              <input type="number" min="1" max="16" value={numGroups}
                onChange={(e) => { setNumGroups(e.target.value); }}
                onBlur={rebuildGroups}
                className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teams per Group</label>
              <input type="number" min="2" max="8" value={teamsPerGroup}
                onChange={(e) => { setTeamsPerGroup(e.target.value); }}
                onBlur={rebuildGroups}
                className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Admin PIN (leave blank to keep default 1234)</label>
            <input type="text" value={adminPin} onChange={(e) => setAdminPin(e.target.value)}
              placeholder="1234" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={thirdPlace} onChange={(e) => setThirdPlace(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#274296] focus:ring-[#274296]" />
            <span className="text-sm font-medium text-gray-700">3rd/4th Place Playoff in KO</span>
          </label>
          <button onClick={() => { rebuildGroups(); setStep(1); }}
            className="w-full bg-[#274296] text-white font-semibold py-2.5 rounded-lg text-sm">
            Next: Pitches
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border space-y-4">
          <p className="text-sm text-gray-600">Select which pitches are available:</p>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_COLORS.map((c) => (
              <button key={c.name} onClick={() => togglePitch(c.name)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${c.classes} ${
                  selectedPitches.includes(c.name) ? "ring-2 ring-offset-2 ring-[#274296] scale-105" : "opacity-40"
                }`}>
                {c.name.charAt(0).toUpperCase() + c.name.slice(1)} Pitch
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">{selectedPitches.length} pitch{selectedPitches.length !== 1 ? "es" : ""} selected</p>
          <button onClick={() => setStep(2)} disabled={selectedPitches.length === 0}
            className="w-full bg-[#274296] text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
            Next: Teams
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Enter team names for each group:</p>
          {Object.entries(groups).sort().map(([letter, teamNames]) => (
            <div key={letter} className="bg-white rounded-lg p-3 shadow-sm border">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Group {letter}</h3>
              <div className="space-y-1.5">
                {teamNames.map((t, i) => (
                  <input key={`${letter}-${i}`} type="text" value={t}
                    onChange={(e) => {
                      const updated = { ...groups };
                      updated[letter] = [...updated[letter]];
                      updated[letter][i] = e.target.value;
                      setGroups(updated);
                    }}
                    placeholder={`Team ${i + 1}`}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setStep(3)}
            className="w-full bg-[#274296] text-white font-semibold py-2.5 rounded-lg text-sm">
            Next: Review
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border space-y-4">
          <h3 className="font-bold text-sm">Review & Generate</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Tournament</span><span className="font-medium">{name || "—"} {year}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Groups</span><span className="font-medium">{Object.keys(groups).length} groups of {teamsPerGroup}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Teams</span><span className="font-medium">{Object.values(groups).flat().length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pitches</span><span className="font-medium">{selectedPitches.join(", ")}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Game Duration</span><span className="font-medium">{gameDuration} mins</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gap Between Games</span><span className="font-medium">{gapMins} mins</span></div>
            <div className="flex justify-between"><span className="text-gray-500">First Kick-off</span><span className="font-medium">{startTime}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Max Squad</span><span className="font-medium">{maxSquad} players</span></div>
            <div className="flex justify-between"><span className="text-gray-500">KO Competitions</span>
              <span className="font-medium">
                Championship{Number(teamsPerGroup) >= 3 ? ", Shield" : ""}{Number(teamsPerGroup) >= 4 ? ", Plate" : ""}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 font-medium">This will delete all existing tournament data (teams, matches, scores, rosters) and create a fresh tournament.</p>
          </div>

          <button onClick={handleGenerate} disabled={busy}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-50">
            {busy ? "Generating..." : "Generate Tournament"}
          </button>

          {result && (
            <div className={`text-sm font-medium rounded-lg px-3 py-2 ${
              result.startsWith("Error") ? "bg-red-50 text-red-700" : result.startsWith("Please") ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
            }`}>{result}</div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminTeams() {
  const [teamList, setTeamList] = useState<any[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinResult, setPinResult] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    const res = await fetch("/api/admin/teams");
    if (res.ok) setTeamList(await res.json());
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const groups = [...new Set(teamList.map((t) => t.groupLetter))].sort();

  async function rename(teamId: number) {
    if (!newName.trim()) return;
    setBusy(true);
    await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", teamId, name: newName.trim() }),
    });
    setEditing(null);
    setBusy(false);
    fetchTeams();
  }

  async function move(teamId: number) {
    setBusy(true);
    await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", teamId, groupLetter: newGroup }),
    });
    setEditing(null);
    setBusy(false);
    fetchTeams();
  }

  async function resetPin(teamId: number) {
    const pin = prompt("New 4-digit PIN for this team:", "0000");
    if (!pin) return;
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPin", teamId, pin }),
    });
    const data = await res.json();
    if (data.success) setPinResult(`PIN reset to: ${data.pin}`);
    setTimeout(() => setPinResult(null), 3000);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Team Management</h2>
      {pinResult && <div className="bg-green-50 text-green-700 text-sm font-medium rounded-lg px-3 py-2">{pinResult}</div>}
      {groups.map((g) => (
        <div key={g}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Group {g}</h3>
          {teamList.filter((t) => t.groupLetter === g).map((t) => (
            <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm border mb-1.5">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-sm">{t.name}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(t.id); setNewName(t.name); setNewGroup(t.groupLetter); }}
                    className="text-[11px] text-[#274296] font-semibold hover:underline">Edit</button>
                  <button onClick={() => resetPin(t.id)}
                    className="text-[11px] text-amber-600 font-semibold hover:underline">Reset PIN</button>
                </div>
              </div>
              {editing === t.id && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 border rounded px-2 py-1.5 text-sm" placeholder="Team name" />
                    <button onClick={() => rename(t.id)} disabled={busy}
                      className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">Rename</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                      className="border rounded px-2 py-1.5 text-sm">
                      {groups.map((gr) => <option key={gr} value={gr}>Group {gr}</option>)}
                    </select>
                    <button onClick={() => move(t.id)} disabled={busy || newGroup === t.groupLetter}
                      className="bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">Move</button>
                  </div>
                  <button onClick={() => setEditing(null)} className="text-gray-400 text-xs">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AdminSchedule({ matches, koMatches: koMatchList, onRefresh, pitchColors, pitches }: { matches: Match[]; koMatches: KoMatch[]; onRefresh: () => void; pitchColors: Record<string, string>; pitches: string[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [kickoff, setKickoff] = useState("");
  const [pitch, setPitch] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"group" | "ko">("group");

  async function save(matchId: string | number, isKo: boolean) {
    setBusy(true);
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", matchId, kickoff, pitch, isKo }),
    });
    setEditing(null);
    setBusy(false);
    onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Schedule</h2>
        <div className="flex gap-1">
          <button onClick={() => setView("group")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${view === "group" ? "bg-[#274296] text-white" : "bg-gray-100 text-gray-600"}`}>Group</button>
          <button onClick={() => setView("ko")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${view === "ko" ? "bg-[#274296] text-white" : "bg-gray-100 text-gray-600"}`}>Knockout</button>
        </div>
      </div>

      {view === "group" && matches.map((m) => (
        <div key={m.id} className="bg-white rounded-lg p-3 shadow-sm border">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{m.team1} vs {m.team2}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500 uppercase font-medium">Group {m.group}</span>
                {m.kickoff && <span className="text-[10px] text-gray-500">{m.kickoff}</span>}
                {m.pitch && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getPitchClass(pitchColors, m.pitch)}`}>{m.pitch}</span>}
              </div>
            </div>
            <button onClick={() => { setEditing(`g-${m.id}`); setKickoff(m.kickoff || ""); setPitch(m.pitch || ""); }}
              className="text-[11px] text-[#274296] font-semibold hover:underline">Edit</button>
          </div>
          {editing === `g-${m.id}` && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <input type="time" value={kickoff} onChange={(e) => setKickoff(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm" />
              <select value={pitch} onChange={(e) => setPitch(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                {pitches.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => save(m.id, false)} disabled={busy}
                className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">Save</button>
              <button onClick={() => setEditing(null)} className="text-gray-400 text-xs">Cancel</button>
            </div>
          )}
        </div>
      ))}

      {view === "ko" && koMatchList.map((m) => (
        <div key={m.matchId} className="bg-white rounded-lg p-3 shadow-sm border">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{m.team1Name} vs {m.team2Name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500 uppercase font-medium">{m.competition} · {m.round}</span>
                {m.kickoff && <span className="text-[10px] text-gray-500">{m.kickoff}</span>}
                {m.pitch && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getPitchClass(pitchColors, m.pitch)}`}>{m.pitch}</span>}
              </div>
            </div>
            <button onClick={() => { setEditing(`k-${m.matchId}`); setKickoff(m.kickoff || ""); setPitch(m.pitch || ""); }}
              className="text-[11px] text-[#274296] font-semibold hover:underline">Edit</button>
          </div>
          {editing === `k-${m.matchId}` && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <input type="time" value={kickoff} onChange={(e) => setKickoff(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm" />
              <select value={pitch} onChange={(e) => setPitch(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                {pitches.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => save(m.matchId, true)} disabled={busy}
                className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">Save</button>
              <button onClick={() => setEditing(null)} className="text-gray-400 text-xs">Cancel</button>
            </div>
          )}
        </div>
      ))}
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
          {(m.submittedByName || m.confirmedByName) && (
            <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
              {m.submittedByName && <span>Submitted: <span className="font-medium text-gray-700">{m.submittedByName}</span></span>}
              {m.confirmedByName && <span>Confirmed: <span className="font-medium text-gray-700">{m.confirmedByName}</span></span>}
              {m.status === "pending" && !m.confirmedByName && <span className="text-amber-600 font-medium">Awaiting confirmation</span>}
            </div>
          )}

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

                      {(m.submittedByName || m.confirmedByName) && (
                        <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                          {m.submittedByName && <span>Submitted: <span className="font-medium text-gray-700">{m.submittedByName}</span></span>}
                          {m.confirmedByName && <span>Confirmed: <span className="font-medium text-gray-700">{m.confirmedByName}</span></span>}
                          {m.submittedByName && !m.confirmedByName && !m.winnerId && <span className="text-amber-600 font-medium">Awaiting confirmation</span>}
                        </div>
                      )}

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

function AdminExport() {
  const exports = [
    { type: "results", label: "Group Results", desc: "All group stage match results" },
    { type: "standings", label: "Standings", desc: "Current group standings table" },
    { type: "golden-boot", label: "Golden Boot", desc: "Top scorers list" },
  ];

  const printUrl = "/print";

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Export Data</h2>
      <a href={printUrl} target="_blank" rel="noopener noreferrer"
        className="block bg-white rounded-lg p-4 shadow-sm border hover:bg-gray-50 transition-colors">
        <p className="font-semibold text-sm">Print Schedule</p>
        <p className="text-xs text-gray-500 mt-0.5">Full day schedule — print or pin up</p>
        <p className="text-xs text-[#274296] font-semibold mt-1">Open Print View</p>
      </a>

      {exports.map((e) => (
        <a key={e.type} href={`/api/export?type=${e.type}`} download
          className="block bg-white rounded-lg p-4 shadow-sm border hover:bg-gray-50 transition-colors">
          <p className="font-semibold text-sm">{e.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{e.desc}</p>
          <p className="text-xs text-[#274296] font-semibold mt-1">Download CSV</p>
        </a>
      ))}
    </div>
  );
}
