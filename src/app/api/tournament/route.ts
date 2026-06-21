import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { tournament, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  let [config] = await getDb().select().from(tournament);
  if (!config) {
    [config] = await getDb().insert(tournament).values({}).returning();
  }

  const allTeams = await getDb().select().from(teams).orderBy(teams.groupLetter, teams.name);
  const groups: Record<string, string[]> = {};
  for (const t of allTeams) {
    if (!groups[t.groupLetter]) groups[t.groupLetter] = [];
    groups[t.groupLetter].push(t.name);
  }

  return NextResponse.json({
    ...config,
    pitches: config.pitches as string[],
    pitchColors: config.pitchColors as Record<string, string>,
    koCompetitions: config.koCompetitions as any[],
    groups,
    totalTeams: allTeams.length,
    totalGroups: Object.keys(groups).length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "update") {
    const { name, year, teamsPerGroup, gameDurationMins, maxSquadSize, pitches, pitchColors, groupStageGapMins, groupStageStartTime, koCompetitions } = body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (year !== undefined) updates.year = year;
    if (teamsPerGroup !== undefined) updates.teamsPerGroup = teamsPerGroup;
    if (gameDurationMins !== undefined) updates.gameDurationMins = gameDurationMins;
    if (maxSquadSize !== undefined) updates.maxSquadSize = maxSquadSize;
    if (pitches !== undefined) updates.pitches = pitches;
    if (pitchColors !== undefined) updates.pitchColors = pitchColors;
    if (groupStageGapMins !== undefined) updates.groupStageGapMins = groupStageGapMins;
    if (groupStageStartTime !== undefined) updates.groupStageStartTime = groupStageStartTime;
    if (koCompetitions !== undefined) updates.koCompetitions = koCompetitions;

    let [config] = await getDb().select().from(tournament);
    if (!config) {
      [config] = await getDb().insert(tournament).values(updates).returning();
    } else {
      [config] = await getDb().update(tournament).set(updates).where(eq(tournament.id, config.id)).returning();
    }
    return NextResponse.json({ success: true, config });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
