"use client";

import { useState, useEffect, useCallback } from "react";

export type TournamentConfig = {
  id: number;
  name: string;
  year: number;
  teamsPerGroup: number;
  gameDurationMins: number;
  maxSquadSize: number;
  pitches: string[];
  pitchColors: Record<string, string>;
  groupStageGapMins: number;
  groupStageStartTime: string;
  koCompetitions: { key: string; label: string; qualifyPositions: number[]; format: string }[];
  setupComplete: boolean;
  groups: Record<string, string[]>;
  totalTeams: number;
  totalGroups: number;
};

const DEFAULT_PITCH_COLORS: Record<string, string> = {
  orange: "bg-orange-500 text-white",
  blue: "bg-[#274296] text-white",
  yellow: "bg-yellow-400 text-gray-900",
  red: "bg-red-600 text-white",
  green: "bg-green-600 text-white",
  purple: "bg-purple-600 text-white",
  pink: "bg-pink-500 text-white",
  white: "bg-white text-gray-900 border border-gray-300",
};

export function getPitchClass(pitchColors: Record<string, string>, pitch: string): string {
  return pitchColors[pitch] || DEFAULT_PITCH_COLORS[pitch] || "bg-gray-200 text-gray-800";
}

let cachedConfig: TournamentConfig | null = null;

export function useTournament() {
  const [config, setConfig] = useState<TournamentConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/tournament");
    if (res.ok) {
      const data = await res.json();
      cachedConfig = data;
      setConfig(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, refetch: fetchConfig };
}
