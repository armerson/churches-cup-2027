"use client";

import { useState, useEffect } from "react";

export default function PrintSchedule() {
  const [config, setConfig] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [koMatches, setKoMatches] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/tournament").then((r) => r.json()),
      fetch("/api/scores").then((r) => r.json()),
      fetch("/api/knockout").then((r) => r.json()),
    ]).then(([t, s, k]) => {
      setConfig(t);
      setMatches(s);
      setKoMatches(k);
    });
  }, []);

  if (!config) return <p className="p-8 text-gray-500">Loading...</p>;

  const groups = [...new Set(matches.map((m: any) => m.group))].sort();
  const timeSlots = [...new Set(matches.map((m: any) => m.kickoff).filter(Boolean))].sort();
  const koComps = config.koCompetitions || [];
  const roundLabels: Record<string, string> = { r16: "R16", r1: "R1", qf: "QF", sf: "SF", final: "Final", "3rd": "3rd" };

  return (
    <div className="p-6 max-w-[1100px] mx-auto print:p-2 print:max-w-none">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">{config.name} {config.year}</h1>
          <p className="text-sm text-gray-500">Full Schedule</p>
        </div>
        <button onClick={() => window.print()} className="no-print bg-[#274296] text-white text-sm font-semibold px-4 py-2 rounded-lg">
          Print
        </button>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Group Stage</h2>
      <table className="w-full text-xs border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1 text-left">Time</th>
            {(config.pitches as string[]).map((p: string) => (
              <th key={p} className="border px-2 py-1 text-center capitalize">{p} Pitch</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time) => {
            const slotMatches = matches.filter((m: any) => m.kickoff === time);
            return (
              <tr key={time}>
                <td className="border px-2 py-1 font-semibold whitespace-nowrap">{time}</td>
                {(config.pitches as string[]).map((pitch: string) => {
                  const m = slotMatches.find((m: any) => m.pitch === pitch);
                  return (
                    <td key={pitch} className="border px-2 py-1 text-center">
                      {m ? (
                        <span>
                          <span className="font-medium">{m.team1}</span>
                          <span className="text-gray-400"> v </span>
                          <span className="font-medium">{m.team2}</span>
                          <span className="text-gray-400 text-[10px] ml-1">({m.group})</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {koComps.map((comp: any) => {
        const compMatches = koMatches.filter((m: any) => m.competition === comp.key);
        if (compMatches.length === 0) return null;
        const rounds = [...new Set(compMatches.map((m: any) => m.round))] as string[];
        return (
          <div key={comp.key} className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">{comp.label}</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Round</th>
                  <th className="border px-2 py-1 text-left">Match</th>
                  <th className="border px-2 py-1 text-center">Time</th>
                  <th className="border px-2 py-1 text-center">Pitch</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) =>
                  compMatches.filter((m: any) => m.round === round).map((m: any) => (
                    <tr key={m.matchId}>
                      <td className="border px-2 py-1 font-semibold">{roundLabels[round] || round}</td>
                      <td className="border px-2 py-1">
                        <span className="font-medium">{m.team1Name}</span>
                        <span className="text-gray-400"> v </span>
                        <span className="font-medium">{m.team2Name}</span>
                      </td>
                      <td className="border px-2 py-1 text-center">{m.kickoff || "TBC"}</td>
                      <td className="border px-2 py-1 text-center capitalize">{m.pitch || "TBC"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="mt-4 text-[10px] text-gray-400 text-center">
        {config.name} {config.year} · {config.gameDurationMins} min games · {config.groupStageGapMins} min intervals
      </div>
    </div>
  );
}
