"use client";

import { useState } from "react";
import { LoginScreen } from "@/components/login-screen";
import { TeamDashboard } from "@/components/team-dashboard";
import { AdminDashboard } from "@/components/admin-dashboard";
import { PlayerView } from "@/components/player-view";

export type Session = {
  role: "team" | "admin" | "player";
  teamId?: number;
  teamName?: string;
  group?: string;
  pin?: string;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  if (session.role === "admin") {
    return <AdminDashboard onLogout={() => setSession(null)} />;
  }

  if (session.role === "player") {
    return <PlayerView onBack={() => setSession(null)} />;
  }

  return <TeamDashboard session={session} onLogout={() => setSession(null)} />;
}
