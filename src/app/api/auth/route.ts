import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { teams } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

export async function POST(req: NextRequest) {
  const { team, pin, admin } = await req.json();

  if (admin) {
    if (pin === ADMIN_PIN) {
      return NextResponse.json({ success: true, role: "admin" });
    }
    return NextResponse.json({ error: "Invalid admin PIN" }, { status: 401 });
  }

  if (!team || !pin) {
    return NextResponse.json({ error: "Team and PIN required" }, { status: 400 });
  }

  const [found] = await getDb()
    .select()
    .from(teams)
    .where(and(eq(teams.name, team), eq(teams.pin, pin)));

  if (!found) {
    return NextResponse.json({ error: "Invalid team or PIN" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    role: "team",
    teamId: found.id,
    teamName: found.name,
    group: found.groupLetter,
  });
}
