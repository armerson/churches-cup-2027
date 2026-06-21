"use client";

import { useState, useEffect } from "react";
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

const SESSION_KEY = "cc-session";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) setSession(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session, loaded]);

  if (!loaded) return null;

  const logout = () => setSession(null);

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  if (session.role === "admin") {
    return <AdminDashboard onLogout={logout} />;
  }

  if (session.role === "player") {
    return <PlayerView onBack={logout} />;
  }

  return <TeamDashboard session={session} onLogout={logout} />;
}
