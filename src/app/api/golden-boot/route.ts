import { NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { scorers, teams, groupMatches } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  const rows = await getDb()
    .select({
      playerName: scorers.playerName,
      teamName: teams.name,
      goals: sql<number>`count(*)`.as("goals"),
    })
    .from(scorers)
    .leftJoin(teams, eq(scorers.teamId, teams.id))
    .groupBy(scorers.playerName, teams.name)
    .orderBy(desc(sql`count(*)`))
    .limit(50);

  return NextResponse.json(rows);
}
