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
  const { matchId, score1, score2, penScore1, penScore2, winnerId, scorersList, scorerTeamId } = body;

  const [match] = await getDb()
    .select()
    .from(koMatches)
    .where(eq(koMatches.matchId, matchId));

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.winnerId) return NextResponse.json({ error: "Result already submitted" }, { status: 400 });

  const [updated] = await getDb()
    .update(koMatches)
    .set({
      score1,
      score2,
      penScore1: score1 === score2 ? penScore1 : null,
      penScore2: score1 === score2 ? penScore2 : null,
      winnerId,
      updatedAt: new Date(),
    })
    .where(eq(koMatches.matchId, matchId))
    .returning();

  if (scorersList?.length && scorerTeamId) {
    for (const name of scorersList) {
      await getDb().insert(scorers).values({
        koMatchId: match.id,
        teamId: scorerTeamId,
        playerName: name,
      });
    }
  }

  return NextResponse.json({ success: true, match: updated });
}
