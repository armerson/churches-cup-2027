import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { teams, groupMatches } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { hashPin } from "@/lib/hash";

export async function GET() {
  const all = await getDb().select().from(teams).orderBy(teams.groupLetter, teams.name);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const { action, teamId, name, groupLetter, pin } = await req.json();

  if (action === "rename") {
    await getDb().update(teams).set({ name }).where(eq(teams.id, teamId));
    return NextResponse.json({ success: true });
  }

  if (action === "move") {
    await getDb().update(teams).set({ groupLetter }).where(eq(teams.id, teamId));
    await getDb().update(groupMatches).set({ groupLetter }).where(eq(groupMatches.team1Id, teamId));
    await getDb().update(groupMatches).set({ groupLetter }).where(eq(groupMatches.team2Id, teamId));
    return NextResponse.json({ success: true });
  }

  if (action === "resetPin") {
    const newPin = pin || "0000";
    await getDb().update(teams).set({ pin: await hashPin(newPin) }).where(eq(teams.id, teamId));
    return NextResponse.json({ success: true, pin: newPin });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
