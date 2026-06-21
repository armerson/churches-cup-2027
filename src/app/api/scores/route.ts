import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { groupMatches, scorers, teams } from "@/lib/schema";
import { eq, and, or, sql } from "drizzle-orm";

export async function GET() {
  const matches = await getDb()
    .select({
      id: groupMatches.id,
      team1: teams.name,
      team1Id: groupMatches.team1Id,
      team2Id: groupMatches.team2Id,
      group: groupMatches.groupLetter,
      kickoff: groupMatches.kickoff,
      pitch: groupMatches.pitch,
      score1: groupMatches.score1,
      score2: groupMatches.score2,
      status: groupMatches.status,
      submittedBy: groupMatches.submittedBy,
    })
    .from(groupMatches)
    .leftJoin(teams, eq(teams.id, groupMatches.team1Id))
    .orderBy(groupMatches.kickoff, groupMatches.id);

  // Get team2 names separately to avoid alias issues
  const withNames = await Promise.all(
    matches.map(async (m) => {
      const [t2] = await getDb().select({ name: teams.name }).from(teams).where(eq(teams.id, m.team2Id));
      return { ...m, team2: t2?.name ?? "TBD" };
    })
  );

  return NextResponse.json(withNames);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "submit") {
    const { matchId, score1, score2, submittedById, myScorers } = body;

    const [match] = await getDb()
      .select()
      .from(groupMatches)
      .where(eq(groupMatches.id, matchId));

    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "upcoming") return NextResponse.json({ error: "Score already submitted" }, { status: 400 });
    if (match.team1Id !== submittedById && match.team2Id !== submittedById) {
      return NextResponse.json({ error: "Not authorised for this match" }, { status: 403 });
    }

    const isTeam1 = match.team1Id === submittedById;
    const myGoals = isTeam1 ? score1 : score2;

    if (myGoals > 0 && (!myScorers || myScorers.length !== myGoals)) {
      return NextResponse.json({ error: `Enter all ${myGoals} scorer(s) for your team` }, { status: 400 });
    }

    const [updated] = await getDb()
      .update(groupMatches)
      .set({
        score1,
        score2,
        status: "pending",
        submittedBy: submittedById,
        updatedAt: new Date(),
      })
      .where(eq(groupMatches.id, matchId))
      .returning();

    if (myScorers?.length) {
      for (const name of myScorers) {
        await getDb().insert(scorers).values({ groupMatchId: matchId, teamId: submittedById, playerName: name });
      }
    }

    return NextResponse.json({ success: true, match: updated });
  }

  if (action === "confirm") {
    const { matchId, confirmedById, myScorers } = body;

    const [match] = await getDb()
      .select()
      .from(groupMatches)
      .where(eq(groupMatches.id, matchId));

    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "pending") return NextResponse.json({ error: "Not pending confirmation" }, { status: 400 });
    if (match.submittedBy === confirmedById) return NextResponse.json({ error: "Cannot confirm own submission" }, { status: 403 });

    const isTeam1 = match.team1Id === confirmedById;
    const myGoals = isTeam1 ? match.score1! : match.score2!;

    if (myGoals > 0 && (!myScorers || myScorers.length !== myGoals)) {
      return NextResponse.json({ error: `Enter all ${myGoals} scorer(s) for your team` }, { status: 400 });
    }

    const [updated] = await getDb()
      .update(groupMatches)
      .set({
        status: "confirmed",
        confirmedBy: confirmedById,
        updatedAt: new Date(),
      })
      .where(eq(groupMatches.id, matchId))
      .returning();

    if (myScorers?.length) {
      for (const name of myScorers) {
        await getDb().insert(scorers).values({
          groupMatchId: matchId,
          teamId: confirmedById,
          playerName: name,
        });
      }
    }

    return NextResponse.json({ success: true, match: updated });
  }

  if (action === "dispute") {
    const { matchId } = body;
    const [updated] = await getDb()
      .update(groupMatches)
      .set({ status: "disputed", updatedAt: new Date() })
      .where(eq(groupMatches.id, matchId))
      .returning();

    return NextResponse.json({ success: true, match: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
