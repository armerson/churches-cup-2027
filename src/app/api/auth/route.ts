import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { teams, tournament } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { verifyPin } from "@/lib/hash";

export async function POST(req: NextRequest) {
  const { team, pin, admin } = await req.json();

  if (admin) {
    const [config] = await getDb().select().from(tournament);
    const adminPin = config?.adminPin || "1234";
    if (await verifyPin(pin, adminPin)) {
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
    .where(eq(teams.name, team));

  if (!found) {
    return NextResponse.json({ error: "Invalid team or PIN" }, { status: 401 });
  }

  if (!(await verifyPin(pin, found.pin))) {
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
