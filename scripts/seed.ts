import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/schema";

const sql = neon(process.env.POSTGRES_URL!);
const db = drizzle(sql, { schema });

const GROUPS: Record<string, string[]> = {
  A: ["Covenant", "Mourne", "Spain Madrid", "Waringstown Presbyterian Church"],
  B: ["Bethany FC", "Ballymagerney FPC", "YAKAAR ACADEMY", "Sloan Street Presbyterian"],
  C: ["Grace Community Church Richhill", "Portabello Baptist", "NTPC", "Portadown Elim"],
  D: ["Eagles", "Acpc fc", "Lurgan Elim", "Ulster wonders fc"],
  E: ["Craigavon PC", "Newmills", "Bleary FC", "Benburb Ballers"],
  F: ["Killicomaine Baptist church", "CGR FC", "CFPC Originals", "Gortmerron Goats"],
  G: ["Ancora Church Football", "Legacurry Presbyterian", "Emmanuel Baptist", "Downshire Church"],
  H: ["Derry/Edenderry", "The Blues", "Ardtrea Aardvarks", "Team Black"],
};

// Default PINs: 0001-0032
const DEFAULT_PINS = Array.from({ length: 32 }, (_, i) =>
  String(i + 1).padStart(4, "0")
);

// Group schedule: max-rest format (A+B at :00, C+D at :14, E+F at :28, G+H at :42)
const GROUP_SCHEDULE: Record<string, { time: string; pitch: string }> = {
  "Covenant||Mourne": { time: "10:00", pitch: "orange" },
  "Spain Madrid||Waringstown Presbyterian Church": { time: "10:00", pitch: "blue" },
  "Ballymagerney FPC||Bethany FC": { time: "10:00", pitch: "yellow" },
  "Sloan Street Presbyterian||YAKAAR ACADEMY": { time: "10:00", pitch: "red" },
  "Grace Community Church Richhill||Portabello Baptist": { time: "10:14", pitch: "orange" },
  "NTPC||Portadown Elim": { time: "10:14", pitch: "blue" },
  "Acpc fc||Eagles": { time: "10:14", pitch: "yellow" },
  "Lurgan Elim||Ulster wonders fc": { time: "10:14", pitch: "red" },
  "Craigavon PC||Newmills": { time: "10:28", pitch: "orange" },
  "Benburb Ballers||Bleary FC": { time: "10:28", pitch: "blue" },
  "CGR FC||Killicomaine Baptist church": { time: "10:28", pitch: "yellow" },
  "CFPC Originals||Gortmerron Goats": { time: "10:28", pitch: "red" },
  "Ancora Church Football||Legacurry Presbyterian": { time: "10:42", pitch: "orange" },
  "Downshire Church||Emmanuel Baptist": { time: "10:42", pitch: "blue" },
  "Derry/Edenderry||The Blues": { time: "10:42", pitch: "yellow" },
  "Ardtrea Aardvarks||Team Black": { time: "10:42", pitch: "red" },
  "Covenant||Spain Madrid": { time: "10:56", pitch: "orange" },
  "Mourne||Waringstown Presbyterian Church": { time: "10:56", pitch: "blue" },
  "Bethany FC||YAKAAR ACADEMY": { time: "10:56", pitch: "yellow" },
  "Ballymagerney FPC||Sloan Street Presbyterian": { time: "10:56", pitch: "red" },
  "Grace Community Church Richhill||NTPC": { time: "11:10", pitch: "orange" },
  "Portabello Baptist||Portadown Elim": { time: "11:10", pitch: "blue" },
  "Eagles||Lurgan Elim": { time: "11:10", pitch: "yellow" },
  "Acpc fc||Ulster wonders fc": { time: "11:10", pitch: "red" },
  "Bleary FC||Craigavon PC": { time: "11:24", pitch: "orange" },
  "Benburb Ballers||Newmills": { time: "11:24", pitch: "blue" },
  "CFPC Originals||Killicomaine Baptist church": { time: "11:24", pitch: "yellow" },
  "CGR FC||Gortmerron Goats": { time: "11:24", pitch: "red" },
  "Ancora Church Football||Emmanuel Baptist": { time: "11:38", pitch: "orange" },
  "Downshire Church||Legacurry Presbyterian": { time: "11:38", pitch: "blue" },
  "Ardtrea Aardvarks||Derry/Edenderry": { time: "11:38", pitch: "yellow" },
  "Team Black||The Blues": { time: "11:38", pitch: "red" },
  "Covenant||Waringstown Presbyterian Church": { time: "11:52", pitch: "orange" },
  "Mourne||Spain Madrid": { time: "11:52", pitch: "blue" },
  "Bethany FC||Sloan Street Presbyterian": { time: "11:52", pitch: "yellow" },
  "Ballymagerney FPC||YAKAAR ACADEMY": { time: "11:52", pitch: "red" },
  "Grace Community Church Richhill||Portadown Elim": { time: "12:06", pitch: "orange" },
  "NTPC||Portabello Baptist": { time: "12:06", pitch: "blue" },
  "Eagles||Ulster wonders fc": { time: "12:06", pitch: "yellow" },
  "Acpc fc||Lurgan Elim": { time: "12:06", pitch: "red" },
  "Benburb Ballers||Craigavon PC": { time: "12:20", pitch: "orange" },
  "Bleary FC||Newmills": { time: "12:20", pitch: "blue" },
  "Gortmerron Goats||Killicomaine Baptist church": { time: "12:20", pitch: "yellow" },
  "CFPC Originals||CGR FC": { time: "12:20", pitch: "red" },
  "Ancora Church Football||Downshire Church": { time: "12:34", pitch: "orange" },
  "Emmanuel Baptist||Legacurry Presbyterian": { time: "12:34", pitch: "blue" },
  "Derry/Edenderry||Team Black": { time: "12:34", pitch: "yellow" },
  "Ardtrea Aardvarks||The Blues": { time: "12:34", pitch: "red" },
};

