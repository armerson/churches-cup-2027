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
      const [sub] = m.submittedBy ? await getDb().select({ name: teams.name }).from(teams).where(eq(teams.id, m.submittedBy)) : [null];
      const [con] = m.confirmedBy ? await getDb().select({ name: teams.name }).from(teams).where(eq(teams.id, m.confirmedBy)) : [null];
      return {
        ...m,
        team1Name: t1?.name ?? "TBD",
        team2Name: t2?.name ?? "TBD",
        winnerName: w?.name ?? null,
        submittedByName: sub?.name ?? null,
        confirmedByName: con?.name ?? null,
      };
    })
  );

  return NextResponse.json(withNames);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "submit") {
    const { matchId, score1, score2, penScore1, penScore2, winnerId, submittedById, myScorers } = body;

    const [match] = await getDb().select().from(koMatches).where(eq(koMatches.matchId, matchId));
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "upcoming") return NextResponse.json({ error: "Result already submitted" }, { status: 400 });
    if (match.team1Id !== submittedById && match.team2Id !== submittedById) {
      return NextResponse.json({ error: "Not authorised for this match" }, { status: 403 });
    }

    const isTeam1 = match.team1Id === submittedById;
    const myGoals = isTeam1 ? score1 : score2;

    if (myGoals > 0 && (!myScorers || myScorers.length !== myGoals)) {
      return NextResponse.json({ error: `Enter all ${myGoals} scorer(s) for your team` }, { status: 400 });
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

    return NextResponse.json({ success: true, match: updated });
  }

  if (action === "confirm") {
    const { matchId, confirmedById, myScorers } = body;

    const [match] = await getDb().select().from(koMatches).where(eq(koMatches.matchId, matchId));
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "pending") return NextResponse.json({ error: "Not pending confirmation" }, { status: 400 });
    if (match.submittedBy === confirmedById) return NextResponse.json({ error: "Cannot confirm own submission" }, { status: 403 });

    const isTeam1 = match.team1Id === confirmedById;
    const myGoals = isTeam1 ? match.score1! : match.score2!;

    if (myGoals > 0 && (!myScorers || myScorers.length !== myGoals)) {
      return NextResponse.json({ error: `Enter all ${myGoals} scorer(s) for your team` }, { status: 400 });
    }

    const [updated] = await getDb()
      .update(koMatches)
      .set({ status: "confirmed", confirmedBy: confirmedById, updatedAt: new Date() })
      .where(eq(koMatches.matchId, matchId))
      .returning();

    if (myScorers?.length) {
      for (const name of myScorers) {
        await getDb().insert(scorers).values({ koMatchId: match.id, teamId: confirmedById, playerName: name });
      }
    }

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

const ROUND_ORDER = ["r16", "r1", "qf", "sf", "final"];

async function advanceWinner(matchId: string, winnerId: number) {
  const allMatches = await getDb().select().from(koMatches);
  const current = allMatches.find((m) => m.matchId === matchId);
  if (!current) return;

  const compMatches = allMatches.filter((m) => m.competition === current.competition);
  const roundIdx = ROUND_ORDER.indexOf(current.round);
  if (roundIdx === -1) return;

  const nextRound = ROUND_ORDER.slice(roundIdx + 1).find((r) =>
    compMatches.some((m) => m.round === r)
  );
  if (!nextRound) return;

  const nextRoundMatches = compMatches
    .filter((m) => m.round === nextRound)
    .sort((a, b) => a.matchNum - b.matchNum);

  const targetIdx = Math.floor((current.matchNum - 1) / 2);
  const slot: 1 | 2 = current.matchNum % 2 === 1 ? 1 : 2;
  const target = nextRoundMatches[targetIdx];
  if (!target) return;

  const updateField = slot === 1 ? { team1Id: winnerId } : { team2Id: winnerId };
  await getDb().update(koMatches).set({ ...updateField, updatedAt: new Date() }).where(eq(koMatches.matchId, target.matchId));

  // Advance loser to 3rd place match if semi-final
  if (current.round === "sf") {
    const thirdPlace = compMatches.find((m) => m.round === "3rd");
    if (thirdPlace) {
      const match = allMatches.find((m) => m.matchId === matchId)!;
      const loserId = match.team1Id === winnerId ? match.team2Id : match.team1Id;
      if (loserId) {
        const loserSlot: 1 | 2 = current.matchNum === 1 ? 1 : 2;
        const loserField = loserSlot === 1 ? { team1Id: loserId } : { team2Id: loserId };
        await getDb().update(koMatches).set({ ...loserField, updatedAt: new Date() }).where(eq(koMatches.matchId, thirdPlace.matchId));
      }
    }
  }
}
