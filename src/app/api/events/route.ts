import { db as getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const gm = await getDb().execute(
    sql`SELECT md5(string_agg(status || coalesce(score1::text,'') || coalesce(score2::text,''), ',' ORDER BY id)) as h FROM group_matches`
  );
  const ko = await getDb().execute(
    sql`SELECT md5(string_agg(status || coalesce(score1::text,'') || coalesce(score2::text,'') || coalesce(winner_id::text,''), ',' ORDER BY id)) as h FROM ko_matches`
  );
  return Response.json({ hash: `${(gm.rows[0] as any)?.h}-${(ko.rows[0] as any)?.h}` });
}
