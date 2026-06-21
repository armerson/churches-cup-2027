import {
  pgTable, serial, text, integer, char, timestamp, time, check, unique, index, boolean, jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tournament = pgTable("tournament", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Churches Cup 2027"),
  year: integer("year").notNull().default(2027),
  teamsPerGroup: integer("teams_per_group").notNull().default(4),
  gameDurationMins: integer("game_duration_mins").notNull().default(12),
  maxSquadSize: integer("max_squad_size").notNull().default(20),
  pitches: jsonb("pitches").notNull().default(sql`'["orange","blue","yellow","red"]'::jsonb`),
  pitchColors: jsonb("pitch_colors").notNull().default(sql`'{"orange":"bg-orange-500 text-white","blue":"bg-[#274296] text-white","yellow":"bg-yellow-400 text-gray-900","red":"bg-red-600 text-white"}'::jsonb`),
  groupStageGapMins: integer("group_stage_gap_mins").notNull().default(14),
  groupStageStartTime: text("group_stage_start_time").notNull().default("10:00"),
  koCompetitions: jsonb("ko_competitions").notNull().default(sql`'[{"key":"championship","label":"Championship","qualifyPositions":[1,2],"format":"r16"},{"key":"shield","label":"Shield","qualifyPositions":[3],"format":"r1-8"},{"key":"plate","label":"Plate","qualifyPositions":[4],"format":"r1-4"}]'::jsonb`),
  setupComplete: boolean("setup_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  groupLetter: char("group_letter", { length: 1 }).notNull(),
  pin: char("pin", { length: 4 }).notNull().default("0000"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const rosters = pgTable("rosters", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  playerName: text("player_name").notNull(),
  shirtNumber: integer("shirt_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique().on(t.teamId, t.playerName),
  index("idx_rosters_team").on(t.teamId),
]);

export const groupMatches = pgTable("group_matches", {
  id: serial("id").primaryKey(),
  team1Id: integer("team1_id").references(() => teams.id).notNull(),
  team2Id: integer("team2_id").references(() => teams.id).notNull(),
  groupLetter: char("group_letter", { length: 1 }).notNull(),
  kickoff: time("kickoff"),
  pitch: text("pitch"),
  score1: integer("score1"),
  score2: integer("score2"),
  status: text("status").default("upcoming").notNull(),
  submittedBy: integer("submitted_by").references(() => teams.id),
  confirmedBy: integer("confirmed_by").references(() => teams.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_group_matches_teams").on(t.team1Id, t.team2Id),
  index("idx_group_matches_group").on(t.groupLetter),
]);

export const koMatches = pgTable("ko_matches", {
  id: serial("id").primaryKey(),
  matchId: text("match_id").unique().notNull(),
  competition: text("competition").notNull(),
  round: text("round").notNull(),
  matchNum: integer("match_num").notNull(),
  team1Id: integer("team1_id").references(() => teams.id),
  team2Id: integer("team2_id").references(() => teams.id),
  score1: integer("score1"),
  score2: integer("score2"),
  penScore1: integer("pen_score1"),
  penScore2: integer("pen_score2"),
  winnerId: integer("winner_id").references(() => teams.id),
  status: text("status").default("upcoming").notNull(),
  submittedBy: integer("submitted_by").references(() => teams.id),
  confirmedBy: integer("confirmed_by").references(() => teams.id),
  pitch: text("pitch"),
  kickoff: time("kickoff"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_ko_matches_teams").on(t.team1Id, t.team2Id),
]);

export const scorers = pgTable("scorers", {
  id: serial("id").primaryKey(),
  groupMatchId: integer("group_match_id").references(() => groupMatches.id, { onDelete: "cascade" }),
  koMatchId: integer("ko_match_id").references(() => koMatches.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  playerName: text("player_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_scorers_group").on(t.groupMatchId),
  index("idx_scorers_ko").on(t.koMatchId),
]);

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
