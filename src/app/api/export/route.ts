import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { teams, groupMatches, koMatches, scorers } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  if (type === "results") {
    const matches = await getDb().execute(sql`
      SELECT gm.id, t1.name as team1, t2.name as team2, gm.group_letter as "group",
        gm.kickoff, gm.pitch, gm.score1, gm.score2, gm.status
      FROM group_matches gm
      JOIN teams t1 ON gm.team1_id = t1.id
      JOIN teams t2 ON gm.team2_id = t2.id
      ORDER BY gm.group_letter, gm.kickoff
    `);
    const rows = matches.rows as any[];
    const csv = ["Group,Team 1,Team 2,Score 1,Score 2,Kickoff,Pitch,Status"];
    for (const r of rows) {
      csv.push(`${r.group},${r.team1},${r.team2},${r.score1 ?? ""},${r.score2 ?? ""},${r.kickoff || ""},${r.pitch || ""},${r.status}`);
    }
    return new NextResponse(csv.join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=results.csv" },
    });
  }

  if (type === "standings") {
    const allTeams = await getDb().select().from(teams).orderBy(teams.groupLetter, teams.name);
    const confirmed = await getDb().execute(sql`
      SELECT t1.name as team1, t2.name as team2, gm.score1, gm.score2, gm.group_letter as "group"
      FROM group_matches gm
      JOIN teams t1 ON gm.team1_id = t1.id
      JOIN teams t2 ON gm.team2_id = t2.id
      WHERE gm.status = 'confirmed'
    `);
    const stats: Record<string, { group: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }> = {};
    for (const t of allTeams) {
      stats[t.name] = { group: t.groupLetter, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    }
    for (const m of confirmed.rows as any[]) {
      const s1 = stats[m.team1]; const s2 = stats[m.team2];
      if (!s1 || !s2) continue;
      s1.p++; s2.p++;
      s1.gf += m.score1; s1.ga += m.score2;
      s2.gf += m.score2; s2.ga += m.score1;
      if (m.score1 > m.score2) { s1.w++; s1.pts += 3; s2.l++; }
      else if (m.score1 < m.score2) { s2.w++; s2.pts += 3; s1.l++; }
      else { s1.d++; s2.d++; s1.pts++; s2.pts++; }
    }
    const csv = ["Group,Team,P,W,D,L,GF,GA,GD,Pts"];
    for (const [name, s] of Object.entries(stats)) {
      csv.push(`${s.group},${name},${s.p},${s.w},${s.d},${s.l},${s.gf},${s.ga},${s.gf - s.ga},${s.pts}`);
    }
    return new NextResponse(csv.join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=standings.csv" },
    });
  }

  if (type === "golden-boot") {
    const data = await getDb().execute(sql`
      SELECT s.player_name, t.name as team_name, COUNT(*) as goals
      FROM scorers s JOIN teams t ON s.team_id = t.id
      GROUP BY s.player_name, t.name
      ORDER BY goals DESC, s.player_name
    `);
    const csv = ["Player,Team,Goals"];
    for (const r of data.rows as any[]) {
      csv.push(`${r.player_name},${r.team_name},${r.goals}`);
    }
    return new NextResponse(csv.join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=golden-boot.csv" },
    });
  }

  return NextResponse.json({ error: "Unknown export type. Use ?type=results|standings|golden-boot" }, { status: 400 });
}
