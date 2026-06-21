import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { groupMatches, scorers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { action, matchId, score1, score2, status } = await req.json();

  if (action === "update") {
    const [updated] = await getDb()
      .update(groupMatches)
      .set({
        score1,
        score2,
        status: status || "confirmed",
        updatedAt: new Date(),
      })
      .where(eq(groupMatches.id, matchId))
      .returning();
    return NextResponse.json({ success: true, match: updated });
  }

  if (action === "reset") {
    await getDb().delete(scorers).where(eq(scorers.groupMatchId, matchId));
    const [updated] = await getDb()
      .update(groupMatches)
      .set({
        score1: null,
        score2: null,
        status: "upcoming",
        submittedBy: null,
        confirmedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(groupMatches.id, matchId))
      .returning();
    return NextResponse.json({ success: true, match: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