// KO schedule
const KO_MATCHES: { matchId: string; comp: string; round: string; num: number; kickoff: string; pitch: string }[] = [
  { matchId: "c-r16-1", comp: "championship", round: "r16", num: 1, kickoff: "13:40", pitch: "orange" },
  { matchId: "c-r16-2", comp: "championship", round: "r16", num: 2, kickoff: "13:40", pitch: "blue" },
  { matchId: "c-r16-3", comp: "championship", round: "r16", num: 3, kickoff: "13:40", pitch: "yellow" },
  { matchId: "c-r16-4", comp: "championship", round: "r16", num: 4, kickoff: "13:40", pitch: "red" },
  { matchId: "c-r16-5", comp: "championship", round: "r16", num: 5, kickoff: "13:52", pitch: "orange" },
  { matchId: "c-r16-6", comp: "championship", round: "r16", num: 6, kickoff: "13:52", pitch: "blue" },
  { matchId: "c-r16-7", comp: "championship", round: "r16", num: 7, kickoff: "13:52", pitch: "yellow" },
  { matchId: "c-r16-8", comp: "championship", round: "r16", num: 8, kickoff: "13:52", pitch: "red" },
  { matchId: "c-qf-1", comp: "championship", round: "qf", num: 1, kickoff: "14:20", pitch: "orange" },
  { matchId: "c-qf-2", comp: "championship", round: "qf", num: 2, kickoff: "14:20", pitch: "blue" },
  { matchId: "c-qf-3", comp: "championship", round: "qf", num: 3, kickoff: "14:20", pitch: "yellow" },
  { matchId: "c-qf-4", comp: "championship", round: "qf", num: 4, kickoff: "14:20", pitch: "red" },
  { matchId: "c-sf-1", comp: "championship", round: "sf", num: 1, kickoff: "14:44", pitch: "orange" },
  { matchId: "c-sf-2", comp: "championship", round: "sf", num: 2, kickoff: "14:44", pitch: "blue" },
  { matchId: "c-final", comp: "championship", round: "final", num: 1, kickoff: "15:28", pitch: "orange" },
  { matchId: "s-r1-1", comp: "shield", round: "r1", num: 1, kickoff: "14:04", pitch: "orange" },
  { matchId: "s-r1-2", comp: "shield", round: "r1", num: 2, kickoff: "14:04", pitch: "blue" },
  { matchId: "s-r1-3", comp: "shield", round: "r1", num: 3, kickoff: "14:04", pitch: "yellow" },
  { matchId: "s-r1-4", comp: "shield", round: "r1", num: 4, kickoff: "14:04", pitch: "red" },
  { matchId: "s-r1-5", comp: "shield", round: "r1", num: 5, kickoff: "14:16", pitch: "orange" },
  { matchId: "s-r1-6", comp: "shield", round: "r1", num: 6, kickoff: "14:16", pitch: "blue" },
  { matchId: "s-r1-7", comp: "shield", round: "r1", num: 7, kickoff: "14:16", pitch: "yellow" },
  { matchId: "s-r1-8", comp: "shield", round: "r1", num: 8, kickoff: "14:16", pitch: "red" },
  { matchId: "s-qf-1", comp: "shield", round: "qf", num: 1, kickoff: "14:32", pitch: "orange" },
  { matchId: "s-qf-2", comp: "shield", round: "qf", num: 2, kickoff: "14:32", pitch: "blue" },
  { matchId: "s-qf-3", comp: "shield", round: "qf", num: 3, kickoff: "14:32", pitch: "yellow" },
  { matchId: "s-qf-4", comp: "shield", round: "qf", num: 4, kickoff: "14:32", pitch: "red" },
  { matchId: "s-sf-1", comp: "shield", round: "sf", num: 1, kickoff: "14:56", pitch: "orange" },
  { matchId: "s-sf-2", comp: "shield", round: "sf", num: 2, kickoff: "14:56", pitch: "blue" },
  { matchId: "s-final", comp: "shield", round: "final", num: 1, kickoff: "15:28", pitch: "yellow" },
  { matchId: "p-r1-1", comp: "plate", round: "r1", num: 1, kickoff: "14:28", pitch: "orange" },
  { matchId: "p-r1-2", comp: "plate", round: "r1", num: 2, kickoff: "14:28", pitch: "blue" },
  { matchId: "p-r1-3", comp: "plate", round: "r1", num: 3, kickoff: "14:28", pitch: "yellow" },
  { matchId: "p-r1-4", comp: "plate", round: "r1", num: 4, kickoff: "14:28", pitch: "red" },
  { matchId: "p-sf-1", comp: "plate", round: "sf", num: 1, kickoff: "15:04", pitch: "yellow" },
  { matchId: "p-sf-2", comp: "plate", round: "sf", num: 2, kickoff: "15:04", pitch: "red" },
  { matchId: "p-final", comp: "plate", round: "final", num: 1, kickoff: "15:28", pitch: "blue" },
];

