/**
 * Build-time (file-based) content collections.
 *
 * EmDash content lives in `live.config.ts`. This file is for data that is
 * version-controlled in the repo rather than edited in the admin UI.
 */

import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";
import { FEATURES, PLATFORMS, TECH, type Tech } from "./utils/ades";
import { HARNESSES } from "./utils/harness-bench";

// YAML turns unquoted `2026-07` into a string, but `2026-07-01` into a Date,
// so accept both and normalise.
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, "expected YYYY-MM");
const isoDate = z
	.union([z.string(), z.date()])
	.transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));

export const adeSchema = z.object({
	name: z.string(),
	category: z.enum(["ui", "terminal"]),
	website: z.url(),
	repo: z
		.string()
		.regex(/^[\w.-]+\/[\w.-]+$/, "expected owner/name")
		.optional(),
	links: z
		.object({
			x: z.url().optional(),
			docs: z.url().optional(),
		})
		.default({}),
	platforms: z.array(z.enum(PLATFORMS)).default([]),
	price: z.enum(["free", "freemium", "paid", "waitlist"]).optional(),
	open_source: z.boolean(),
	license: z.string().optional(),
	tech: z.array(z.enum(Object.keys(TECH) as [Tech, ...Tech[]])).default([]),
	agents: z.array(z.string()).default([]),
	agents_more: z.number().int().nonnegative().default(0),
	// Source pages backing the data above, so it can be re-checked.
	references: z
		.object({
			agents: z.url().optional(),
		})
		.default({}),
	features: z.array(z.enum(FEATURES)).default([]),
	first_seen: yearMonth.optional(),
	note: z.string().optional(),
	// Written by scripts/update-ades.mjs -- don't edit by hand.
	stars: z.number().int().nonnegative().optional(),
	stars_updated_at: isoDate.optional(),
	latest_release: z
		.object({
			// Coerced: YAML would read a bare `1.10` as a number.
			version: z.coerce.string(),
			date: isoDate,
		})
		.optional(),
});

export type Ade = z.output<typeof adeSchema>;

const agenticDevEnvs = defineCollection({
	loader: file("src/data/agentic-dev-envs.yml"),
	schema: adeSchema,
});

// Harness Bench: Terminal-Bench 4 results per task (src/data/harness-bench.yml).
const clock = z.string().regex(/^\d+:\d{2}$/, "expected m:ss");

export const benchResultSchema = z.object({
	harness: z.enum(HARNESSES),
	// Coerced: YAML would read a bare `1.10` as a number.
	version: z.coerce.string(),
	score: z.number().min(0).max(100),
	score_sd: z.number().nonnegative().optional(),
	best_attempt: z.number().int().positive().optional(),
	attempts: z.number().int().positive(),
	passes: z.number().int().nonnegative(),
	agent_time: clock,
	total_time: clock,
	cached_tokens: z.number().int().nonnegative(),
	total_tokens: z.number().int().nonnegative(),
	price: z.number().nonnegative(),
	lower_bound: z.boolean().default(false),
	escaped: z.boolean().default(false),
});

export const benchTaskSchema = z.object({
	description: z.string(),
	method: z.enum(["best-of-3", "mean-of-3"]),
	cohort: z.string(),
	date: isoDate,
	report: z.url(),
	results: z.array(benchResultSchema).min(1),
});

export type BenchResult = z.output<typeof benchResultSchema>;
export type BenchTask = z.output<typeof benchTaskSchema>;

const harnessBench = defineCollection({
	loader: file("src/data/harness-bench.yml"),
	schema: benchTaskSchema,
});

export const collections = { agenticDevEnvs, harnessBench };
