"use client";

import { useState } from "react";

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"scores" | "knockout" | "notices">("scores");

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-[#274296] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Churches Cup 2027</h1>
            <p className="text-blue-200 text-xs">Organiser Dashboard</p>
          </div>
          <button onClick={onLogout} className="text-blue-200 text-xs hover:text-white">
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-white border-b overflow-x-auto">
        <div className="flex gap-1 px-2 py-2">
          {(["scores", "knockout", "notices"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap uppercase tracking-wide transition-colors ${
                tab === t ? "bg-[#274296] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-4">
        {tab === "scores" && <AdminScores />}
        {tab === "knockout" && <AdminKnockout />}
        {tab === "notices" && <AdminNotices />}
      </main>
    </div>
  );
}

function AdminScores() {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">All Scores</h2>
      <p className="text-gray-500 text-sm">Admin score management — edit, delete, and override results. Coming soon.</p>
    </div>
  );
}

function AdminKnockout() {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Knockout Management</h2>
      <p className="text-gray-500 text-sm">Seed bracket, enter results, manage competitions. Coming soon.</p>
    </div>
  );
}

function AdminNotices() {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Notice Board</h2>
      <p className="text-gray-500 text-sm">Post announcements visible to all users. Coming soon.</p>
    </div>
  );
}
