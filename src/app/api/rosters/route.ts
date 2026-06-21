import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { rosters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
  const rows = await getDb().select().from(rosters).where(eq(rosters.teamId, Number(teamId))).orderBy(rosters.shirtNumber, rosters.playerName);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { action, teamId, playerName, shirtNumber, id } = await req.json();

  if (action === "add") {
    if (!teamId || !playerName?.trim()) return NextResponse.json({ error: "Team and player name required" }, { status: 400 });
    try {
      const [row] = await getDb().insert(rosters).values({
        teamId,
        playerName: playerName.trim(),
        shirtNumber: shirtNumber || null,
      }).returning();
      return NextResponse.json(row);
    } catch (e: any) {
      if (e.message?.includes("unique")) return NextResponse.json({ error: "Player already in roster" }, { status: 400 });
      throw e;
    }
  }

  if (action === "remove") {
    await getDb().delete(rosters).where(eq(rosters.id, id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