async function seed() {
  console.log("Seeding teams...");
  let pinIdx = 0;
  const teamIds: Record<string, number> = {};

  for (const [group, teams] of Object.entries(GROUPS)) {
    for (const name of teams) {
      const [row] = await db.insert(schema.teams).values({
        name,
        groupLetter: group,
        pin: DEFAULT_PINS[pinIdx++],
      }).returning();
      teamIds[name] = row.id;
      console.log(`  ${group}: ${name} (PIN: ${DEFAULT_PINS[pinIdx - 1]}, id: ${row.id})`);
    }
  }

  console.log("\nSeeding group matches...");
  for (const [key, sched] of Object.entries(GROUP_SCHEDULE)) {
    const [t1, t2] = key.split("||");
    const group = Object.entries(GROUPS).find(([, teams]) => teams.includes(t1))?.[0] || "";
    await db.insert(schema.groupMatches).values({
      team1Id: teamIds[t1],
      team2Id: teamIds[t2],
      groupLetter: group,
      kickoff: sched.time,
      pitch: sched.pitch,
    });
    console.log(`  ${t1} vs ${t2} @ ${sched.time} (${sched.pitch})`);
  }

  console.log("\nSeeding KO bracket (empty)...");
  for (const m of KO_MATCHES) {
    await db.insert(schema.koMatches).values({
      matchId: m.matchId,
      competition: m.comp,
      round: m.round,
      matchNum: m.num,
      kickoff: m.kickoff,
      pitch: m.pitch,
    });
    console.log(`  ${m.matchId} @ ${m.kickoff} (${m.pitch})`);
  }

  console.log("\nDone! Seeded 32 teams, 48 group matches, and 37 KO fixtures.");
}

seed().catch(console.error);
