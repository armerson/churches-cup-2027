import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { koMatches, scorers, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const matches = await getDb()
    .select()
    .from(koMatches)
    .orderBy(koMatches.kickoff, koMatches.id);

  const withNames = await Promise.all(
    matches.map(async (m) => {
      const [t1] = m.team1Id ? await getDb().select({ name: teams.name }).from(teams).where(eq(teams.id, m.team1Id)) : [null];
      const [t2] = m.team2Id ? await getDb().select({ name: teams.name }).from(teams).where(eq(teams.id, m.team2Id)) : [null];
      const [w] = m.winnerId ? await getDb().select({ name: teams.name }).from(teams).where(eq(teams.id, m.winnerId)) : [null];
      return {
        ...m,
        team1Name: t1?.name ?? "TBD",
        team2Name: t2?.name ?? "TBD",
        winnerName: w?.name ?? null,
      };
    })
  );

  return NextResponse.json(withNames);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "submit") {
    const { matchId, score1, score2, penScore1, penScore2, winnerId, submittedById, myScorers, oppScorers } = body;

    const [match] = await getDb().select().from(koMatches).where(eq(koMatches.matchId, matchId));
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "upcoming") return NextResponse.json({ error: "Result already submitted" }, { status: 400 });
    if (match.team1Id !== submittedById && match.team2Id !== submittedById) {
      return NextResponse.json({ error: "Not authorised for this match" }, { status: 403 });
    }

    const isTeam1 = match.team1Id === submittedById;
    const myGoals = isTeam1 ? score1 : score2;
    const oppGoals = isTeam1 ? score2 : score1;
    const oppTeamId = isTeam1 ? match.team2Id! : match.team1Id!;

    if (myGoals > 0 && (!myScorers || myScorers.length !== myGoals)) {
      return NextResponse.json({ error: `Enter all ${myGoals} scorer(s) for your team` }, { status: 400 });
    }
    if (oppGoals > 0 && (!oppScorers || oppScorers.length !== oppGoals)) {
      return NextResponse.json({ error: `Enter all ${oppGoals} scorer(s) for opponent` }, { status: 400 });
    }

    if (score1 === score2 && !winnerId) {
      return NextResponse.json({ error: "Draw — select penalty winner" }, { status: 400 });
    }

    const [updated] = await getDb()
      .update(koMatches)
      .set({
        score1,
        score2,
        penScore1: score1 === score2 ? penScore1 : null,
        penScore2: score1 === score2 ? penScore2 : null,
        winnerId: score1 === score2 ? winnerId : (score1 > score2 ? match.team1Id : match.team2Id),
        status: "pending",
        submittedBy: submittedById,
        updatedAt: new Date(),
      })
      .where(eq(koMatches.matchId, matchId))
      .returning();

    if (myScorers?.length) {
      for (const name of myScorers) {
        await getDb().insert(scorers).values({ koMatchId: match.id, teamId: submittedById, playerName: name });
      }
    }
    if (oppScorers?.length) {
      for (const name of oppScorers) {
        await getDb().insert(scorers).values({ koMatchId: match.id, teamId: oppTeamId, playerName: name });
      }
    }

    return NextResponse.json({ success: true, match: updated });
  }

  if (action === "confirm") {
    const { matchId, confirmedById } = body;

    const [match] = await getDb().select().from(koMatches).where(eq(koMatches.matchId, matchId));
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "pending") return NextResponse.json({ error: "Not pending confirmation" }, { status: 400 });
    if (match.submittedBy === confirmedById) return NextResponse.json({ error: "Cannot confirm own submission" }, { status: 403 });

    const [updated] = await getDb()
      .update(koMatches)
      .set({ status: "confirmed", confirmedBy: confirmedById, updatedAt: new Date() })
      .where(eq(koMatches.matchId, matchId))
      .returning();

    // Auto-advance winner
    await advanceWinner(matchId, match.winnerId!);

    return NextResponse.json({ success: true, match: updated });
  }

  if (action === "dispute") {
    const { matchId } = body;
    const [updated] = await getDb()
      .update(koMatches)
      .set({ status: "disputed", updatedAt: new Date() })
      .where(eq(koMatches.matchId, matchId))
      .returning();
    return NextResponse.json({ success: true, match: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

const NEXT_MATCH: Record<string, { target: string; slot: 1 | 2 }> = {
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

async function advanceWinner(matchId: string, winnerId: number) {
  const next = NEXT_MATCH[matchId];
  if (!next) return;
  const updateField = next.slot === 1 ? { team1Id: winnerId } : { team2Id: winnerId };
  await getDb().update(koMatches).set({ ...updateField, updatedAt: new Date() }).where(eq(koMatches.matchId, next.target));
}
