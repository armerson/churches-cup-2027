"use client";

import { useState } from "react";
import type { Session } from "@/app/page";

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

const ALL_TEAMS = Object.values(GROUPS).flat().sort();

export function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [team, setTeam] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTeamLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !pin) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team, pin }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onLogin({
          role: "team",
          teamId: data.teamId,
          teamName: data.teamName,
          group: data.group,
          pin,
        });
      }
    } catch {
      setError("Network error — please try again.");
    }
    setLoading(false);
  }

  async function handleAdminLogin() {
    const adminPin = prompt("Enter organiser PIN:");
    if (!adminPin) return;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin: true, pin: adminPin }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        onLogin({ role: "admin", pin: adminPin });
      }
    } catch {
      alert("Network error");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-6 bg-gradient-to-b from-[#274296] to-[#1a2d6b]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Churches Cup</h1>
          <p className="text-blue-200 text-lg">2027</p>
        </div>

        <form onSubmit={handleTeamLogin} className="bg-white rounded-xl p-6 shadow-lg space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Your Team</label>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select your team --</option>
              {ALL_TEAMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Team PIN</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4-digit PIN"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !team || pin.length < 4}
            className="w-full bg-[#274296] text-white font-semibold py-3 rounded-lg hover:bg-[#1d3278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-4 space-y-3">
          <button
            onClick={() => onLogin({ role: "player" })}
            className="w-full bg-white/10 text-white font-semibold py-3 rounded-lg hover:bg-white/20 transition-colors backdrop-blur"
          >
            👁 Player View
          </button>
          <button
            onClick={handleAdminLogin}
            className="w-full text-blue-200 text-sm hover:text-white transition-colors py-2"
          >
            Organiser Login
          </button>
        </div>
      </div>
    </div>
  );
}
