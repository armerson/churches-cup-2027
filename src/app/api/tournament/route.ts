import { NextRequest, NextResponse } from "next/server";
import { db as getDb } from "@/lib/db";
import { tournament, teams, groupMatches, koMatches, scorers, rosters } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { hashPin } from "@/lib/hash";

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

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function roundRobinPairings(n: number): [number, number][][] {
  const rounds: [number, number][][] = [];
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push([indices[i], indices[n - 1 - i]]);
    }
    rounds.push(pairs);
    const last = indices.pop()!;
    indices.splice(1, 0, last);
  }
  return rounds;
}

function generateKoBracket(
  koComps: { key: string; label: string; qualifyPositions: number[]; format: string }[],
  pitches: string[],
  gapMins: number,
  groupStageEndTime: string,
  numGroups: number,
) {
  const koFixtures: { matchId: string; comp: string; round: string; num: number; kickoff: string; pitch: string }[] = [];
  let currentTime = addMinutes(groupStageEndTime, gapMins * 2);

  for (const comp of koComps) {
    const totalTeams = comp.qualifyPositions.length * numGroups;
    const rounds: { name: string; count: number }[] = [];
    let remaining = totalTeams;

    if (remaining >= 16) rounds.push({ name: "r16", count: 8 });
    else if (remaining > 4) rounds.push({ name: "r1", count: Math.floor(remaining / 2) });

    remaining = rounds.length > 0 ? rounds[0].count : remaining;
    if (remaining >= 8) { rounds.push({ name: "qf", count: 4 }); remaining = 4; }
    if (remaining >= 4) { rounds.push({ name: "sf", count: 2 }); remaining = 2; }
    if (remaining >= 2) rounds.push({ name: "final", count: 1 });

    const prefix = comp.key.charAt(0);
    for (const round of rounds) {
      const slotsNeeded = round.count;
      const timeSlots = Math.ceil(slotsNeeded / pitches.length);
      let slotTime = currentTime;
      let matchNum = 1;
      for (let slot = 0; slot < timeSlots; slot++) {
        const matchesThisSlot = Math.min(pitches.length, slotsNeeded - slot * pitches.length);
        for (let p = 0; p < matchesThisSlot; p++) {
          koFixtures.push({
            matchId: `${prefix}-${round.name}${round.count > 1 ? `-${matchNum}` : ""}`,
            comp: comp.key,
            round: round.name,
            num: matchNum++,
            kickoff: slotTime,
            pitch: pitches[p],
          });
        }
        slotTime = addMinutes(slotTime, gapMins);
      }
      currentTime = addMinutes(currentTime, timeSlots * gapMins + gapMins);
    }
  }
  return koFixtures;
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
    if (body.adminPin !== undefined) updates.adminPin = await hashPin(body.adminPin);
    if (body.thirdPlacePlayoff !== undefined) updates.thirdPlacePlayoff = body.thirdPlacePlayoff;

    let [config] = await getDb().select().from(tournament);
    if (!config) {
      [config] = await getDb().insert(tournament).values(updates).returning();
    } else {
      [config] = await getDb().update(tournament).set(updates).where(eq(tournament.id, config.id)).returning();
    }
    return NextResponse.json({ success: true, config });
  }

  if (action === "setup") {
    const { groups: groupsInput, name, year, pitches: pitchesInput, gameDurationMins, maxSquadSize, groupStageGapMins, groupStageStartTime, koCompetitions, adminPin, thirdPlacePlayoff } = body;

    if (!groupsInput || typeof groupsInput !== "object" || Object.keys(groupsInput).length === 0) {
      return NextResponse.json({ error: "Groups with teams are required" }, { status: 400 });
    }

    const db = getDb();
    const pitchesList: string[] = pitchesInput || ["orange", "blue", "yellow", "red"];
    const gap = groupStageGapMins || 14;
    const startTime = groupStageStartTime || "10:00";
    const teamsPerGroup = Object.values(groupsInput as Record<string, string[]>)[0]?.length || 4;
    const numGroups = Object.keys(groupsInput).length;

    // Clear existing data
    await db.delete(scorers);
    await db.delete(rosters);
    await db.delete(groupMatches);
    await db.delete(koMatches);
    await db.delete(teams);

    // Create teams with hashed PINs
    const teamIds: Record<string, number> = {};
    let pinIdx = 0;
    for (const [group, teamNames] of Object.entries(groupsInput as Record<string, string[]>)) {
      for (const teamName of teamNames) {
        pinIdx++;
        const plainPin = String(pinIdx).padStart(4, "0");
        const hashedPin = await hashPin(plainPin);
        const [row] = await db.insert(teams).values({ name: teamName, groupLetter: group, pin: hashedPin }).returning();
        teamIds[teamName] = row.id;
      }
    }

    // Generate round-robin schedule
    const groupEntries = Object.entries(groupsInput as Record<string, string[]>);
    const pairingsPerGroup = roundRobinPairings(teamsPerGroup);
    const numRounds = teamsPerGroup - 1;

    // Schedule: play groups in parallel across pitches
    // Each timeslot can fit up to pitches.length matches
    // We interleave groups to maximise rest
    const allFixtures: { t1: string; t2: string; group: string; round: number }[] = [];
    for (let r = 0; r < numRounds; r++) {
      for (const [group, teamNames] of groupEntries) {
        const pairs = pairingsPerGroup[r];
        for (const [i, j] of pairs) {
          allFixtures.push({ t1: teamNames[i], t2: teamNames[j], group, round: r });
        }
      }
    }

    // Assign times: fill pitches per timeslot
    let currentKickoff = startTime;
    let pitchIdx = 0;
    for (const fix of allFixtures) {
      await db.insert(groupMatches).values({
        team1Id: teamIds[fix.t1],
        team2Id: teamIds[fix.t2],
        groupLetter: fix.group,
        kickoff: currentKickoff,
        pitch: pitchesList[pitchIdx],
      });
      pitchIdx++;
      if (pitchIdx >= pitchesList.length) {
        pitchIdx = 0;
        currentKickoff = addMinutes(currentKickoff, gap);
      }
    }
    // If we used some pitches in the last slot, advance time
    const groupStageEndTime = pitchIdx > 0 ? addMinutes(currentKickoff, gap) : currentKickoff;

    // Generate KO bracket
    const koComps = koCompetitions || [
      { key: "championship", label: "Championship", qualifyPositions: [1, 2], format: "r16" },
      { key: "shield", label: "Shield", qualifyPositions: [3], format: "r1-8" },
      { key: "plate", label: "Plate", qualifyPositions: [4], format: "r1-4" },
    ];
    const koFixtures = generateKoBracket(koComps, pitchesList, gap, groupStageEndTime, numGroups);

    if (thirdPlacePlayoff) {
      for (const comp of koComps) {
        const compFixtures = koFixtures.filter((f) => f.comp === comp.key);
        const finalMatch = compFixtures.find((f) => f.round === "final");
        if (finalMatch) {
          const prefix = comp.key.charAt(0);
          koFixtures.push({
            matchId: `${prefix}-3rd`,
            comp: comp.key,
            round: "3rd",
            num: 1,
            kickoff: finalMatch.kickoff,
            pitch: pitchesList[pitchesList.indexOf(finalMatch.pitch) + 1] || pitchesList[0],
          });
        }
      }
    }

    for (const m of koFixtures) {
      await db.insert(koMatches).values({
        matchId: m.matchId,
        competition: m.comp,
        round: m.round,
        matchNum: m.num,
        kickoff: m.kickoff,
        pitch: m.pitch,
      });
    }

    // Update tournament config
    let [config] = await db.select().from(tournament);
    const configData = {
      name: name || "Tournament",
      year: year || new Date().getFullYear(),
      teamsPerGroup,
      gameDurationMins: gameDurationMins || 12,
      maxSquadSize: maxSquadSize || 20,
      pitches: pitchesList,
      groupStageGapMins: gap,
      groupStageStartTime: startTime,
      koCompetitions: koComps,
      adminPin: adminPin ? await hashPin(adminPin) : await hashPin("1234"),
      thirdPlacePlayoff: thirdPlacePlayoff || false,
      setupComplete: true,
      updatedAt: new Date(),
    };
    if (!config) {
      await db.insert(tournament).values(configData);
    } else {
      await db.update(tournament).set(configData).where(eq(tournament.id, config.id));
    }

    return NextResponse.json({
      success: true,
      teams: Object.keys(teamIds).length,
      groupMatches: allFixtures.length,
      koMatches: koFixtures.length,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
