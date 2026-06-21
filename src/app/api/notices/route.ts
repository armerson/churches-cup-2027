import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { notices } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const rows = await getDb().select().from(notices).orderBy(desc(notices.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { action, message, id } = await req.json();

  if (action === "create") {
    if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });
    const [row] = await getDb().insert(notices).values({ message: message.trim() }).returning();
    return NextResponse.json(row);
  }

  if (action === "delete") {
    await getDb().delete(notices).where(eq(notices.id, id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
