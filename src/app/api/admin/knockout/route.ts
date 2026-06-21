import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { koMatches, teams, groupMatches } from "@/lib/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { action } = await req.json();

  if (action === "seed") {
    const confirmed = await getDb().select().from(groupMatches).where(eq(groupMatches.status, "confirmed"));
    const allTeams = await getDb().select().from(teams);
    const teamMap = Object.fromEntries(allTeams.map((t) => [t.id, t]));

    const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];
    type Standing = { id: number; name: string; pts: number; gd: number; gf: number };
    const results: Record<string, Record<number, Standing>> = {};

    for (const g of GROUPS) {
      results[g] = {};
      for (const t of allTeams.filter((t) => t.groupLetter === g)) {
        results[g][t.id] = { id: t.id, name: t.name, pts: 0, gd: 0, gf: 0 };
      }
    }

    for (const m of confirmed) {
      const g = m.groupLetter;
      if (!results[g]?.[m.team1Id] || !results[g]?.[m.team2Id]) continue;
      const s1 = results[g][m.team1Id];
      const s2 = results[g][m.team2Id];
      s1.gf += m.score1!; s1.gd += m.score1! - m.score2!;
      s2.gf += m.score2!; s2.gd += m.score2! - m.score1!;
      if (m.score1! > m.score2!) { s1.pts += 3; }
      else if (m.score1! < m.score2!) { s2.pts += 3; }
      else { s1.pts++; s2.pts++; }
    }

    const sorted: Record<string, Standing[]> = {};
    for (const g of GROUPS) {
      sorted[g] = Object.values(results[g]).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    }

    // Championship: 1st vs 2nd cross-group
    // A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2, E1 vs F2, F1 vs E2, G1 vs H2, H1 vs G2
    const champR16 = [
      [sorted.A[0], sorted.B[1]], [sorted.B[0], sorted.A[1]],
      [sorted.C[0], sorted.D[1]], [sorted.D[0], sorted.C[1]],
      [sorted.E[0], sorted.F[1]], [sorted.F[0], sorted.E[1]],
      [sorted.G[0], sorted.H[1]], [sorted.H[0], sorted.G[1]],
    ];
    for (let i = 0; i < 8; i++) {
      await getDb().update(koMatches).set({
        team1Id: champR16[i][0]?.id ?? null,
        team2Id: champR16[i][1]?.id ?? null,
        updatedAt: new Date(),
      }).where(eq(koMatches.matchId, `c-r16-${i + 1}`));
    }

    // Shield: 3rd place teams (8 teams → R1 of 8)
    const shieldTeams = GROUPS.map((g) => sorted[g][2]).filter(Boolean);
    const shieldR1 = [
      [shieldTeams[0], shieldTeams[1]], [shieldTeams[2], shieldTeams[3]],
      [shieldTeams[4], shieldTeams[5]], [shieldTeams[6], shieldTeams[7]],
      [shieldTeams[1], shieldTeams[0]], [shieldTeams[3], shieldTeams[2]],
      [shieldTeams[5], shieldTeams[4]], [shieldTeams[7], shieldTeams[6]],
    ];
    // Actually shield has 8 R1 matches — let's pair them properly
    // A3 vs H3, B3 vs G3, C3 vs F3, D3 vs E3, and reverses
    const shieldPairs = [
      [shieldTeams[0], shieldTeams[7]], [shieldTeams[1], shieldTeams[6]],
      [shieldTeams[2], shieldTeams[5]], [shieldTeams[3], shieldTeams[4]],
      [shieldTeams[7], shieldTeams[0]], [shieldTeams[6], shieldTeams[1]],
      [shieldTeams[5], shieldTeams[2]], [shieldTeams[4], shieldTeams[3]],
    ];
    for (let i = 0; i < 8; i++) {
      await getDb().update(koMatches).set({
        team1Id: shieldPairs[i]?.[0]?.id ?? null,
        team2Id: shieldPairs[i]?.[1]?.id ?? null,
        updatedAt: new Date(),
      }).where(eq(koMatches.matchId, `s-r1-${i + 1}`));
    }

    // Plate: 4th place teams (8 teams → R1 of 4, then SF)
    const plateTeams = GROUPS.map((g) => sorted[g][3]).filter(Boolean);
    const platePairs = [
      [plateTeams[0], plateTeams[7]], [plateTeams[1], plateTeams[6]],
      [plateTeams[2], plateTeams[5]], [plateTeams[3], plateTeams[4]],
    ];
    for (let i = 0; i < 4; i++) {
      await getDb().update(koMatches).set({
        team1Id: platePairs[i]?.[0]?.id ?? null,
        team2Id: platePairs[i]?.[1]?.id ?? null,
        updatedAt: new Date(),
      }).where(eq(koMatches.matchId, `p-r1-${i + 1}`));
    }

    return NextResponse.json({ success: true, message: "Bracket seeded from standings" });
  }

  if (action === "advance") {
    const { matchId, winnerId } = await req.json();
    const [match] = await getDb().select().from(koMatches).where(eq(koMatches.matchId, matchId));
    if (!match || !match.winnerId) return NextResponse.json({ error: "Match not complete" }, { status: 400 });

    // Determine next match based on matchId pattern
    const nextMap: Record<string, { target: string; slot: 1 | 2 }> = {
      "c-r16-1": { target: "c-qf-1", slot: 1 }, "c-r16-2": { target: "c-qf-1", slot: 2 },
      "c-r16-3": { target: "c-qf-2", slot: 1 }, "c-r16-4": { target: "c-qf-2", slot: 2 },
      "c-r16-5": { target: "c-qf-3", slot: 1 }, "c-r16-6": { target: "c-qf-3", slot: 2 },
      "c-r16-7": { target: "c-qf-4", slot: 1 }, "c-r16-8": { target: "c-qf-4", slot: 2 },
      "c-qf-1": { target: "c-sf-1", slot: 1 }, "c-qf-2": { target: "c-sf-1", slot: 2 },
      "c-qf-3": { target: "c-sf-2", slot: 1 }, "c-qf-4": { target: "c-sf-2", slot: 2 },
      "c-sf-1": { target: "c-final", slot: 1 }, "c-sf-2": { target: "c-final", slot: 2 },
      "s-r1-1": { target: "s-qf-1", slot: 1 }, "s-r1-2": { target: "s-qf-1", slot: 2 },
      "s-r1-3": { target: "s-qf-2", slot: 1 }, "s-r1-4": { target: "s-qf-2", slot: 2 },
      "s-r1-5": { target: "s-qf-3", slot: 1 }, "s-r1-6": { target: "s-qf-3", slot: 2 },
      "s-r1-7": { target: "s-qf-4", slot: 1 }, "s-r1-8": { target: "s-qf-4", slot: 2 },
      "s-qf-1": { target: "s-sf-1", slot: 1 }, "s-qf-2": { target: "s-sf-1", slot: 2 },
      "s-qf-3": { target: "s-sf-2", slot: 1 }, "s-qf-4": { target: "s-sf-2", slot: 2 },
      "s-sf-1": { target: "s-final", slot: 1 }, "s-sf-2": { target: "s-final", slot: 2 },
      "p-r1-1": { target: "p-sf-1", slot: 1 }, "p-r1-2": { target: "p-sf-1", slot: 2 },
      "p-r1-3": { target: "p-sf-2", slot: 1 }, "p-r1-4": { target: "p-sf-2", slot: 2 },
      "p-sf-1": { target: "p-final", slot: 1 }, "p-sf-2": { target: "p-final", slot: 2 },
    };

    const next = nextMap[matchId];
    if (!next) return NextResponse.json({ success: true, message: "Final — no advancement needed" });

    const updateField = next.slot === 1 ? { team1Id: match.winnerId } : { team2Id: match.winnerId };
    await getDb().update(koMatches).set({ ...updateField, updatedAt: new Date() }).where(eq(koMatches.matchId, next.target));

    return NextResponse.json({ success: true, advanced: next.target });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
