import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { groupMatches, koMatches } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { action, matchId, kickoff, pitch, isKo } = await req.json();

  if (action === "update") {
    const updates: any = { updatedAt: new Date() };
    if (kickoff !== undefined) updates.kickoff = kickoff;
    if (pitch !== undefined) updates.pitch = pitch;

    if (isKo) {
      await getDb().update(koMatches).set(updates).where(eq(koMatches.matchId, matchId));
    } else {
      await getDb().update(groupMatches).set(updates).where(eq(groupMatches.id, matchId));
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
